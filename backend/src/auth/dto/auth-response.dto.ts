import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Token de acceso JWT generado para autenticación Bearer',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Información básica del usuario autenticado',
    example: {
      id: 'd9b2b63d-a233-4f9e-bfb7-2009e450b3e5',
      email: 'juan.perez@ejemplo.com',
      name: 'Juan',
      lastName: 'Pérez',
      role: UserRole.USER,
      isActive: true,
    },
  })
  user: {
    id: string;
    email: string;
    name: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
  };
}
