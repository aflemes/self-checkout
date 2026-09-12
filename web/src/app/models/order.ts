import { MenuProduct } from './menu';

export type PaymentMethod = 'CARD';

export interface CartItem {
  productId: string;
  quantity: number;
}

export type LineStatus = 'ok' | 'gone' | 'unavailable';

export interface CartLine {
  productId: string;
  quantity: number;
  status: LineStatus;
  product?: MenuProduct;
}

export interface CreateOrderPayload {
  idempotencyKey: string;
  items: CartItem[];
  payment: { method: PaymentMethod };
}

export interface OrderLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderResult {
  orderId: string;
  status: string;
  paymentMethod: PaymentMethod;
  total: number;
  createdAt: string;
  items: OrderLine[];
  replayed: boolean;
  clientSecret: string | null;
}