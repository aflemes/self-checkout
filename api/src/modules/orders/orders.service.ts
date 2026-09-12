import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Product } from '../../entities/product.entity';
import { StripeService } from '../stripe/stripe.service';
import { CreateOrderDto } from './dto/create-order.dto';

interface OrderResult {
  orderId: string;
  status: string;
  paymentMethod: string;
  total: number;
  createdAt: Date;
  items: {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  replayed: boolean;
  clientSecret: string | null;
}

interface CreatedOrder {
  order: Order;
  items: OrderItem[];
}

type CreateOutcome =
  | { kind: 'created'; created: CreatedOrder }
  | { kind: 'replayed'; result: OrderResult };

const badRequestMessage = (productId: string, name?: string) =>
  `Sorry, "${name ?? productId}" is temporarily unavailable.`;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly stripe: StripeService,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderResult> {
    let outcome: CreateOutcome;
    try {
      outcome = await this.dataSource.transaction((manager) =>
        this.createWithinTransaction(manager, dto),
      );
    } catch (err) {
      if (this.isDuplicateEntryError(err)) {
        const existing = await this.findExisting(dto.idempotencyKey);
        if (existing) {
          return existing;
        }
      }
      throw err;
    }

    if (outcome.kind === 'replayed') {
      return outcome.result;
    }

    const clientSecret = await this.attachPaymentIntent(outcome.created, dto.idempotencyKey);
    return this.toResult(outcome.created.order, false, outcome.created.items, clientSecret);
  }

  async getStatus(orderId: string): Promise<{ orderId: string; status: string }> {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id: orderId },
    });
    if (!order) {
      this.logger.warn(`Order status check orderId not found=${orderId}`);
      throw new NotFoundException('Order not found.');
    }
    return { orderId: String(order.id), status: order.status };
  }

  async markPaid(intentId: string, amountCents: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { stripeIntentId: intentId },
      });
      if (!order) {
        this.logger.warn(`Webhook markPaid sem pedido vinculado intentId=${intentId}`);
        return;
      }
      if (Math.round(Number(order.total) * 100) !== amountCents) {
        this.logger.error(
          `Webhook markPaid valor divergente orderId=${order.id} esperado=${order.total} recebido=${amountCents}`,
        );
        return;
      }
      if (order.status !== 'PENDING') {
        this.logger.warn(
          `Webhook markPaid pedido nao PENDING orderId=${order.id} status=${order.status}`,
        );
        return;
      }
      order.status = 'PAID';
      await manager.save(order);
      this.logger.log(`Order paid via webhook orderId=${order.id} intentId=${intentId}`);
    });
  }

  async markFailed(intentId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { stripeIntentId: intentId },
      });
      if (!order || order.status !== 'PENDING') {
        return;
      }
      order.status = 'FAILED';
      await manager.save(order);
      this.logger.warn(`Order failed via webhook orderId=${order.id} intentId=${intentId}`);
    });
  }

  async markCancelled(intentId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { stripeIntentId: intentId },
      });
      if (!order || order.status !== 'PENDING') {
        return;
      }
      order.status = 'CANCELLED';
      await manager.save(order);
      this.logger.warn(`Order cancelled via webhook orderId=${order.id} intentId=${intentId}`);
    });
  }

  private async attachPaymentIntent(
    created: CreatedOrder,
    idempotencyKey: string,
  ): Promise<string | null> {
    if (created.order.stripeIntentId) {
      return this.stripe.getClientSecret(created.order.stripeIntentId);
    }
    const amountCents = Math.round(Number(created.order.total) * 100);
    const intent = await this.stripe.createPaymentIntent({
      amountCents,
      orderId: String(created.order.id),
      idempotencyKey,
    });
    if (!intent) {
      return null;
    }
    await this.dataSource.getRepository(Order).update(
      { id: created.order.id },
      { stripeIntentId: intent.id },
    );
    created.order.stripeIntentId = intent.id;
    return intent.clientSecret;
  }

  private async createWithinTransaction(
    manager: EntityManager,
    dto: CreateOrderDto,
  ): Promise<CreateOutcome> {
    const existing = await manager.findOne(Order, {
      where: { idempotencyKey: dto.idempotencyKey },
      relations: { items: true },
    });
    if (existing) {
      this.logger.warn(
        `Order replay detected idempotencyKey=${dto.idempotencyKey} orderId=${existing.id}`,
      );
      const clientSecret = existing.stripeIntentId
        ? await this.stripe.getClientSecret(existing.stripeIntentId)
        : null;
      return { kind: 'replayed', result: this.toResult(existing, true, existing.items, clientSecret) };
    }

    const productIds = dto.items.map((item) => item.productId);
    const products = await manager.find(Product, {
      where: { id: In(productIds) },
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    const orderItems: OrderItem[] = [];
    let total = 0;

    for (const item of dto.items) {
      const product = byId.get(item.productId);
      if (!product) {
        throw new NotFoundException(
          `Product "${item.productId}" is no longer available.`,
        );
      }
      if (product.available === false || product.available === 0) {
        this.logger.warn(
          `Order validation failed idempotencyKey=${dto.idempotencyKey} productUnavailable=${product.id}`,
        );
        throw new ConflictException(badRequestMessage(product.id, product.name));
      }
      const unitCents = Math.round(Number(product.price) * 100);
      total += unitCents * item.quantity;
      const orderItem = new OrderItem();
      orderItem.productId = product.id;
      orderItem.productName = product.name;
      orderItem.unitPrice = product.price;
      orderItem.quantity = item.quantity;
      orderItems.push(orderItem);
    }

    const order = new Order();
    order.idempotencyKey = dto.idempotencyKey;
    order.status = 'PENDING';
    order.stripeIntentId = null;
    order.paymentMethod = dto.payment.method;
    order.total = (total / 100).toFixed(2);

    const saved = await manager.save(order);
    for (const orderItem of orderItems) {
      orderItem.orderId = saved.id;
    }
    await manager.save(OrderItem, orderItems);

    this.logger.log(
      `Order created pending orderId=${saved.id} idempotencyKey=${dto.idempotencyKey} total=${order.total}`,
    );
    return { kind: 'created', created: { order: saved, items: orderItems } };
  }

  private async findExisting(idempotencyKey: string): Promise<OrderResult | null> {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { idempotencyKey },
      relations: { items: true },
    });
    if (!order) {
      return null;
    }
    this.logger.warn(
      `Order replay after race detected idempotencyKey=${idempotencyKey} orderId=${order.id}`,
    );
    const clientSecret = order.stripeIntentId
      ? await this.stripe.getClientSecret(order.stripeIntentId)
      : null;
    return this.toResult(order, true, order.items, clientSecret);
  }

  private toResult(
    order: Order,
    replayed: boolean,
    items?: OrderItem[],
    clientSecret: string | null = null,
  ): OrderResult {
    const resolvedItems = items ?? order.items ?? [];
    return {
      orderId: String(order.id),
      status: order.status,
      paymentMethod: order.paymentMethod,
      total: Number(order.total),
      createdAt: order.createdAt,
      items: resolvedItems.map((item) => ({
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
      replayed,
      clientSecret,
    };
  }

  private isDuplicateEntryError(err: unknown): boolean {
    const candidate = err as { driverError?: { code?: string }; code?: string };
    return candidate?.driverError?.code === 'ER_DUP_ENTRY' || candidate?.code === 'ER_DUP_ENTRY';
  }
}