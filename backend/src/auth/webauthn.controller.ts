/**
 * ============================================================================
 * WEBAUTHN / FIDO2 CONTROLLER (REST API Endpoints for Passkeys)
 * ============================================================================
 */
import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { WebAuthnService } from './webauthn.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth/webauthn')
export class WebAuthnController {
  constructor(private readonly webAuthnService: WebAuthnService) {}

  @UseGuards(JwtAuthGuard)
  @Get('register-options')
  async getRegisterOptions(@Request() req: any) {
    return this.webAuthnService.generateRegistrationOptions(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('register-verify')
  async verifyRegistration(@Request() req: any, @Body() body: any) {
    return this.webAuthnService.verifyRegistration(req.user.sub, body);
  }

  @Post('login-options')
  async getLoginOptions(@Body('email') email?: string) {
    return this.webAuthnService.generateAuthenticationOptions(email);
  }

  @Post('login-verify')
  async verifyLogin(@Body() body: any) {
    return this.webAuthnService.verifyAuthentication(body);
  }
}
