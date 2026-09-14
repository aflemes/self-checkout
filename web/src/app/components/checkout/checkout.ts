import { Component, ElementRef, ViewChild, inject, output, signal } from '@angular/core';
import {
  loadStripe,
  type Stripe,
  type StripeElements,
  type StripePaymentElement,
} from '@stripe/stripe-js';
import { CartService } from '../../core/cart.service';
import { ConfigService } from '../../core/config.service';
import { OrdersService } from '../../core/orders.service';
import { friendlyHttpError, formatUSD } from '../../core/format';
import { OrderResult } from '../../models/order';

@Component({
  selector: 'app-checkout',
  standalone: true,
  styleUrl: './checkout.css',
  templateUrl: './checkout.html',
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  private readonly orders = inject(OrdersService);
  private readonly config = inject(ConfigService);

  readonly confirmed = output<OrderResult>();
  readonly cancelled = output<void>();

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly step = signal<'summary' | 'pay'>('summary');
  readonly paying = signal(false);
  readonly payError = signal<string | null>(null);
  readonly confirmCancel = signal(false);

  @ViewChild('stripeMount', { static: false })
  private stripeMount?: ElementRef<HTMLElement>;

  private attemptKey = this.newKey();

  private orderRef: OrderResult | null = null;
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;

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
        payment: { method: 'CARD' },
      });
      this.orderRef = result;
      if (result.status === 'PAID') {
        this.confirmed.emit(result);
        return;
      }
      if (!result.clientSecret) {
        this.error.set(
          'Payment is not available right now. Please ask an attendant for help.',
        );
        this.submitting.set(false);
        return;
      }
      await this.enterPayment(result);
    } catch (err) {
      this.error.set(
        friendlyHttpError(
          err,
          'Unable to confirm your order. Check your connection and try again.',
        ),
      );
      this.submitting.set(false);
    }
  }

  async pay(): Promise<void> {
    if (this.paying() || !this.stripe || !this.elements) {
      return;
    }
    this.paying.set(true);
    this.payError.set(null);
    try {
      const { error } = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: { return_url: `${window.location.origin}/` },
        redirect: 'if_required',
      });
      if (error) {
        this.payError.set(error.message ?? 'Payment failed. Please try again.');
        this.paying.set(false);
        return;
      }
      await this.waitForPaid();
    } catch {
      this.payError.set('Payment failed. Please try again.');
      this.paying.set(false);
    }
  }

  cancel(): void {
    if (this.submitting() || this.paying()) {
      return;
    }
    if (this.step() === 'pay') {
      this.step.set('summary');
      this.payError.set(null);
      this.unmountPayment();
      return;
    }
    this.cancelled.emit();
  }

  requestCancel(): void {
    if (this.submitting() || this.paying()) {
      return;
    }
    this.confirmCancel.set(true);
  }

  dismissCancel(): void {
    this.confirmCancel.set(false);
  }

  confirmCancelOrder(): void {
    this.confirmCancel.set(false);
    this.cart.clear();
    this.cancelled.emit();
  }

  unitCents(product?: { price: number }): number {
    return product ? Math.round(product.price * 100) : 0;
  }

  private async enterPayment(result: OrderResult): Promise<void> {
    if (!this.stripe) {
      const pk = this.config.get().stripePublishableKey;
      if (!pk) {
        this.error.set('Payment is not configured. Please ask an attendant for help.');
        this.submitting.set(false);
        return;
      }
      this.stripe = await loadStripe(pk, {
        developerTools: { assistant: { enabled: false } },
      });
    }
    if (!this.stripe) {
      this.error.set('Unable to start secure payment. Please try again.');
      this.submitting.set(false);
      return;
    }
    this.payError.set(null);
    this.step.set('pay');
    this.submitting.set(false);
    setTimeout(() => this.mountPayment(), 0);
  }

  private mountPayment(): void {
    if (!this.stripe || !this.stripeMount || !this.orderRef?.clientSecret) {
      return;
    }
    const host = this.stripeMount.nativeElement;
    if (!host) {
      return;
    }
    this.unmountPayment();
    this.elements = this.stripe.elements({
      clientSecret: this.orderRef.clientSecret,
      locale: 'en',
    });
    this.paymentElement = this.elements.create('payment');
    this.paymentElement.mount(host);
  }

  private unmountPayment(): void {
    this.paymentElement?.unmount();
    this.paymentElement = null;
    this.elements = null;
  }

  private async waitForPaid(): Promise<void> {
    const deadline = Date.now() + 60000;
    const tick = async (): Promise<void> => {
      if (!this.orderRef) {
        this.paying.set(false);
        return;
      }
      const status = await this.orders.getStatus(this.orderRef.orderId);
      if (status.status === 'PAID') {
        this.paying.set(false);
        this.confirmed.emit({ ...this.orderRef, status: 'PAID' });
        return;
      }
      if (status.status === 'FAILED' || status.status === 'CANCELLED' || status.status === 'EXPIRED') {
        this.paying.set(false);
        this.payError.set('Payment was not completed. Please try again.');
        return;
      }
      if (Date.now() > deadline) {
        this.paying.set(false);
        this.payError.set(
          'Payment confirmation took too long. Please ask an attendant for help.',
        );
        return;
      }
      setTimeout(() => void tick(), 1500);
    };
    await tick();
  }

  private newKey(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj) {
      return cryptoObj.randomUUID();
    }
    return `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  formatUSD = formatUSD;
}