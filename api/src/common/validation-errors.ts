import { ValidationError } from 'class-validator';

export function flattenValidationErrors(errors: ValidationError[]): string {
  const messages: string[] = [];
  for (const error of errors) {
    const constraints = error.constraints ? Object.values(error.constraints) : [];
    messages.push(...constraints);
  }
  return messages.length > 0 ? messages.join(' ') : 'Invalid request.';
}