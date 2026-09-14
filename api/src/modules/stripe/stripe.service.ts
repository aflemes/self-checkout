import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: Stripe | null;
  private readonly webhookSecret: string | null;

  constructor(config: ConfigService) {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    this.client =
      key && key.startsWith('sk_test_') && key !== 'sk_test_...'
        ? new Stripe(key)
        : null;
    const secret = config.get<string>('STRIPE_WEBHOOK_SECRET');
    this.webhookSecret = secret && secret.startsWith('whsec_') ? secret : null;
    if (!this.client || !this.webhookSecret) {
      this.logger.warn(
        'STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET not configured; payments disabled, orders will stay PENDING',
      );
    }
  }

  async createPaymentIntent(params: {
    amountCents: number;
    orderId: string;
    idempotencyKey: string;
  }): Promise<{ id: string; clientSecret: string } | null> {
    if (!this.client) {
      return null;
    }
    const intent = await this.client.paymentIntents.create(
      {
        amount: params.amountCents,
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: { orderId: params.orderId },
      },
      { idempotencyKey: params.idempotencyKey },
    );
    if (!intent.client_secret) {
      this.logger.error(`PaymentIntent missing client_secret intentId=${intent.id}`);
      return null;
    }
    return { id: intent.id, clientSecret: intent.client_secret };
  }

  async getClientSecret(intentId: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    const intent = await this.client.paymentIntents.retrieve(intentId);
    return intent.client_secret ?? null;
  }

  constructEvent(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.client || !this.webhookSecret) {
      throw new Error('Stripe not configured');
    }
    return this.client.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }
}