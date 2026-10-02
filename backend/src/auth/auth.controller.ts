/**
 * Auth Controller Module
 * Handles customer registration and login endpoints (FR-1, FR-2).
 * Rate limited to prevent brute-force attacks via NestJS Throttler.
 */
import { Controller, Get, Post, Body, Req, UsePipes } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterSchema, RegisterDto } from './dto/register.dto';
import { LoginSchema, LoginDto } from './dto/login.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Customer Registration Endpoint (FR-1, W3)
   */
  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Customer Login Endpoint (FR-2, W3)
   * Rate limited: max 5 login requests per 60 seconds to prevent brute-force.
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip);
  }

  /**
   * List Registered Accounts Endpoint for recipient selection
   */
  @Get('users')
  async getAllUsers() {
    return this.authService.getAllUsers();
  }
}
