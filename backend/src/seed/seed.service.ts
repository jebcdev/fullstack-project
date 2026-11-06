import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

export interface SeededUserResponse {
  id: string;
  email: string;
  name: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async executeSeed(): Promise<{
    message: string;
    count: number;
    users: SeededUserResponse[];
  }> {
    const SEED_PASSWORD =
      process.env.SEED_USERS_PASSWORD || 'SeedPassword123!';

    if (!SEED_PASSWORD) {
      throw new InternalServerErrorException(
        'SEED_USERS_PASSWORD no está definida en las variables de entorno',
      );
    }

    // 1. Eliminar todos los registros existentes para resetear la base de datos
    await this.userRepository.query('DELETE FROM "users";');

    // 2. Hashear la contraseña única para todos los usuarios iniciales
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

    // 3. Definir un usuario por cada rol: ADMIN, USER, GUEST
    const seedUsersData = [
      {
        email: 'admin@email.com',
        name: 'Super',
        lastName: 'Admin',
        password: hashedPassword,
        role: UserRole.ADMIN,
        isActive: true,
      },
      {
        email: 'user@email.com',
        name: 'Standard',
        lastName: 'User',
        password: hashedPassword,
        role: UserRole.USER,
        isActive: true,
      },
      {
        email: 'guest@email.com',
        name: 'Invited',
        lastName: 'Guest',
        password: hashedPassword,
        role: UserRole.GUEST,
        isActive: true,
      },
    ];

    // 4. Crear y persistir entidades
    const createdUsers = this.userRepository.create(seedUsersData);
    const savedUsers = await this.userRepository.save(createdUsers);

    // 5. Retornar respuesta sanitizada (sin password)
    const sanitizedUsers: SeededUserResponse[] = savedUsers.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    }));

    return {
      message: 'Base de datos reiniciada y poblada con usuarios iniciales exitosamente',
      count: sanitizedUsers.length,
      users: sanitizedUsers,
    };
  }
}
