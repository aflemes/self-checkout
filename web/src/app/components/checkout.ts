import { Component, inject, output, signal } from '@angular/core';
import { CartService } from '../core/cart.service';
import { OrdersService } from '../core/orders.service';
import { friendlyHttpError, formatBRL } from '../core/format';
import { OrderResult, PaymentMethod } from '../models/order';

@Component({
  selector: 'app-checkout',
  standalone: true,
  styleUrl: './checkout.css',
  templateUrl: './checkout.html',
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  private readonly orders = inject(OrdersService);

  readonly confirmed = output<OrderResult>();
  readonly cancelled = output<void>();

  readonly method = signal<PaymentMethod>('CARD');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  private attemptKey = this.newKey();

  readonly payableLines = () => this.cart.lines().filter((line) => line.status === 'ok');

  async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      const result = await this.orders.create({
        idempotencyKey: this.attemptKey,
        items: this.cart.submitLines(),
        payment: { method: this.method() },
      });
      this.confirmed.emit(result);
    } catch (err) {
      this.error.set(
        friendlyHttpError(
          err,
          'Unable to confirm your order. Check your connection and try again. If the order was already confirmed, you will see the confirmation on the next attempt.',
        ),
      );
      this.submitting.set(false);
    }
  }

  cancel(): void {
    if (!this.submitting()) {
      this.cancelled.emit();
    }
  }

  unitCents(product?: { price: number }): number {
    return product ? Math.round(product.price * 100) : 0;
  }

  private newKey(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj) {
      return cryptoObj.randomUUID();
    }
    return `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  formatBRL = formatBRL;
}