import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CartService } from './cart.service';
import { Menu, MenuProduct } from '../models/menu';

const product = (id: string, price: number, available = true): MenuProduct => ({
  id,
  categoryId: 1,
  name: id,
  description: '',
  price,
  available,
});

const menu: Menu = {
  categories: [{ id: 1, name: 'Cat' }],
  items: [product('a', 10), product('b', 2, false)],
};

describe('CartService', () => {
  let service: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    service = TestBed.inject(CartService);
    service.reconcile(menu);
  });

  it('adds a new item', () => {
    service.add('a');
    expect(service.items()).toEqual([{ productId: 'a', quantity: 1 }]);
  });

  it('increments existing item quantity up to 99', () => {
    service.add('a');
    service.add('a');
    expect(service.items()).toEqual([{ productId: 'a', quantity: 2 }]);
  });

  it('decrements quantity', () => {
    service.add('a');
    service.add('a');
    service.decrement('a');
    expect(service.items()).toEqual([{ productId: 'a', quantity: 1 }]);
  });

  it('removes item when decrementing from 1', () => {
    service.add('a');
    service.decrement('a');
    expect(service.items()).toEqual([]);
  });

  it('removes item', () => {
    service.add('a');
    service.remove('a');
    expect(service.items()).toEqual([]);
  });

  it('computes totalCents from available lines only', () => {
    service.add('a');
    service.add('a');
    service.add('b');
    expect(service.totalCents()).toBe(2000);
  });

  it('computes itemCount', () => {
    service.add('a');
    service.add('a');
    service.add('b');
    expect(service.itemCount()).toBe(3);
  });

  it('hasIssues flags unavailable lines', () => {
    service.add('b');
    expect(service.hasIssues()).toBe(true);
  });

  it('submitLines returns only ok lines', () => {
    service.add('a');
    service.add('b');
    expect(service.submitLines()).toEqual([{ productId: 'a', quantity: 1 }]);
  });

  it('reconcile drops items not in the menu', () => {
    service.add('gone-item');
    service.reconcile(menu);
    expect(service.items()).toEqual([]);
  });

  it('clear empties the cart', () => {
    service.add('a');
    service.clear();
    expect(service.items()).toEqual([]);
  });
});
