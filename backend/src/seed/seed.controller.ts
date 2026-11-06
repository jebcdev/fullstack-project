import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SeedService } from './seed.service';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reiniciar la base de datos y sembrar usuarios iniciales (Seed)',
    description:
      'Elimina todos los datos existentes en la tabla de usuarios y crea un usuario por cada rol (ADMIN: admin@email.com, USER: user@email.com, GUEST: guest@email.com) utilizando la contraseña SEED_USERS_PASSWORD.',
  })
  @ApiResponse({
    status: 200,
    description: 'Base de datos reiniciada y poblada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Base de datos reiniciada y poblada con usuarios iniciales exitosamente',
        },
        count: { type: 'number', example: 3 },
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
              lastName: { type: 'string' },
              role: { type: 'string', enum: ['ADMIN', 'USER', 'GUEST'] },
              isActive: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  executeSeed() {
    return this.seedService.executeSeed();
  }
}
