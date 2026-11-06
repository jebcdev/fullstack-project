import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { SeedService } from './seed.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

describe('SeedService (Unit Tests)', () => {
  let seedService: SeedService;
  let userRepositoryMock: any;
  let dataSourceMock: any;

  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.SEED_USERS_PASSWORD = 'TestSeedPassword123!';

    userRepositoryMock = {
      query: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((users) => users),
      save: jest.fn().mockImplementation((users) =>
        Promise.resolve(
          users.map((u: any, idx: number) => ({
            id: `uuid-seed-${idx + 1}`,
            ...u,
          })),
        ),
      ),
    };

    dataSourceMock = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepositoryMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    seedService = module.get<SeedService>(SeedService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('debe limpiar la tabla de usuarios, sembrar 3 usuarios (ADMIN, USER, GUEST) con password hasheado y no exponer password en retorno', async () => {
    // Act
    const result = await seedService.executeSeed();

    // Assert
    // 1. Debe borrar la tabla users
    expect(userRepositoryMock.query).toHaveBeenCalledWith('DELETE FROM "users";');

    // 2. Debe crear exactamente 3 usuarios
    expect(userRepositoryMock.create).toHaveBeenCalled();
    const createdUsersArg = userRepositoryMock.create.mock.calls[0][0];
    expect(createdUsersArg).toHaveLength(3);

    const roles = createdUsersArg.map((u: any) => u.role);
    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.USER);
    expect(roles).toContain(UserRole.GUEST);

    const emails = createdUsersArg.map((u: any) => u.email);
    expect(emails).toContain('admin@email.com');
    expect(emails).toContain('user@email.com');
    expect(emails).toContain('guest@email.com');

    // 3. Verifica que la contraseña esté hasheada con bcrypt
    for (const u of createdUsersArg) {
      const match = await bcrypt.compare('TestSeedPassword123!', u.password);
      expect(match).toBe(true);
      expect(u.isActive).toBe(true);
    }

    // 4. Retorno del servicio sanitizado
    expect(result.count).toBe(3);
    expect(result.users).toHaveLength(3);
    for (const user of result.users) {
      expect((user as any).password).toBeUndefined();
    }
  });
});
