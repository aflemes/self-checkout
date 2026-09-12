import { Component, inject } from '@angular/core';
import { SupportService, SupportTopic } from '../core/support.service';

@Component({
  selector: 'app-help-panel',
  standalone: true,
  styleUrl: './help-panel.css',
  templateUrl: './help-panel.html',
})
export class HelpPanelComponent {
  readonly support = inject(SupportService);
}