import { BadRequestException, HttpException, InternalServerErrorException, Logger } from '@nestjs/common';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { internalErrorMessage } from '../internal-error-message';

function mockHost(captured: { status: number; json: { message: string } | null }) {
  const res = {
    status: (code: number) => {
      captured.status = code;
      return { json: (body: { message: string }) => void (captured.json = body) };
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({ method: 'GET', url: '/api/x' }),
    }),
  };
  return host as Parameters<AllExceptionsFilter['catch']>[1];
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  beforeAll(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('maps HttpException to its status and message', () => {
    const captured: { status: number; json: { message: string } | null } = { status: 0, json: null };
    filter.catch(new BadRequestException('pedido invalido'), mockHost(captured));
    expect(captured.status).toBe(400);
    expect((captured.json as { message: string }).message).toBe('pedido invalido');
  });

  it('joins array messages with a space', () => {
    const captured: { status: number; json: { message: string } | null } = { status: 0, json: null };
    const ex = new HttpException({ message: ['a', 'b'] }, 400);
    filter.catch(ex, mockHost(captured));
    expect((captured.json as { message: string }).message).toBe('a b');
  });

  it('uses internal message when HttpException body has none', () => {
    const captured: { status: number; json: { message: string } | null } = { status: 0, json: null };
    const ex = new InternalServerErrorException({ other: 'x' });
    filter.catch(ex, mockHost(captured));
    expect((captured.json as { message: string }).message).toBe(internalErrorMessage);
  });

  it('returns 500 for QueryFailedError', () => {
    const captured: { status: number; json: { message: string } | null } = { status: 0, json: null };
    filter.catch(new QueryFailedError('SELECT 1', [], new Error('DB down')), mockHost(captured));
    expect(captured.status).toBe(500);
    expect((captured.json as { message: string }).message).toBe(internalErrorMessage);
  });

  it('returns 500 for any unknown error without leaking internals', () => {
    const captured: { status: number; json: { message: string } | null } = { status: 0, json: null };
    filter.catch(new Error('secret detail'), mockHost(captured));
    expect(captured.status).toBe(500);
    expect((captured.json as { message: string }).message).toBe(internalErrorMessage);
    expect((captured.json as { message: string }).message).not.toContain('secret');
  });
});
