import { HttpErrorResponse } from '@angular/common/http';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatUSD(cents: number): string {
  return usd.format(cents / 100);
}

export function friendlyHttpError(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse && err.status !== 0) {
    const body = err.error as { message?: unknown } | null;
    if (body && typeof body.message === 'string') {
      return body.message;
    }
  }
  return fallback;
}