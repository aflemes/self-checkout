import { Component, inject, output } from '@angular/core';
import { InactivityService } from '../core/inactivity.service';

@Component({
  selector: 'app-inactivity',
  standalone: true,
  styleUrl: './inactivity.css',
  templateUrl: './inactivity.html',
})
export class InactivityComponent {
  readonly inactivity = inject(InactivityService);
  readonly continue = output<void>();
}