import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'dev_secret',
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    const user = {
      id: payload.sub,
      identificacion: payload.identificacion,
      rolId: payload.rolId, // numérico
      rolNombre: payload.rolNombre, // string para mostrar
      permisos: payload.permisos ?? [],
      modulos: payload.modulos ?? {},
    };
    return user;
  }
}

