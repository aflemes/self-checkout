import { Component, computed, inject, output } from '@angular/core';
import { CartService } from '../../core/cart.service';
import { formatBRL } from '../../core/format';

@Component({
  selector: 'app-order-rail',
  standalone: true,
  styleUrl: './order-rail.css',
  templateUrl: './order-rail.html',
})
export class OrderRailComponent {
  readonly cart = inject(CartService);
  readonly pay = output<void>();

  unitCents(product?: { price: number }): number {
    return product ? Math.round(product.price * 100) : 0;
  }

  formatBRL = formatBRL;
}