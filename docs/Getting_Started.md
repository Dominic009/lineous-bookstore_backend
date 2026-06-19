# Getting Started with This Backend Template

This repository is a cleaned NestJS backend starter. It currently provides authentication, JWT authorization, role-based access control, and user management. It does **not** currently include a complete e-commerce API.

The current source of truth is the code in [`src`](src/main.ts:1), the Prisma schema in [`prisma/schema.prisma`](prisma/schema.prisma:1), and the scripts in [`package.json`](package.json:1).

---

## Project Summary

### Built with

- NestJS backend
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication
- bcrypt password hashing
- Passport JWT strategy
- Role-based access control
- DTO validation with `class-validator`

### Current built-in capabilities

This template currently includes:

- Public signup
- Public login
- Admin-only login
- JWT access token generation
- Password hashing with bcrypt
- Role-based access control
- Admin user creation
- Admin user listing
- User self-profile access
- Admin profile access for any user
- User self-update
- Admin update for any user
- Admin user deletion
- Prevention of admin self-deletion
- Global request validation
- Global `/api` route prefix
- CORS enabled for all origins
- Basic Jest unit and e2e test scaffolding

---

## Current Project Structure

| Area              | File                                                             | Purpose                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| App bootstrap     | [`src/main.ts`](src/main.ts:1)                                   | Starts the NestJS app, adds `/api` prefix, validation, body limits, and CORS.                                                                        |
| Root module       | [`src/app.module.ts`](src/app.module.ts:1)                       | Registers [`PrismaModule`](src/prisma/prisma.module.ts:1), [`AuthModule`](src/auth/auth.module.ts:1), and [`UserModule`](src/user/user.module.ts:1). |
| App route         | [`src/app.controller.ts`](src/app.controller.ts:1)               | Provides `GET /api`.                                                                                                                                 |
| Auth controller   | [`src/auth/auth.controller.ts`](src/auth/auth.controller.ts:1)   | Exposes signup, login, and admin login routes.                                                                                                       |
| Auth service      | [`src/auth/auth.service.ts`](src/auth/auth.service.ts:1)         | Handles signup, login, admin login, password hashing, and JWT creation.                                                                              |
| JWT strategy      | [`src/auth/jwt.strategy.ts`](src/auth/jwt.strategy.ts:1)         | Reads Bearer JWT tokens and loads the user from the database.                                                                                        |
| JWT guard         | [`src/auth/jwt-auth.guard.ts`](src/auth/jwt-auth.guard.ts:1)     | Protects authenticated routes.                                                                                                                       |
| Roles guard       | [`src/auth/roles.guard.ts`](src/auth/roles.guard.ts:1)           | Checks role requirements for protected routes.                                                                                                       |
| Roles decorator   | [`src/auth/roles.decorator.ts`](src/auth/roles.decorator.ts:1)   | Defines the `@Roles()` decorator.                                                                                                                    |
| User controller   | [`src/user/user.controller.ts`](src/user/user.controller.ts:1)   | Exposes user CRUD routes.                                                                                                                            |
| User service      | [`src/user/user.service.ts`](src/user/user.service.ts:1)         | Implements user create, list, get, update, and delete logic.                                                                                         |
| Prisma service    | [`src/prisma/prisma.service.ts`](src/prisma/prisma.service.ts:1) | Connects and disconnects the Prisma client.                                                                                                          |
| Database schema   | [`prisma/schema.prisma`](prisma/schema.prisma:1)                 | Defines the actual database models.                                                                                                                  |
| Seed file         | [`prisma/seed.ts`](prisma/seed.ts:1)                             | Currently stale and should be updated before using seed.                                                                                             |
| E2E test scaffold | [`test/app.e2e-spec.ts`](test/app.e2e-spec.ts:1)                 | Basic NestJS e2e test setup.                                                                                                                         |

---

## Database Model

The current Prisma schema is small and focused.

Actual models/enums:

- [`Role`](prisma/schema.prisma:25)
  - `ADMIN`
  - `USER`

- [`User`](prisma/schema.prisma:36)
  - `id`
  - `email`
  - `password`
  - `role`
  - `createdAt`
  - `updatedAt`

The database provider is PostgreSQL, configured through `DATABASE_URL` in [`prisma/schema.prisma`](prisma/schema.prisma:16).

---

## Application Startup

The app starts from [`src/main.ts`](src/main.ts:1).

Current runtime behavior:

