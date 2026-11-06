import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    configService: ConfigService,
  ) {
    const jwtSecret =
      configService.get<string>('JWT_SECRET') || 'default-jwt-secret-key-change-me';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const { sub: id } = payload;
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new UnauthorizedException('Token no válido: usuario inexistente');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo. Acceso no autorizado');
    }

    return user;
  }
}
