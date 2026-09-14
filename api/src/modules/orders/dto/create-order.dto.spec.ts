import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateOrderDto, OrderItemDto } from './create-order.dto';
import { PaymentMethod } from '../payment-method';

const valid = {
  idempotencyKey: 'e0b6a90c-4f98-4f9a-bcd0-7d1a8b2c3d4e',
  items: [{ productId: 'cola-500ml', quantity: 2 }],
  payment: { method: PaymentMethod.CARD },
};

async function errorsFor(data: unknown): Promise<string[]> {
  const dto = plainToInstance(CreateOrderDto, data);
  const errors = await validate(dto);
  return errors.map((e) => e.property);
}

async function errorsForItem(data: unknown): Promise<string[]> {
  const item = plainToInstance(OrderItemDto, data);
  const errors = await validate(item);
  return errors.map((e) => e.property);
}

describe('CreateOrderDto', () => {
  it('accepts a valid order', async () => {
    expect(await errorsFor(valid)).toHaveLength(0);
  });

  it('flags an invalid idempotency key', async () => {
    const errs = await errorsFor({ ...valid, idempotencyKey: 'not-a-uuid' });
    expect(errs).toContain('idempotencyKey');
  });

  it('flags missing idempotency key', async () => {
    const { idempotencyKey, ...rest } = valid;
    expect(await errorsFor(rest)).toContain('idempotencyKey');
  });

  it('flags empty items', async () => {
    expect(await errorsFor({ ...valid, items: [] })).toContain('items');
  });

  it('flags missing items', async () => {
    const { items, ...rest } = valid;
    expect(await errorsFor(rest)).toContain('items');
  });

  it('flags invalid payment method', async () => {
    expect(await errorsFor({ ...valid, payment: { method: 'PIX' } })).toContain('payment');
  });
});

describe('OrderItemDto', () => {
  it('accepts a valid line', async () => {
    expect(await errorsForItem({ productId: 'cola-500ml', quantity: 2 })).toHaveLength(0);
  });

  it('flags quantity 0', async () => {
    expect(await errorsForItem({ productId: 'cola-500ml', quantity: 0 })).toContain('quantity');
  });

  it('flags quantity 100', async () => {
    expect(await errorsForItem({ productId: 'cola-500ml', quantity: 100 })).toContain('quantity');
  });

  it('flags negative quantity', async () => {
    expect(await errorsForItem({ productId: 'cola-500ml', quantity: -1 })).toContain('quantity');
  });

  it('flags productId with invalid characters', async () => {
    expect(await errorsForItem({ productId: 'Cola 500ml!', quantity: 1 })).toContain('productId');
  });

  it('flags missing productId', async () => {
    expect(await errorsForItem({ quantity: 1 })).toContain('productId');
  });
});
