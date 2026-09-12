import { BadRequestException, Headers, Post, Req } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from '../stripe/stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripe: StripeService,
    private readonly webhook: StripeWebhookService,
  ) {}

  @Post()
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Missing payload or signature.');
    }
    let event;
    try {
      event = this.stripe.constructEvent(req.rawBody, signature);
    } catch (err) {
      throw new BadRequestException('Invalid webhook signature.');
    }
    await this.webhook.handle(event);
    return { received: true };
  }
}