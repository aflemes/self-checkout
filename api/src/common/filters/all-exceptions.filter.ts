import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Request, Response } from 'express';
import { internalErrorMessage } from '../internal-error-message';

interface FriendlyError {
  message: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = internalErrorMessage;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = this.httpMessage(exception.getResponse());
    } else if (exception instanceof QueryFailedError) {
      this.logger.error(`Database error on ${request.method} ${request.url}`, (exception as Error).stack);
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error on ${request.method} ${request.url}`, exception.stack);
    }

    response.status(status).json({ statusCode: status, message });
  }

  private httpMessage(response: string | object): string {
    if (typeof response === 'string') {
      return response;
    }
    const msg = (response as FriendlyError).message;
    if (Array.isArray(msg)) {
      return msg.join(' ');
    }
    return msg || internalErrorMessage;
  }
}