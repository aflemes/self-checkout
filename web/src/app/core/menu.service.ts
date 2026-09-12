import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Menu } from '../models/menu';

@Injectable({ providedIn: 'root' })
export class MenuService {
  readonly menu = signal<Menu | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly http: HttpClient) {}

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const menu = await firstValueFrom(this.http.get<Menu>('/api/menu'));
      this.menu.set(menu);
    } catch {
      this.error.set('Unable to load the menu. Check your connection and try again.');
    } finally {
      this.loading.set(false);
    }
  }
}