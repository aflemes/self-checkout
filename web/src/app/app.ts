import { Component, inject, signal } from '@angular/core';
import { CartService } from './core/cart.service';
import { ConfigService } from './core/config.service';
import { InactivityService } from './core/inactivity.service';
import { MenuService } from './core/menu.service';
import { SupportService } from './core/support.service';
import { OrderResult } from './models/order';
import { MenuGridComponent } from './components/menu-grid';
import { OrderRailComponent } from './components/order-rail';
import { CheckoutComponent } from './components/checkout';
import { ConfirmationComponent } from './components/confirmation';
import { HelpPanelComponent } from './components/help-panel';
import { InactivityComponent } from './components/inactivity';

@Component({
  selector: 'app-root',
  standalone: true,
  styleUrl: './app.css',
  imports: [
    MenuGridComponent,
    OrderRailComponent,
    CheckoutComponent,
    ConfirmationComponent,
    HelpPanelComponent,
    InactivityComponent,
  ],
  templateUrl: './app.html',
})
export class App {
  readonly menu = inject(MenuService);
  readonly cart = inject(CartService);
  readonly support = inject(SupportService);
  readonly inactivity = inject(InactivityService);
  private readonly config = inject(ConfigService);

  readonly checkoutOpen = signal(false);
  readonly order = signal<OrderResult | null>(null);

  async ngOnInit(): Promise<void> {
    await this.config.load();
    await this.loadMenu();
    this.inactivity.start(() => this.onInactivityTimeout());
  }

  async loadMenu(): Promise<void> {
    await this.menu.load();
    const loaded = this.menu.menu();
    if (loaded) {
      this.cart.reconcile(loaded);
    }
  }

  openCheckout(): void {
    if (this.cart.itemCount() > 0 && !this.cart.hasIssues()) {
      this.checkoutOpen.set(true);
    }
  }

  closeCheckout(): void {
    this.checkoutOpen.set(false);
  }

  onConfirmed(result: OrderResult): void {
    this.checkoutOpen.set(false);
    this.order.set(result);
  }

  async newPurchase(): Promise<void> {
    this.cart.clear();
    this.order.set(null);
    this.support.reset();
    await this.loadMenu();
  }

  private onInactivityTimeout(): void {
    this.checkoutOpen.set(false);
    this.order.set(null);
    this.support.reset();
    this.cart.clear();
    void this.loadMenu();
  }
}