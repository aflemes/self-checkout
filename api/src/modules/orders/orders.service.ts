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
}

const badRequestMessage = (productId: string, name?: string) =>
  `Sorry, "${name ?? productId}" is temporarily unavailable.`;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async create(dto: CreateOrderDto): Promise<OrderResult> {
    try {
      return await this.dataSource.transaction((manager) =>
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
  }

  private async createWithinTransaction(
    manager: EntityManager,
    dto: CreateOrderDto,
  ): Promise<OrderResult> {
    const existing = await manager.findOne(Order, {
      where: { idempotencyKey: dto.idempotencyKey },
      relations: { items: true },
    });
    if (existing) {
      this.logger.warn(
        `Order replay detected idempotencyKey=${dto.idempotencyKey} orderId=${existing.id}`,
      );
      return this.toResult(existing, true);
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
    order.status = 'PAID';
    order.paymentMethod = dto.payment.method;
    order.total = (total / 100).toFixed(2);

    const saved = await manager.save(order);
    for (const orderItem of orderItems) {
      orderItem.orderId = saved.id;
    }
    await manager.save(OrderItem, orderItems);

    this.logger.log(
      `Order created orderId=${saved.id} idempotencyKey=${dto.idempotencyKey} total=${order.total}`,
    );
    return this.toResult(saved, false, orderItems);
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
    return this.toResult(order, true);
  }

  private toResult(
    order: Order,
    replayed: boolean,
    items?: OrderItem[],
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
    };
  }

  private isDuplicateEntryError(err: unknown): boolean {
    const candidate = err as { driverError?: { code?: string }; code?: string };
    return candidate?.driverError?.code === 'ER_DUP_ENTRY' || candidate?.code === 'ER_DUP_ENTRY';
  }
}