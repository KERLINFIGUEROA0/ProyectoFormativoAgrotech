import { Controller, Post, Body, Res, Get, UseGuards, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(
    @Body() dto: LoginAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Obtener datos del login (incluye access_token)
    const loginData = await this.authService.login(
      dto.identificacion,
      dto.password,
      dto.id_ficha,
    );

    // Extraemos el token para que NO viaje en el JSON visible
    const { access_token, ...restoDeDatos } = loginData;

    // 1. Guardamos el token en la cookie segura HttpOnly
    res.cookie('Authentication', access_token, {
      httpOnly: true, // CLAVE: JavaScript del front no puede leer esto
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      sameSite: 'lax', // Protege contra CSRF
      maxAge: 8 * 60 * 60 * 1000, // 8 horas (mismo que el token)
    });

    return {
      message: 'Inicio de sesión exitoso',
      ...restoDeDatos,
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('Authentication', '', {
      expires: new Date(0),
      httpOnly: true,
    });
    return { message: 'Sesión cerrada exitosamente' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Obtener datos actualizados desde BD
    const refreshData = await this.authService.refreshToken(req.user);

    // Extraer token para NO enviarlo en JSON
    const { access_token, ...datos } = refreshData;

    // Actualizar cookie con nuevo token
    res.cookie('Authentication', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 horas
    });

    return {
      message: 'Token actualizado',
      ...datos,
    };
  }
}
