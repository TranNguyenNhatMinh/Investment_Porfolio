import { Controller, Post, Patch, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ChangePasswordDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('avatar')
  updateAvatar(@Req() req: any, @Body() body: { avatar: string }) {
    return this.auth.updateAvatar(req.user.id, body.avatar);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('name')
  updateName(@Req() req: any, @Body() body: { name: string }) {
    return this.auth.updateName(req.user.id, body.name);
  }
}
