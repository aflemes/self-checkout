import { Component, input, output } from '@angular/core';
import { formatBRL } from '../core/format';
import { OrderResult } from '../models/order';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  styleUrl: './confirmation.css',
  templateUrl: './confirmation.html',
})
export class ConfirmationComponent {
  readonly order = input.required<OrderResult>();
  readonly reset = output<void>();
  readonly formatBRL = formatBRL;
  readonly Math = Math;
}