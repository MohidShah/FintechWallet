/**
 * Prisma Service Module
 * Provides database connection management and lifecycle hooks for Prisma ORM.
 * All database operations in this project MUST go through Prisma (no raw SQL strings).
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
