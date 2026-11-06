import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private sanitizeUser(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser as SafeUser;
  }

  async getProfile(userFromToken: User): Promise<SafeUser> {
    const user = await this.userRepository.findOne({
      where: { id: userFromToken.id },
    });

    if (!user) {
      throw new NotFoundException('Perfil no encontrado');
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(
    userFromToken: User,
    updateProfileDto: UpdateProfileDto,
  ): Promise<SafeUser> {
    const user = await this.userRepository.findOne({
      where: { id: userFromToken.id },
    });

    if (!user) {
      throw new NotFoundException('Perfil de usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(
      updateProfileDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    if (updateProfileDto.name !== undefined) {
      user.name = updateProfileDto.name;
    }

    if (updateProfileDto.lastName !== undefined) {
      user.lastName = updateProfileDto.lastName;
    }

    if (updateProfileDto.newPassword) {
      user.password = await bcrypt.hash(updateProfileDto.newPassword, 10);
    }

    const updatedUser = await this.userRepository.save(user);
    return this.sanitizeUser(updatedUser);
  }
}
