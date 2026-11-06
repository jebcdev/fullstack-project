import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/users/enums/user-role.enum';
import { User } from '../src/users/entities/user.entity';

describe('App & RBAC End-to-End Tests (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Variables para guardar tokens y credenciales de los diferentes roles
  let adminToken: string;
  let userToken: string;
  let guestToken: string;

  const adminCredentials = {
    email: 'admin.e2e@test.com',
    password: 'Password123!',
    name: 'Admin',
    lastName: 'System',
  };

  const userCredentials = {
    email: 'user.e2e@test.com',
    password: 'UserPassword123!',
    name: 'Normal',
    lastName: 'User',
  };

  const guestCredentials = {
    email: 'guest.e2e@test.com',
    password: 'GuestPassword123!',
    name: 'Guest',
    lastName: 'Person',
  };

  const inactiveCredentials = {
    email: 'inactive.e2e@test.com',
    password: 'InactivePassword123!',
    name: 'Inactive',
    lastName: 'User',
  };

  beforeAll(async () => {
    // Configurar el entorno de prueba para apuntar a la base de datos de test
    process.env.DB_NAME = 'fullstack_project_test';
    process.env.JWT_SECRET = 'super-secret-jwt-key-for-e2e-testing-purposes-123';
    process.env.JWT_EXPIRES_IN = '2h';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Mismo prefijo y pipes que en producción/main.ts
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    dataSource = app.get(DataSource);
    // Limpiar tabla users antes de comenzar las pruebas
    await dataSource.query('DROP TABLE IF EXISTS "users" CASCADE;');
    await dataSource.synchronize(); // Reconstruye esquema fresco
  }, 30000);

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.query('DROP TABLE IF EXISTS "users" CASCADE;');
      await dataSource.destroy();
    }
    if (app) {
      await app.close();
    }
  });

  describe('1. Registro de usuarios (POST /api/v1/auth/register)', () => {
    it('Registro exitoso → 201 Created (Crea usuario con rol USER por defecto e isActive: true)', async () => {
      // Caso: Usuario común se registra a través del endpoint público
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userCredentials)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBe(userCredentials.email);
      expect(response.body.name).toBe(userCredentials.name);
      expect(response.body.lastName).toBe(userCredentials.lastName);
      expect(response.body.role).toBe(UserRole.USER);
      expect(response.body.isActive).toBe(true);
      expect(response.body.password).toBeUndefined(); // Verifica que el password jamás se filtre
    });

    it('Registro con email duplicado → 409 Conflict', async () => {
      // Caso: Intentar registrar el mismo email debe ser rechazado
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userCredentials)
        .expect(409);
    });

    it('Registro con datos inválidos → 400 Bad Request', async () => {
      // Caso: Email malformado o password demasiado corta
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'no-es-email',
          password: '123',
          name: '',
          lastName: '',
        })
        .expect(400);
    });
  });

  describe('2. Autenticación y Login (POST /api/v1/auth/login)', () => {
    beforeAll(async () => {
      // Registrar usuario ADMIN
      const regAdmin = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(adminCredentials);

      // Promoverlo a ADMIN en la BD
      const userRepo = dataSource.getRepository(User);
      await userRepo.update(
        { id: regAdmin.body.id },
        { role: UserRole.ADMIN },
      );

      // Registrar usuario GUEST
      const regGuest = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(guestCredentials);

      await userRepo.update(
        { id: regGuest.body.id },
        { role: UserRole.GUEST },
      );

      // Registrar usuario INACTIVO
      const regInactive = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(inactiveCredentials);

      await userRepo.update(
        { id: regInactive.body.id },
        { isActive: false },
      );
    });

    it('Login exitoso → 200 OK con token de acceso JWT y datos sin password', async () => {
      // Caso: Login correcto con credenciales de USER
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.user.email).toBe(userCredentials.email);
      expect(response.body.user.password).toBeUndefined();

      userToken = response.body.accessToken;

      // Obtener tokens de admin y guest para tests posteriores
      const adminRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminCredentials.email,
          password: adminCredentials.password,
        })
        .expect(200);
      adminToken = adminRes.body.accessToken;

      const guestRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: guestCredentials.email,
          password: guestCredentials.password,
        })
        .expect(200);
      guestToken = guestRes.body.accessToken;
    });

    it('Login con password incorrecto → 401 Unauthorized', async () => {
      // Caso: Credenciales con contraseña errónea
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          password: 'PasswordIncorrecto999',
        })
        .expect(401);
    });

    it('Login con usuario inactivo → 401 Unauthorized', async () => {
      // Caso: Cuenta inactiva (isActive: false) no puede loguearse
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: inactiveCredentials.email,
          password: inactiveCredentials.password,
        })
        .expect(401);
    });
  });

  describe('3. Perfil de Auth (GET /api/v1/auth/profile)', () => {
    it('GET /auth/profile sin token → 401 Unauthorized', async () => {
      // Caso: Intento anónimo sin cabecera Authorization
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('GET /auth/profile con token → 200 OK con datos del usuario sin password', async () => {
      // Caso: Usuario autenticado consulta su perfil
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.email).toBe(userCredentials.email);
      expect(response.body.password).toBeUndefined();
    });
  });

  describe('4. Módulo Público (GET /api/v1/public)', () => {
    it('GET /public sin token → 200 OK (Accesible públicamente)', async () => {
      // Caso: Endpoint accesible por cualquiera sin requerir token
      const response = await request(app.getHttpServer())
        .get('/api/v1/public')
        .expect(200);

      expect(response.body.access).toBe('PUBLIC');
      expect(response.body.status).toBe('success');
    });
  });

  describe('5. Módulo Privado (GET /api/v1/private/users)', () => {
    it('GET /private/users sin token → 401 Unauthorized', async () => {
      // Caso: Petición anónima es rechazada inmediatamente por JwtAuthGuard
      await request(app.getHttpServer())
        .get('/api/v1/private/users')
        .expect(401);
    });

    it('GET /private/users con token GUEST → 403 Forbidden', async () => {
      // Caso: Rol GUEST no posee permisos para acceder a private (requiere USER o ADMIN)
      await request(app.getHttpServer())
        .get('/api/v1/private/users')
        .set('Authorization', `Bearer ${guestToken}`)
        .expect(403);
    });

    it('GET /private/users con token USER → 200 OK', async () => {
      // Caso: Rol USER autorizado para consultar private
      const response = await request(app.getHttpServer())
        .get('/api/v1/private/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('GET /private/users con token ADMIN → 200 OK', async () => {
      // Caso: Rol ADMIN autorizado para consultar private
      const response = await request(app.getHttpServer())
        .get('/api/v1/private/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
    });
  });

  describe('6. CRUD Usuarios (GET & CRUD /api/v1/users - Exclusivo ADMIN)', () => {
    let createdUserIdByAdmin: string;

    it('GET /users con token USER → 403 Forbidden', async () => {
      // Caso: Un usuario con rol USER no puede listar ni administrar usuarios
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('GET /users con token ADMIN → 200 OK', async () => {
      // Caso: Administrador autorizado para listar usuarios del sistema
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      response.body.forEach((u: any) => {
        expect(u.password).toBeUndefined();
      });
    });

    it('POST /users con token ADMIN → 201 Created (Admin crea usuario)', async () => {
      // Caso: Admin crea usuario con rol específico
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'creado.por.admin@test.com',
          name: 'Operador',
          lastName: 'Nuevo',
          password: 'Password123!',
          role: UserRole.GUEST,
          isActive: true,
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBe('creado.por.admin@test.com');
      expect(response.body.role).toBe(UserRole.GUEST);
      expect(response.body.password).toBeUndefined();
      createdUserIdByAdmin = response.body.id;
    });

    it('DELETE /users/:id impidiendo que el admin se elimine a sí mismo → 403 Forbidden', async () => {
      // Caso: Obtener ID del admin desde su token para verificar prevención de autoeliminación
      const profile = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${profile.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('DELETE /users/:id permitiendo al admin eliminar a otro usuario → 200 OK', async () => {
      // Caso: Admin elimina al usuario previamente creado
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${createdUserIdByAdmin}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('7. Módulo Profile (/api/v1/profile)', () => {
    it('GET /profile con token → 200 OK', async () => {
      // Caso: Usuario autenticado obtiene sus datos personales
      const response = await request(app.getHttpServer())
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.email).toBe(userCredentials.email);
      expect(response.body.password).toBeUndefined();
    });

    it('PATCH /profile sin password actual → 400 Bad Request', async () => {
      // Caso: La contraseña actual es un campo requerido por DTO y ValidationPipe
      await request(app.getHttpServer())
        .patch('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'NombreSinPassword',
        })
        .expect(400);
    });

    it('PATCH /profile con password actual incorrecta → 401 Unauthorized', async () => {
      // Caso: Contraseña actual enviada pero incorrecta
      await request(app.getHttpServer())
        .patch('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'PasswordErronea999',
          name: 'NombreNoValido',
        })
        .expect(401);
    });

    it('PATCH /profile con password actual correcta → 200 OK (actualización exitosa)', async () => {
      // Caso: Contraseña actual correcta, actualiza nombre y establece nueva clave
      const response = await request(app.getHttpServer())
        .patch('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: userCredentials.password,
          name: 'NombreActualizado',
          lastName: 'ApellidoActualizado',
          newPassword: 'NuevaPassword456!',
        })
        .expect(200);

      expect(response.body.name).toBe('NombreActualizado');
      expect(response.body.lastName).toBe('ApellidoActualizado');
      expect(response.body.password).toBeUndefined();

      // Probar que el usuario ahora puede loguearse con la nueva contraseña
      const newLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          password: 'NuevaPassword456!',
        })
        .expect(200);

      expect(newLogin.body.accessToken).toBeDefined();
    });
  });
});
