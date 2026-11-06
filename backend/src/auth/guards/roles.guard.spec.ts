import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';

describe('RolesGuard (Unit Tests)', () => {
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  const createMockExecutionContext = (user?: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('debe permitir acceso si no hay roles requeridos definidos en la ruta', () => {
    // Caso 1: Ruta sin decorador @Roles()
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockExecutionContext();

    const canActivate = rolesGuard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('debe permitir acceso si el usuario autenticado tiene uno de los roles requeridos', () => {
    // Caso 2: El usuario tiene el rol permitido (ej. ADMIN en ruta que requiere ADMIN)
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN]);
    const context = createMockExecutionContext({
      id: 'uuid-admin',
      role: UserRole.ADMIN,
    });

    const canActivate = rolesGuard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('debe denegar acceso (ForbiddenException 403) si el rol del usuario no coincide con el requerido', () => {
    // Caso 3: Usuario con rol USER intentando acceder a ruta ADMIN
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN]);
    const context = createMockExecutionContext({
      id: 'uuid-user',
      role: UserRole.USER,
    });

    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe denegar acceso (ForbiddenException 403) si no existe usuario en la request', () => {
    // Caso 4: No hay usuario autenticado adjunto en la request
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.USER, UserRole.ADMIN]);
    const context = createMockExecutionContext(undefined);

    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });
});
