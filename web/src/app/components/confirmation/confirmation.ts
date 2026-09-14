import { Component, input, output } from '@angular/core';
import { formatUSD } from '../../core/format';
import { OrderResult } from '../../models/order';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  styleUrl: './confirmation.css',
  templateUrl: './confirmation.html',
})
export class ConfirmationComponent {
  readonly order = input.required<OrderResult>();
  readonly reset = output<void>();
  readonly formatUSD = formatUSD;
  readonly Math = Math;
}