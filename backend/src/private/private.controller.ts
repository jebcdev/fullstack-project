import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PrivateService } from './private.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('private')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN)
@Controller('private')
export class PrivateController {
  constructor(private readonly privateService: PrivateService) {}

  @Get('users')
  @ApiOperation({
    summary: 'Obtener datos privados de usuarios (Requiere rol USER o ADMIN)',
    description:
      'Endpoint protegido por JWT y validación de roles. Los usuarios con rol GUEST tienen el acceso denegado (403 Forbidden). No expone contraseñas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista resumida de usuarios para miembros USER o ADMIN',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Ruta privada accesible exclusivamente para roles USER y ADMIN',
        },
        count: { type: 'number', example: 1 },
        users: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/User',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token inexistente, malformado o vencido',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido: Los usuarios con rol GUEST o sin permisos requeridos son rechazados',
  })
  getPrivateUsers() {
    return this.privateService.getPrivateUsers();
  }
}
