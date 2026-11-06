import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('profile')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar el perfil del usuario autenticado',
    description:
      'Obtiene los datos del usuario extraído directamente del token JWT verificado (sin exponer contraseñas).',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario recuperado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token inexistente, inválido o expirado',
  })
  getProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user);
  }

  @Patch()
  @ApiOperation({
    summary: 'Actualizar perfil del usuario autenticado',
    description:
      'Actualiza nombre, apellido y opcionalmente la contraseña del usuario autenticado. Exige la contraseña actual para confirmar cambios. No permite alterar rol ni estado activo.',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o falta contraseña actual requerida',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Contraseña actual incorrecta o token inválido',
  })
  updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user, updateProfileDto);
  }
}
