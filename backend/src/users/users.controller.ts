import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from './enums/user-role.enum';
import { User } from './entities/user.entity';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo usuario (Solo ADMIN)',
    description:
      'Permite a un administrador crear un usuario especificando email, nombre, apellido, contraseña, rol e isActive.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente por el administrador',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de usuario inválidos o malformados',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token inexistente o inválido',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido: Solo usuarios con rol ADMIN pueden realizar esta acción',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: El correo electrónico ya se encuentra registrado',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos los usuarios del sistema (Solo ADMIN)',
    description:
      'Retorna una lista completa con todos los usuarios registrados sin exponer contraseñas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios recuperada exitosamente',
    type: [User],
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no proporcionado o inválido',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido: Se requiere rol ADMIN',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un usuario por su identificador UUID (Solo ADMIN)',
    description:
      'Busca y retorna la información de un usuario dado su ID. No retorna la contraseña.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Identificador único UUID v4 del usuario',
    example: 'd9b2b63d-a233-4f9e-bfb7-2009e450b3e5',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Formato de ID inválido (debe ser UUID v4)',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no provisto o inválido',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido: Se requiere rol ADMIN',
  })
  @ApiResponse({
    status: 404,
    description: 'No encontrado: El usuario con el ID especificado no existe',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar datos de un usuario por ID (Solo ADMIN)',
    description:
      'Permite modificar atributos de un usuario. Si se incluye contraseña se vuelve a hashear; valida unicidad del correo si se modifica.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Identificador único UUID v4 del usuario a actualizar',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Petición incorrecta o validación fallida',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido: Se requiere rol ADMIN',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: El correo nuevo ya está en uso por otro usuario',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un usuario por su ID (Solo ADMIN)',
    description:
      'Elimina permanentemente al usuario. Un administrador no puede eliminarse a sí mismo.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Identificador único UUID v4 del usuario a eliminar',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Usuario con ID d9b2b63d-a233-4f9e-bfb7-2009e450b3e5 eliminado exitosamente',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Formato de ID inválido (debe ser UUID)',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido: Se requiere rol ADMIN o el admin intenta autoeliminarse',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() adminUser: User,
  ) {
    return this.usersService.remove(id, adminUser);
  }
}
