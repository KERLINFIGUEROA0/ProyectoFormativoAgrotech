import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../modules/usuarios/usuarios.service';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../modules/usuarios/entities/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async _createToken(usuario: Usuario) {
    const permisosRol = (usuario.tipoUsuario?.rolPermisos ?? [])
      .map((rp) => rp.permiso?.nombre)
      .filter(Boolean) as string[];

    const permisosUsuario = (usuario.usuarioPermisos ?? [])
      .map((up) => up.permiso?.nombre)
      .filter(Boolean) as string[];
      
    const permisos = Array.from(new Set([...permisosRol, ...permisosUsuario]));

    const modulos = (usuario.tipoUsuario?.rolPermisos ?? [])
      .map((rp) => rp.permiso)
      .concat((usuario.usuarioPermisos ?? []).map((up) => up.permiso))
      .filter(Boolean)
      .reduce((acc: Record<string, string[]>, p: any) => {
        const moduloNombre = p?.modulo?.nombre || 'General';
        acc[moduloNombre] = acc[moduloNombre] || [];
        if (!acc[moduloNombre].includes(p.nombre)) {
          acc[moduloNombre].push(p.nombre);
        }
        return acc;
      }, {});

    const payload = {
      sub: usuario.id,
      identificacion: usuario.identificacion,
      rolId: usuario.tipoUsuario?.id,
      rolNombre: usuario.tipoUsuario?.nombre,
      nombre: usuario.nombre, // Agregar el nombre al payload del JWT
      permisos,
      modulos,
    };

    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '8h' }),
      user: {
        id: usuario.id,
        identificacion: usuario.identificacion,
        nombre: usuario.nombre,
        rolId: usuario.tipoUsuario?.id,
        rolNombre: usuario.tipoUsuario?.nombre,
      },
      permisos,
      modulos,
    };
  }

  async login(identificacion: string | number, password: string, id_ficha?: string) {
    const usuario = await this.usuariosService.findByIdentificacion(identificacion);
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');
    if (usuario.estado === false) {
      throw new UnauthorizedException('El usuario se encuentra inactivo.');
    }

    // Solo validar ficha si el usuario tiene una asignada (no es admin)
    if (usuario.ficha && id_ficha) {
      if (usuario.ficha.id_ficha !== id_ficha) {
        throw new UnauthorizedException('La ficha proporcionada no coincide con la del usuario.');
      }
    }

    const ok = await bcrypt.compare(password, usuario.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    // Usamos el nuevo método para generar la respuesta
    return this._createToken(usuario);
  }
}
