import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthService (Unit Tests)', () => {
  let authService: AuthService;
  let userRepositoryMock: any;
  let jwtServiceMock: any;

  beforeEach(async () => {
    userRepositoryMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    jwtServiceMock = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepositoryMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'nuevo@ejemplo.com',
      name: 'Nuevo',
      lastName: 'Usuario',
      password: 'Password123',
    };

    it('debe registrar un usuario exitosamente con rol USER e isActive true sin devolver password', async () => {
      // Caso 1: Registro exitoso
      // Arrange
      userRepositoryMock.findOne.mockResolvedValue(null);
      const createdEntity = {
        id: 'uuid-1234',
        ...registerDto,
        password: 'hashed-password',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      userRepositoryMock.create.mockReturnValue(createdEntity);
      userRepositoryMock.save.mockResolvedValue(createdEntity);

      // Act
      const result = await authService.register(registerDto);

      // Assert
      expect(userRepositoryMock.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('uuid-1234');
      expect(result.email).toBe(registerDto.email);
      expect(result.role).toBe(UserRole.USER);
      expect(result.isActive).toBe(true);
      expect((result as any).password).toBeUndefined(); // Verifica que el password esté sanitizado
    });

    it('debe lanzar ConflictException (409) cuando el email ya está registrado', async () => {
      // Caso 2: Email duplicado
      // Arrange
      userRepositoryMock.findOne.mockResolvedValue({
        id: 'existing-id',
        email: registerDto.email,
      });

      // Act & Assert
      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepositoryMock.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@ejemplo.com',
      password: 'Password123',
    };

    it('debe loguear correctamente y retornar token JWT y datos de usuario sin password', async () => {
      // Caso 3: Login con credenciales válidas y usuario activo
      const rawPassword = 'Password123';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      const existingUser: Partial<User> = {
        id: 'uuid-user-1',
        email: loginDto.email,
        password: hashedPassword,
        name: 'Carlos',
        lastName: 'Santana',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepositoryMock.findOne.mockResolvedValue(existingUser);
      jwtServiceMock.signAsync.mockResolvedValue('jwt-mock-token-xyz');

      const result = await authService.login(loginDto);

      expect(result.accessToken).toBe('jwt-mock-token-xyz');
      expect(result.user.email).toBe(loginDto.email);
      expect((result.user as any).password).toBeUndefined();
    });

    it('debe lanzar UnauthorizedException (401) cuando la contraseña no coincide', async () => {
      // Caso 4: Login con contraseña incorrecta
      const hashedPassword = await bcrypt.hash('CorrectPassword', 10);
      userRepositoryMock.findOne.mockResolvedValue({
        id: 'uuid-user-1',
        email: loginDto.email,
        password: hashedPassword,
        isActive: true,
      });

      await expect(
        authService.login({ ...loginDto, password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException (401) cuando el usuario tiene isActive = false', async () => {
      // Caso 5: Login con usuario inactivo
      const rawPassword = 'Password123';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      userRepositoryMock.findOne.mockResolvedValue({
        id: 'uuid-inactive',
        email: loginDto.email,
        password: hashedPassword,
        isActive: false, // Inactivo
      });

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe lanzar UnauthorizedException (401) cuando el usuario no existe en la base de datos', async () => {
      // Caso 6: Usuario inexistente
      userRepositoryMock.findOne.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
