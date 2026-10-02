/**
 * Admin Controller Module
 * Exposes API endpoints for system administration, database metrics, audit logs, and global ledger.
 */
import { Controller, Get, Post, Param } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getSystemStats();
  }

  @Get('users')
  async getUsers() {
    return this.adminService.getAllUsers();
  }

  @Post('users/:userId/toggle-block')
  async toggleBlockUser(@Param('userId') userId: string) {
    return this.adminService.toggleBlockUser(userId);
  }

  @Get('audit-logs')
  async getAuditLogs() {
    return this.adminService.getAuditLogs();
  }

  @Get('transactions')
  async getTransactions() {
    return this.adminService.getAllTransactions();
  }
}
