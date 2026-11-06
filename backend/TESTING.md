# Guía de Pruebas y Cobertura (Testing Suite)

Este documento detalla la arquitectura de pruebas, ejecución y cobertura para el backend NestJS con soporte de Roles RBAC y autenticación JWT.

---

## 1. Comandos de Ejecución

Todos los comandos deben ejecutarse utilizando **`pnpm`**:

| Comando | Descripción |
| :--- | :--- |
| `pnpm test` | Ejecuta la suite completa de pruebas unitarias con Jest. |
| `pnpm test:watch` | Ejecuta las pruebas unitarias en modo interactivo/watch. |
| `pnpm test:cov` | Genera el informe detallado de cobertura de código en `./coverage`. |
| `pnpm test:e2e` | Ejecuta la suite de pruebas End-to-End (E2E) con Supertest. |

---

## 2. Pruebas Unitarias (Unit Tests)

Las pruebas unitarias se encuentran en el directorio `src/` junto a sus archivos correspondientes (`*.spec.ts`) y utilizan **mocks** de repositorios TypeORM y servicios dependientes, garantizando ejecución rápida e independiente de la base de datos física:

1. **`src/auth/auth.service.spec.ts` (`AuthService`)**:
   - Registro exitoso de usuario asignando rol `USER` e `isActive: true` por defecto, verificando que la contraseña sea hasheada y nunca expuesta en el retorno.
   - Rechazo de registro ante correos electrónicos duplicados arrojando `ConflictException` (409).
   - Login con credenciales válidas devolviendo `accessToken` firmado y objeto `user` sanitizado.
   - Login con contraseña errónea arrojando `UnauthorizedException` (401).
   - Login bloqueado para usuarios inactivos (`isActive: false`) arrojando `UnauthorizedException` (401).
   - Login con usuario inexistente arrojando `UnauthorizedException` (401).

2. **`src/auth/guards/roles.guard.spec.ts` (`RolesGuard`)**:
   - Permite acceso si el endpoint o controlador no tiene decorador `@Roles()` definido.
   - Permite acceso si el rol del usuario autenticado coincide con los requeridos (`ADMIN`, `USER` o `GUEST`).
   - Deniega el acceso con `ForbiddenException` (403) si el rol no coincide.
   - Deniega el acceso con `ForbiddenException` (403) si no existe usuario autenticado en la petición.

3. **`src/auth/strategies/jwt.strategy.spec.ts` (`JwtStrategy`)**:
   - Valida el payload JWT, busca el usuario por ID y lo retorna exitosamente.
   - Rechaza con `UnauthorizedException` (401) si el usuario tiene `isActive === false`.
   - Rechaza con `UnauthorizedException` (401) si el usuario ya no existe en la base de datos.

4. **`src/users/users.service.spec.ts` (`UsersService`)**:
   - Creación de usuarios con roles arbitrarios, validando email único y encriptación de password.
   - Listado y búsqueda por ID garantizando exclusión total del hash del password.
   - Actualización de atributos, rehasheo condicional de contraseñas y validación de conflicto de email.
   - Eliminación segura impidiendo que un administrador se autoelimine (`ForbiddenException`).

5. **`src/profile/profile.service.spec.ts` (`ProfileService`)**:
   - Obtención del perfil sanitizado a partir de los datos del token.
   - Actualización exitosa verificando la contraseña actual y cifrando opcionalmente la nueva contraseña.
   - Rechazo con `UnauthorizedException` (401) cuando la contraseña actual es errónea.
   - Preservación estricta de `role` e `isActive` impidiendo su modificación desde el perfil personal.

---

## 3. Pruebas End-to-End (E2E Tests)

Ubicadas en `test/app.e2e-spec.ts` y ejecutadas mediante `test/jest-e2e.json` contra una base de datos PostgreSQL de pruebas (`fullstack_project_test`), simulan peticiones HTTP reales a través del servidor Express montado con `ValidationPipe` y prefijo `/api/v1`:

- **Registro Público**:
  - `POST /api/v1/auth/register` → `201 Created`
  - `POST /api/v1/auth/register` (email duplicado) → `409 Conflict`
  - `POST /api/v1/auth/register` (body inválido) → `400 Bad Request`
- **Login**:
  - `POST /api/v1/auth/login` → `200 OK` con JWT
  - `POST /api/v1/auth/login` (password inválido) → `401 Unauthorized`
  - `POST /api/v1/auth/login` (usuario inactivo) → `401 Unauthorized`
- **Perfil de Autenticación**:
  - `GET /api/v1/auth/profile` (sin token) → `401 Unauthorized`
  - `GET /api/v1/auth/profile` (con token) → `200 OK`
- **Módulo Público**:
  - `GET /api/v1/public` (sin token) → `200 OK`
- **Módulo Privado**:
  - `GET /api/v1/private/users` (sin token) → `401 Unauthorized`
  - `GET /api/v1/private/users` (con token GUEST) → `403 Forbidden`
  - `GET /api/v1/private/users` (con token USER) → `200 OK`
  - `GET /api/v1/private/users` (con token ADMIN) → `200 OK`
- **CRUD Users (Solo ADMIN)**:
  - `GET /api/v1/users` (con token USER) → `403 Forbidden`
  - `GET /api/v1/users` (con token ADMIN) → `200 OK`
  - `POST /api/v1/users` (con token ADMIN) → `201 Created`
  - `DELETE /api/v1/users/:id` (admin autoeliminándose) → `403 Forbidden`
  - `DELETE /api/v1/users/:id` (admin eliminando a otro) → `200 OK`
- **Módulo Profile**:
  - `GET /api/v1/profile` (con token) → `200 OK`
  - `PATCH /api/v1/profile` (sin password actual) → `400 Bad Request`
  - `PATCH /api/v1/profile` (password actual errónea) → `401 Unauthorized`
  - `PATCH /api/v1/profile` (password actual válida) → `200 OK` y verificación de inicio de sesión con nueva clave.

---

## 4. Requisitos para Pruebas E2E

Para ejecutar `pnpm test:e2e`, asegúrese de tener PostgreSQL activo con acceso a la base de datos de testing:
```bash
# Crear base de datos de test si no existe
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE fullstack_project_test;"
```
Las suites limpian automáticamente la tabla `users` mediante `synchronize()` antes y después de cada ciclo.
