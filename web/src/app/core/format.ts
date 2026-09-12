import { HttpErrorResponse } from '@angular/common/http';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
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