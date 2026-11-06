import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService (Unit Tests)', () => {
  let usersService: UsersService;
  let userRepositoryMock: any;

  beforeEach(async () => {
    userRepositoryMock = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepositoryMock,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'admin.create@ejemplo.com',
      name: 'Admin',
      lastName: 'Master',
      password: 'AdminPassword123',
      role: UserRole.ADMIN,
      isActive: true,
    };

    it('debe crear un usuario exitosamente con password hasheado y sin exponer el hash en el retorno', async () => {
      // Caso 1: Creación de usuario válida
      userRepositoryMock.findOne.mockResolvedValue(null);
      const entity = {
        id: 'uuid-admin-id',
        ...createUserDto,
        password: 'hashed-password-xyz',
      };
      userRepositoryMock.create.mockReturnValue(entity);
      userRepositoryMock.save.mockResolvedValue(entity);

      const result = await usersService.create(createUserDto);

      expect(result.id).toBe('uuid-admin-id');
      expect(result.email).toBe(createUserDto.email);
      expect((result as any).password).toBeUndefined(); // Sin exponer password
    });

    it('debe lanzar ConflictException (409) si el email ya existe', async () => {
      // Caso 2: Email duplicado
      userRepositoryMock.findOne.mockResolvedValue({ id: 'existing-uuid' });

      await expect(usersService.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('debe listar todos los usuarios sin exponer contraseñas', async () => {
      // Caso 3: Listar usuarios
      const usersList = [
        {
          id: 'uuid-1',
          email: 'u1@ejemplo.com',
          password: 'secret-hash-1',
          name: 'U1',
          lastName: 'L1',
          role: UserRole.USER,
          isActive: true,
        },
        {
          id: 'uuid-2',
          email: 'u2@ejemplo.com',
          password: 'secret-hash-2',
          name: 'U2',
          lastName: 'L2',
          role: UserRole.ADMIN,
          isActive: true,
        },
      ];
      userRepositoryMock.find.mockResolvedValue(usersList);

      const result = await usersService.findAll();

      expect(result).toHaveLength(2);
      expect((result[0] as any).password).toBeUndefined();
      expect((result[1] as any).password).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('debe encontrar y retornar un usuario sin password por su ID', async () => {
      // Caso 4: Buscar por ID existente
      const user = {
        id: 'uuid-1',
        email: 'u1@ejemplo.com',
        password: 'secret-hash-1',
        name: 'U1',
        lastName: 'L1',
        role: UserRole.USER,
        isActive: true,
      };
      userRepositoryMock.findOne.mockResolvedValue(user);

      const result = await usersService.findOne('uuid-1');
      expect(result.id).toBe('uuid-1');
      expect((result as any).password).toBeUndefined();
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      // Caso 5: Usuario inexistente
      userRepositoryMock.findOne.mockResolvedValue(null);

      await expect(usersService.findOne('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('debe actualizar los datos, hashear nuevo password si se envía y no exponer password', async () => {
      // Caso 6: Actualizar usuario con nueva contraseña
      const existingUser = {
        id: 'uuid-1',
        email: 'original@ejemplo.com',
        name: 'Original',
        lastName: 'User',
        password: 'old-hash',
        role: UserRole.USER,
        isActive: true,
      };
      userRepositoryMock.findOne.mockResolvedValue(existingUser);
      userRepositoryMock.save.mockImplementation((u) => Promise.resolve(u));

      const updateDto: UpdateUserDto = {
        name: 'NuevoNombre',
        password: 'NuevaPassword456',
      };

      const result = await usersService.update('uuid-1', updateDto);

      expect(result.name).toBe('NuevoNombre');
      expect((result as any).password).toBeUndefined();
    });

    it('debe lanzar ConflictException si el nuevo email ya está en uso por otro usuario', async () => {
      // Caso 7: Intento de cambiar a un email ya existente
      const existingUser = {
        id: 'uuid-1',
        email: 'original@ejemplo.com',
      };
      userRepositoryMock.findOne
        .mockResolvedValueOnce(existingUser) // Para buscar el usuario a actualizar
        .mockResolvedValueOnce({ id: 'uuid-2', email: 'ocupado@ejemplo.com' }); // Para chequear si el nuevo email ya existe

      await expect(
        usersService.update('uuid-1', { email: 'ocupado@ejemplo.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('debe permitir eliminar a otro usuario si el admin no se autoelimina', async () => {
      // Caso 8: Admin elimina a otro usuario
      const currentAdmin = { id: 'admin-id' } as User;
      const targetUser = { id: 'user-id-to-delete' } as User;

      userRepositoryMock.findOne.mockResolvedValue(targetUser);
      userRepositoryMock.remove.mockResolvedValue(targetUser);

      const result = await usersService.remove('user-id-to-delete', currentAdmin);
      expect(result.message).toContain('eliminado exitosamente');
      expect(userRepositoryMock.remove).toHaveBeenCalledWith(targetUser);
    });

    it('debe lanzar ForbiddenException (403) si un admin intenta autoeliminarse', async () => {
      // Caso 9: Admin intenta autoeliminarse
      const currentAdmin = { id: 'admin-id' } as User;

      await expect(usersService.remove('admin-id', currentAdmin)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepositoryMock.remove).not.toHaveBeenCalled();
    });
  });
});
