import { Component, computed, inject, input, signal } from '@angular/core';
import { Menu } from '../models/menu';
import { CartService } from '../core/cart.service';
import { formatBRL } from '../core/format';

const categoryEmoji: Record<number, string> = {
  1: '🌭',
  2: '🌮',
  3: '🍿',
  4: '🍪',
  5: '☕',
  6: '🥤',
};

@Component({
  selector: 'app-menu-grid',
  standalone: true,
  styleUrl: './menu-grid.css',
  templateUrl: './menu-grid.html',
})
export class MenuGridComponent {
  readonly cart = inject(CartService);
  readonly menu = input<Menu | null>(null);
  readonly selectedCategory = signal<number | null>(null);

  readonly items = computed(() => {
    const menu = this.menu();
    if (!menu) {
      return [];
    }
    const selected = this.selectedCategory();
    return selected === null
      ? menu.items
      : menu.items.filter((item) => item.categoryId === selected);
  });

  emoji(categoryId: number): string {
    return categoryEmoji[categoryId] ?? '🍽️';
  }

  quantity(productId: string): number {
    return this.cart.items().find((item) => item.productId === productId)?.quantity ?? 0;
  }

  priceCents(productId: string): number {
    const menu = this.menu();
    const product = menu?.items.find((item) => item.id === productId);
    return product ? Math.round(product.price * 100) : 0;
  }

  formatBRL = formatBRL;
}