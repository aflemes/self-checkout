import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { formatUSD, friendlyHttpError } from './format';

describe('formatUSD', () => {
  it('formats zero', () => {
    expect(formatUSD(0)).toBe('$0.00');
  });

  it('formats cents without decimal', () => {
    expect(formatUSD(50)).toBe('$0.50');
  });

  it('formats dollars', () => {
    expect(formatUSD(1500)).toBe('$15.00');
  });

  it('formats fractional dollars', () => {
    expect(formatUSD(99)).toBe('$0.99');
  });
});

describe('friendlyHttpError', () => {
  const fallback = 'Erro desconhecido';

  it('returns body.message when present', () => {
    const err = new HttpErrorResponse({ error: { message: 'Produto não encontrado' }, status: 404 });
    expect(friendlyHttpError(err, fallback)).toBe('Produto não encontrado');
  });

  it('returns fallback when body has no message', () => {
    const err = new HttpErrorResponse({ error: { other: 'data' }, status: 500 });
    expect(friendlyHttpError(err, fallback)).toBe(fallback);
  });

  it('returns fallback when status is 0 (network error)', () => {
    const err = new HttpErrorResponse({ status: 0 });
    expect(friendlyHttpError(err, fallback)).toBe(fallback);
  });

  it('returns fallback for non-HttpErrorResponse', () => {
    expect(friendlyHttpError(new Error('boom'), fallback)).toBe(fallback);
  });

  it('returns fallback for null/undefined', () => {
    expect(friendlyHttpError(null, fallback)).toBe(fallback);
    expect(friendlyHttpError(undefined, fallback)).toBe(fallback);
  });
});
