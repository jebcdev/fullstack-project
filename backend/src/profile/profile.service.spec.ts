import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ProfileService } from './profile.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';

describe('ProfileService (Unit Tests)', () => {
  let profileService: ProfileService;
  let userRepositoryMock: any;

  beforeEach(async () => {
    userRepositoryMock = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepositoryMock,
        },
      ],
    }).compile();

    profileService = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockTokenUser: User = {
    id: 'uuid-user-1',
    email: 'user@ejemplo.com',
    role: UserRole.USER,
    name: 'Juan',
    lastName: 'Pérez',
    password: 'hashed-password',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('getProfile', () => {
    it('debe retornar el perfil del usuario autenticado sin incluir el password', async () => {
      // Caso 1: Obtener perfil
      userRepositoryMock.findOne.mockResolvedValue(mockTokenUser);

      const profile = await profileService.getProfile(mockTokenUser);

      expect(profile.id).toBe(mockTokenUser.id);
      expect(profile.email).toBe(mockTokenUser.email);
      expect((profile as any).password).toBeUndefined();
    });

    it('debe lanzar NotFoundException si el usuario no existe en base de datos', async () => {
      // Caso 2: Usuario del token no encontrado
      userRepositoryMock.findOne.mockResolvedValue(null);

      await expect(profileService.getProfile(mockTokenUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('debe actualizar el perfil con la contraseña actual correcta y nueva contraseña hasheada', async () => {
      // Caso 3: Actualizar con contraseña actual correcta y nueva password
      const currentPassword = 'PasswordActual123!';
      const hashedPassword = await bcrypt.hash(currentPassword, 10);

      const existingDbUser = {
        ...mockTokenUser,
        password: hashedPassword,
      };

      userRepositoryMock.findOne.mockResolvedValue(existingDbUser);
      userRepositoryMock.save.mockImplementation((u) => Promise.resolve(u));

      const updateDto: UpdateProfileDto = {
        currentPassword,
        name: 'NuevoNombre',
        lastName: 'NuevoApellido',
        newPassword: 'NuevaPassword456!',
      };

      const result = await profileService.updateProfile(
        mockTokenUser,
        updateDto,
      );

      expect(result.name).toBe('NuevoNombre');
      expect(result.lastName).toBe('NuevoApellido');
      expect((result as any).password).toBeUndefined();
    });

    it('debe lanzar UnauthorizedException (401) si la contraseña actual proporcionada es incorrecta', async () => {
      // Caso 4: Contraseña actual inválida
      const currentHashed = await bcrypt.hash('CorrectPassword', 10);
      const existingDbUser = {
        ...mockTokenUser,
        password: currentHashed,
      };

      userRepositoryMock.findOne.mockResolvedValue(existingDbUser);

      const updateDto: UpdateProfileDto = {
        currentPassword: 'WrongPassword',
        name: 'IntentoNombre',
      };

      await expect(
        profileService.updateProfile(mockTokenUser, updateDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(userRepositoryMock.save).not.toHaveBeenCalled();
    });

    it('debe actualizar únicamente name y lastName sin modificar role ni isActive', async () => {
      // Caso 5: Actualizar solo campos personales y verificar integridad de role e isActive
      const currentPassword = 'Password123';
      const currentHashed = await bcrypt.hash(currentPassword, 10);
      const existingDbUser = {
        ...mockTokenUser,
        role: UserRole.USER,
        isActive: true,
        password: currentHashed,
      };

      userRepositoryMock.findOne.mockResolvedValue(existingDbUser);
      userRepositoryMock.save.mockImplementation((u) => Promise.resolve(u));

      const updateDto: UpdateProfileDto = {
        currentPassword,
        name: 'SoloNombre',
        lastName: 'SoloApellido',
      };

      // Si se intentara pasar role o isActive mediante casting malicioso:
      (updateDto as any).role = UserRole.ADMIN;
      (updateDto as any).isActive = false;

      const result = await profileService.updateProfile(
        mockTokenUser,
        updateDto,
      );

      expect(result.name).toBe('SoloNombre');
      expect(result.lastName).toBe('SoloApellido');
      expect(result.role).toBe(UserRole.USER); // Se mantiene inalterado
      expect(result.isActive).toBe(true); // Se mantiene inalterado
    });
  });
});
