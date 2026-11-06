import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario obligatoria para confirmar cambios',
    example: 'MiClaveSegura123!',
  })
  @IsString({ message: 'La contraseña actual debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña actual es requerida para actualizar el perfil' })
  currentPassword: string;

  @ApiPropertyOptional({
    description: 'Nuevo nombre del usuario',
    example: 'Juan Carlos',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Nuevo apellido del usuario',
    example: 'Pérez Rodríguez',
  })
  @IsOptional()
  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Nueva contraseña opcional para actualizar (mínimo 6 caracteres)',
    example: 'NuevaClaveSegura456!',
    minLength: 6,
  })
  @IsOptional()
  @IsString({ message: 'La nueva contraseña debe ser una cadena de texto' })
  @MinLength(6, { message: 'La nueva contraseña debe tener un mínimo de 6 caracteres' })
  newPassword?: string;
}
