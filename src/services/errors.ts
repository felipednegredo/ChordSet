/** Error helpers so screens show friendly messages and logs keep the details. */

export class AppError extends Error {
  constructor(
    message: string,
    readonly code: 'not_found' | 'validation' | 'database' | 'permission' | 'unknown' = 'unknown',
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} não encontrado (${id}).`, 'not_found');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'validation');
  }
}

export function toUserMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof AppError) return error.message;
  return fallback;
}

export function logError(context: string, error: unknown): void {
  console.error(`[ChordSet] ${context}`, error);
}