- Adds global `/api` prefix using [`app.setGlobalPrefix('api')`](src/main.ts:13).
- Sets JSON body limit using [`express.json({ limit: '10mb' })`](src/main.ts:16).
- Sets URL-encoded body limit using [`express.urlencoded({ extended: true, limit: '10mb' })`](src/main.ts:17).
- Applies global validation using [`ValidationPipe`](src/main.ts:20).
- Enables CORS for all origins using [`app.enableCors()`](src/main.ts:32).
- Starts on `0.0.0.0` using [`app.listen(port, '0.0.0.0')`](src/main.ts:35).
- Defaults to port `5000` using [`process.env.PORT \|\| 5000`](src/main.ts:34).

---

## Environment Setup

Create an environment file for local development.

Recommended variables:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/your_database_name"
JWT_SECRET="change-this-to-a-strong-random-secret"
PORT=5000
```

Important notes:

- `DATABASE_URL` is required by [`prisma/schema.prisma`](prisma/schema.prisma:16).
- `JWT_SECRET` is used by [`src/auth/auth.module.ts`](src/auth/auth.module.ts:18).
- `PORT` is read by [`src/main.ts`](src/main.ts:34).
- Do not use the fallback JWT secret in production. The current fallback is visible in [`src/auth/auth.module.ts`](src/auth/auth.module.ts:18).
- CORS is currently open to all origins in [`src/main.ts`](src/main.ts:32). Restrict this before production.

---

## Install Dependencies

```bash
npm install
```

---

## Generate Prisma Client

```bash
npx prisma generate
```

---

## Create and Apply the First Migration

This project currently only has [`migration_lock.toml`](prisma/migrations/migration_lock.toml:1), so you should create a real initial migration.

```bash
npx prisma migrate dev --name init
```

This creates the `User` table based on [`prisma/schema.prisma`](prisma/schema.prisma:1).

---

## Important Seed Warning

Do **not** run `npx prisma db seed` until [`prisma/seed.ts`](prisma/seed.ts:1) is updated.

Current issue:

- [`prisma/seed.ts`](prisma/seed.ts:5) imports e-commerce enums such as `OrderStatus` and `ImageType`.
- [`prisma/seed.ts`](prisma/seed.ts:36) uses `Role.CUSTOMER`.
- The current [`Role`](prisma/schema.prisma:25) enum only has `ADMIN` and `USER`.
- The current schema does not include product, category, order, address, variant, attribute, or image models.

Recommended fix:

- Replace [`prisma/seed.ts`](prisma/seed.ts:1) with a simple seed that only creates users, or
- Remove the seed script from [`package.json`](package.json:70) until the full domain schema is implemented.

---

## Start the Server

Use this script from [`package.json`](package.json:12):

```bash
npm run start:dev
```

The API will be available at:

```bash
http://localhost:5000/api
```

Do not use `npm run dev`. There is no `dev` script in [`package.json`](package.json:8).

---

## Available Scripts

| Script           | Command                          | Purpose                                 |
| ---------------- | -------------------------------- | --------------------------------------- |
| Build            | [`build`](package.json:9)        | Compiles the NestJS app.                |
| Format           | [`format`](package.json:10)      | Formats TypeScript files with Prettier. |
| Start            | [`start`](package.json:11)       | Starts the compiled NestJS app.         |
| Dev server       | [`start:dev`](package.json:12)   | Starts with watch mode.                 |
| Debug server     | [`start:debug`](package.json:13) | Starts with debug and watch mode.       |
| Production start | [`start:prod`](package.json:14)  | Runs compiled app from `dist/main`.     |
| Lint             | [`lint`](package.json:15)        | Runs ESLint with auto-fix.              |
| Unit tests       | [`test`](package.json:16)        | Runs Jest unit tests.                   |
| Test watch       | [`test:watch`](package.json:17)  | Runs Jest in watch mode.                |
| Coverage         | [`test:cov`](package.json:18)    | Runs Jest with coverage.                |
| Debug tests      | [`test:debug`](package.json:19)  | Runs Jest in debug mode.                |
| E2E tests        | [`test:e2e`](package.json:20)    | Runs Jest e2e tests.                    |

---

## Built-in API Endpoints

All routes use the global `/api` prefix from [`src/main.ts`](src/main.ts:13).

### Public endpoints

| Method | Endpoint                | Purpose                                      | Implemented by                                                  |
| ------ | ----------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| `GET`  | `/api`                  | Health/root response. Returns `Hello World!` | [`AppController.getHello()`](src/app.controller.ts:8)           |
| `POST` | `/api/auth/signup`      | Create a new user account                    | [`AuthController.signUp()`](src/auth/auth.controller.ts:11)     |
| `POST` | `/api/auth/login`       | Login as any valid user                      | [`AuthController.login()`](src/auth/auth.controller.ts:21)      |
| `POST` | `/api/auth/admin/login` | Login only if the user has `ADMIN` role      | [`AuthController.adminLogin()`](src/auth/auth.controller.ts:16) |

### Protected user endpoints

All user routes require JWT authentication through [`JwtAuthGuard`](src/auth/jwt-auth.guard.ts:5). The whole [`UserController`](src/user/user.controller.ts:32) is protected with [`@UseGuards(JwtAuthGuard)`](src/user/user.controller.ts:33).

| Method   | Endpoint         | Access               | Purpose           | Implemented by                                               |
| -------- | ---------------- | -------------------- | ----------------- | ------------------------------------------------------------ |
| `POST`   | `/api/users`     | Admin only           | Create a new user | [`UserController.create()`](src/user/user.controller.ts:41)  |
| `GET`    | `/api/users`     | Admin only           | List all users    | [`UserController.findAll()`](src/user/user.controller.ts:52) |
| `GET`    | `/api/users/:id` | Own profile or admin | Get one user      | [`UserController.findOne()`](src/user/user.controller.ts:63) |
| `PATCH`  | `/api/users/:id` | Own profile or admin | Update one user   | [`UserController.update()`](src/user/user.controller.ts:75)  |
| `DELETE` | `/api/users/:id` | Admin only           | Delete one user   | [`UserController.remove()`](src/user/user.controller.ts:88)  |

---

## Authentication Behavior

Authentication is handled by [`AuthModule`](src/auth/auth.module.ts:1), [`AuthController`](src/auth/auth.controller.ts:7), and [`AuthService`](src/auth/auth.service.ts:15).

### Signup

Endpoint:

```bash
POST /api/auth/signup
```

Implemented by:

- [`AuthController.signUp()`](src/auth/auth.controller.ts:11)
- [`AuthService.signUp()`](src/auth/auth.service.ts:79)

Request body:

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

Signup validation is defined in [`SignUpDto`](src/auth/dto/signup.dto.ts:3):

- Email must be valid.
- Password must be at least 8 characters.
- Password must include uppercase, lowercase, and number.

Signup behavior:

- Checks if email already exists.
- Hashes the password with bcrypt.
- Creates the user with `USER` role.
- Returns `success`, `message`, and user data without password.

### Login

Endpoint:

```bash
POST /api/auth/login
```

Implemented by:

- [`AuthController.login()`](src/auth/auth.controller.ts:21)
- [`AuthService.login()`](src/auth/auth.service.ts:50)

Request body:

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

Login behavior:

- Finds the user by email.
- Compares the submitted password with the hashed password.
- Creates a JWT payload with `sub` and `role`.
- Returns `accessToken` and user data.

### Admin login

Endpoint:

```bash
POST /api/auth/admin/login
```

Implemented by:

- [`AuthController.adminLogin()`](src/auth/auth.controller.ts:16)
- [`AuthService.adminLogin()`](src/auth/auth.service.ts:21)

Admin login behavior:

- Finds the user by email.
- Requires the user role to be `ADMIN`.
- Compares the submitted password with the hashed password.
- Returns `accessToken` and user data.

### JWT configuration

JWT configuration is in [`AuthModule`](src/auth/auth.module.ts:1):

- Secret comes from `JWT_SECRET`.
- Fallback secret is currently `'secret'`.
- Token expiration is hardcoded to `1d`.
- JWT strategy is implemented in [`JwtStrategy`](src/auth/jwt.strategy.ts:12).

---

## Authorization Behavior

Authorization uses role-based access control.

Key files:

- [`Roles`](src/auth/roles.decorator.ts:5)
- [`RolesGuard`](src/auth/roles.guard.ts:9)

Current roles:

- [`Role.ADMIN`](prisma/schema.prisma:26)
- [`Role.USER`](prisma/schema.prisma:27)

Admin-only routes:

- [`POST /api/users`](src/user/user.controller.ts:41)
- [`GET /api/users`](src/user/user.controller.ts:52)
- [`DELETE /api/users/:id`](src/user/user.controller.ts:88)

---

## User Management Behavior

User management is handled by [`UserModule`](src/user/user.module.ts:1), [`UserController`](src/user/user.controller.ts:32), and [`UserService`](src/user/user.service.ts:14).

### Create user

Endpoint:

```bash
POST /api/users
```

Access:

- Admin only

Implemented by:

- [`UserController.create()`](src/user/user.controller.ts:41)
- [`UserService.create()`](src/user/user.service.ts:21)

DTO:

- [`CreateUserDto`](src/user/dto/create-user.dto.ts:10)

Behavior:

- Requires email and password.
- Password must be at least 6 characters.
- Optional role defaults to `USER`.
- Hashes password before saving.
- Prevents duplicate email.
- Returns user data without password.

### List users

Endpoint:

```bash
GET /api/users
```

Access:

- Admin only

Implemented by:

- [`UserController.findAll()`](src/user/user.controller.ts:52)
- [`UserService.findAll()`](src/user/user.service.ts:76)

Behavior:

- Lists all users.
- Orders users by newest first using `createdAt`.
- Removes password from every returned user.

### Get one user

Endpoint:

```bash
GET /api/users/:id
```

Access:

- Users can view their own profile.
- Admins can view any user.

Implemented by:

- [`UserController.findOne()`](src/user/user.controller.ts:63)
- [`UserService.findOne()`](src/user/user.service.ts:112)

Behavior:

- Blocks non-admin users from viewing other users.
- Returns user data without password.

### Update user

Endpoint:

```bash
PATCH /api/users/:id
```

Access:

- Users can update their own profile.
- Admins can update any user.

Implemented by:

- [`UserController.update()`](src/user/user.controller.ts:75)
- [`UserService.update()`](src/user/user.service.ts:150)

DTO:

- [`UpdateUserDto`](src/user/dto/update-user.dto.ts:4)

Behavior:

- Allows email update.
- Allows password update.
- Allows role update only by admin.
- Checks email uniqueness when email changes.
- Hashes password before saving.
- Returns user data without password.

### Delete user

Endpoint:

```bash
DELETE /api/users/:id
```

Access:

- Admin only

Implemented by:

- [`UserController.remove()`](src/user/user.controller.ts:88)
- [`UserService.remove()`](src/user/user.service.ts:214)

Behavior:

- Blocks non-admin users.
- Blocks admin from deleting their own account.
- Deletes the user if all checks pass.

---

## Validation

The app uses global validation from [`ValidationPipe`](src/main.ts:20).

Validation behavior:

- Transforms incoming payloads.
- Enables implicit type conversion.
- Whitelists allowed DTO fields.
- Rejects unknown fields.

DTOs:

- [`SignUpDto`](src/auth/dto/signup.dto.ts:3)
- [`CreateUserDto`](src/user/dto/create-user.dto.ts:10)
- [`UpdateUserDto`](src/user/dto/update-user.dto.ts:4)

---

## Testing

Basic test scaffolding exists.

Commands:

```bash
npm test
npm run test:e2e
```

Relevant scripts:

- [`test`](package.json:16)
- [`test:e2e`](package.json:20)

Relevant test file:

- [`test/app.e2e-spec.ts`](test/app.e2e-spec.ts:7)

---

## What This Template Does Not Include Right Now

This cleaned project does **not** currently include:

- Product APIs
- Category APIs
- Order APIs
- Address APIs
- Product variant APIs
- Attribute APIs
- Attribute value APIs
- Image APIs
- Checkout flow
- Payment integration
- Refresh tokens
- Password reset
- Email verification
- File upload endpoints
- A working seed file for the current schema

The current database schema only includes [`User`](prisma/schema.prisma:36) and [`Role`](prisma/schema.prisma:25).

---

## Known Cleanup Items

Before using this as a clean production template, fix these items:

1. Update [`prisma/seed.ts`](prisma/seed.ts:1) so it matches [`prisma/schema.prisma`](prisma/schema.prisma:1).
2. Remove unused dependencies such as [`pdfkit`](package.json:37) if file generation is not needed.
3. Replace the fallback JWT secret in [`src/auth/auth.module.ts`](src/auth/auth.module.ts:18).
4. Restrict CORS in production instead of using [`app.enableCors()`](src/main.ts:32) for all origins.
5. Decide whether the project should keep `ADMIN`/`USER` roles or use another role naming system.
6. Add real migrations if this repository is being reused as a fresh template.
7. Update [`README.md`](README.md:1) to point developers to this getting-started guide.

---

## Recommended Use Cases

This template is a good starting point for:

- Admin backends
- User management systems
- Auth-first NestJS projects
- Internal tools
- SaaS starter backends
- Projects that need JWT auth and RBAC from day one

This template is **not yet ready** as a complete e-commerce backend unless you add the missing domain modules and update the database schema.

---

## Quick First Run Checklist

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

Then test the root endpoint:

```bash
curl http://localhost:5000/api
```

Expected response:

```text
Hello World!
```

Create your first admin manually after migration, or update the seed file before using `npx prisma db seed`.