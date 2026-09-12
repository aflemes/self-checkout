import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(private readonly orders: OrdersService) {}

  async handle(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(
          `Webhook payment_intent.succeeded intentId=${intent.id} amount=${intent.amount}`,
        );
        await this.orders.markPaid(intent.id, intent.amount);
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        this.logger.warn(`Webhook payment_intent.payment_failed intentId=${intent.id}`);
        await this.orders.markFailed(intent.id);
        break;
      }
      case 'payment_intent.canceled': {
        const intent = event.data.object as Stripe.PaymentIntent;
        this.logger.warn(`Webhook payment_intent.canceled intentId=${intent.id}`);
        await this.orders.markCancelled(intent.id);
        break;
      }
      default:
        this.logger.log(`Webhook no-op type=${event.type} id=${event.id}`);
    }
  }
}