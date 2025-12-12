import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

// Función personalizada para extraer el JWT desde la cookie
const cookieExtractor = (req: Request): string | null => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['Authentication']; // El mismo nombre que pusimos en el controller
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Usamos el extractor de cookies en lugar del Header Authorization
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      secretOrKey: process.env.JWT_SECRET || 'dev_secret',
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      identificacion: payload.identificacion,
      rolId: payload.rolId, // numérico
      rolNombre: payload.rolNombre, // string para mostrar
      permisos: payload.permisos ?? [],
      modulos: payload.modulos ?? {},
    };
  }
}

