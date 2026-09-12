import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CreateOrderPayload, OrderResult } from '../models/order';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  constructor(private readonly http: HttpClient) {}

  async create(payload: CreateOrderPayload): Promise<OrderResult> {
    return firstValueFrom(this.http.post<OrderResult>('/api/orders', payload));
  }

  async getStatus(orderId: string): Promise<{ orderId: string; status: string }> {
    return firstValueFrom(this.http.get<{ orderId: string; status: string }>(`/api/orders/${orderId}/status`));
  }
}