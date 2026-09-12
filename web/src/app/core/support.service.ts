import { Injectable, signal } from '@angular/core';

export interface SupportMessage {
  from: 'bot' | 'user';
  text: string;
}

export type SupportTopic = 'order' | 'payment' | 'other';

const replies: Record<SupportTopic, string> = {
  order: 'It looks like your order could not be confirmed. Tap "Try again"; if the order was already confirmed, the confirmation screen will appear.',
  payment: 'You can pay with card or Pix. Choose the option in the payment step and tap "Confirm". We never store card details.',
  other: "We're here to help! Ask the snack bar staff for assistance if you need more support.",
};

const intro = 'Hi! How can we help?';

@Injectable({ providedIn: 'root' })
export class SupportService {
  readonly open = signal(false);
  readonly messages = signal<SupportMessage[]>([{ from: 'bot', text: intro }]);
  readonly typing = signal(false);

  toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.openPanel();
    }
  }

  openPanel(): void {
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
  }

  send(topic: SupportTopic): void {
    const label =
      topic === 'order'
        ? "I can't submit my order"
        : topic === 'payment'
          ? 'I need help with payment'
          : 'Something else';
    this.messages.update((messages) => [...messages, { from: 'user', text: label }]);
    this.typing.set(true);
    setTimeout(() => {
      this.typing.set(false);
      this.messages.update((messages) => [...messages, { from: 'bot', text: replies[topic] }]);
    }, 700);
  }

  reset(): void {
    this.close();
    this.messages.set([{ from: 'bot', text: intro }]);
    this.typing.set(false);
  }
}