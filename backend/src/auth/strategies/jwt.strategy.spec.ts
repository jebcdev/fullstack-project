import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UserRole } from '../../users/enums/user-role.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy (Unit Tests)', () => {
  let jwtStrategy: JwtStrategy;
  let userRepositoryMock: any;
  let configServiceMock: any;

  beforeEach(() => {
    userRepositoryMock = {
      findOne: jest.fn(),
    };
    configServiceMock = {
      get: jest.fn().mockReturnValue('test-secret-key-jwt'),
    };

    jwtStrategy = new JwtStrategy(
      userRepositoryMock,
      configServiceMock as ConfigService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const payload: JwtPayload = {
    sub: 'uuid-123',
    email: 'test@ejemplo.com',
    role: UserRole.USER,
  };

  it('debe validar un payload correcto y retornar el usuario activo encontrado', async () => {
    // Caso 1: Payload válido y usuario activo
    const mockUser = {
      id: 'uuid-123',
      email: 'test@ejemplo.com',
      role: UserRole.USER,
      isActive: true,
    };
    userRepositoryMock.findOne.mockResolvedValue(mockUser);

    const user = await jwtStrategy.validate(payload);
    expect(user).toEqual(mockUser);
    expect(userRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { id: payload.sub },
    });
  });

  it('debe lanzar UnauthorizedException (401) cuando el usuario tiene isActive = false', async () => {
    // Caso 2: Usuario inactivo no puede acceder con el token
    const mockInactiveUser = {
      id: 'uuid-123',
      email: 'test@ejemplo.com',
      role: UserRole.USER,
      isActive: false,
    };
    userRepositoryMock.findOne.mockResolvedValue(mockInactiveUser);

    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException (401) cuando el usuario no existe en la base de datos', async () => {
    // Caso 3: Usuario inexistente o eliminado
    userRepositoryMock.findOne.mockResolvedValue(null);

    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
