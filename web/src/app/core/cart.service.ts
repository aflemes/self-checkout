import { Injectable, computed, effect, signal } from '@angular/core';
import { CartItem, CartLine } from '../models/order';
import { Menu, MenuProduct } from '../models/menu';

const STORAGE_KEY = 'self-checkout.cart';

const cardCents = (product: MenuProduct) => Math.round(product.price * 100);

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>([]);
  private productsById = new Map<string, MenuProduct>();

  readonly lines = computed<CartLine[]>(() =>
    this.items().map((item) => {
      const product = this.productsById.get(item.productId);
      if (!product) {
        return { productId: item.productId, quantity: item.quantity, status: 'gone' };
      }
      return {
        productId: item.productId,
        quantity: item.quantity,
        status: product.available ? 'ok' : 'unavailable',
        product,
      };
    }),
  );

  readonly totalCents = computed(() =>
    this.lines()
      .filter((line) => line.status === 'ok')
      .reduce((sum, line) => sum + cardCents(line.product!) * line.quantity, 0),
  );

  readonly itemCount = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));

  readonly hasIssues = computed(() => this.lines().some((line) => line.status !== 'ok'));

  private readonly persist = effect(() => {
    const raw = JSON.stringify({ items: this.items() });
    localStorage.setItem(STORAGE_KEY, raw);
  });

  constructor() {
    this.restore();
  }

  reconcile(menu: Menu): void {
    this.productsById = new Map(menu.items.map((product) => [product.id, product]));
    const existingIds = new Set(menu.items.map((product) => product.id));
    this.items.update((items) => items.filter((item) => existingIds.has(item.productId)));
  }

  add(productId: string): void {
    this.items.update((items) => {
      const found = items.find((item) => item.productId === productId);
      if (found) {
        return items.map((item) =>
          item.productId === productId ? { ...item, quantity: Math.min(item.quantity + 1, 99) } : item,
        );
      }
      return [...items, { productId, quantity: 1 }];
    });
  }

  decrement(productId: string): void {
    this.items.update((items) => {
      const found = items.find((item) => item.productId === productId);
      if (!found) {
        return items;
      }
      if (found.quantity <= 1) {
        return items.filter((item) => item.productId !== productId);
      }
      return items.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item,
      );
    });
  }

  remove(productId: string): void {
    this.items.update((items) => items.filter((item) => item.productId !== productId));
  }

  removeUnavailable(): void {
    this.items.update((items) =>
      items.filter((item) => this.productsById.get(item.productId)?.available !== false),
    );
  }

  clear(): void {
    this.items.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  submitLines(): CartItem[] {
    return this.lines()
      .filter((line) => line.status === 'ok')
      .map((line) => ({ productId: line.productId, quantity: line.quantity }));
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as { items?: CartItem[] };
      if (Array.isArray(parsed.items)) {
        this.items.set(
          parsed.items.filter(
            (item) =>
              typeof item.productId === 'string' && Number.isInteger(item.quantity) && item.quantity > 0,
          ),
        );
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}