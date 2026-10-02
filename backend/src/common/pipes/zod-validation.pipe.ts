/**
 * Zod Validation Pipe
 * Custom NestJS pipe enforcing input validation schemas on API payloads (FR-7).
 * Gracefully rejects invalid or out-of-range input with a clean 400 response.
 */
import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') {
      return value;
    }
    try {
      return this.schema.parse(value);
    } catch (error: any) {
      const issue = error.issues?.[0];
      const message = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Input validation failed';
      throw new BadRequestException(`Validation Error: ${message}`);
    }
  }
}
