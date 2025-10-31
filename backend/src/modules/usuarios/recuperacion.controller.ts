import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('recuperacion')
export class RecuperacionController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post('solicitar')
  async recuperar(@Body('identificacion') identificacion: string) {
    if (!identificacion) {
      throw new BadRequestException('Identificación requerida');
    }

    const usuario =
      await this.usuariosService.solicitarRecuperacion(identificacion);

    return {
      mensaje: 'Correo de recuperación enviado',
      correo: usuario.correo,
    };
  }

  @Get('verificar/:token')
  async verificar(@Param('token') token: string) {
    return await this.usuariosService.verificarToken(token);
  }

  @Post('restablecer')
  async restablecer(@Body() dto: ResetPasswordDto) {
    return this.usuariosService.restablecerPassword(dto.token, dto.nueva);
  }
}

