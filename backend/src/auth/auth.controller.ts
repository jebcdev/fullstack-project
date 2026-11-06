import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar un nuevo usuario público',
    description:
      'Permite el registro público de nuevos usuarios con rol USER por defecto e isActive en true. La contraseña es cifrada y no se expone.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de registro inválidos (error de validación)',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: El correo electrónico ya se encuentra registrado',
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión y obtener token JWT',
    description:
      'Valida las credenciales proporcionadas y el estado activo del usuario. Retorna el token JWT de acceso (Bearer) y datos del perfil.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Autenticación exitosa. Se retorna el token JWT de acceso.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cuerpo de la petición inválido o campos faltantes',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas o usuario inactivo',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener el perfil del usuario autenticado actual',
    description:
      'Ruta protegida por JWT. Retorna la información del usuario autenticado sin revelar su contraseña.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario autenticado obtenido correctamente',
    type: User,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token inexistente, inválido o expirado',
  })
  getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user);
  }
}
