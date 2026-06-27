# User Implementation Guide

This document provides a complete technical guide for implementing the User module. Users are the core entity of the system — they can authenticate via email/password or social providers (Google, Facebook, Apple), have roles (`ADMIN` or `USER`), and own addresses, orders, cart items, wishlists, and audit logs.

## Table of Contents
1. [Schema Design](#schema-design)
2. [Module Structure](#module-structure)
3. [DTOs](#dtos)
4. [Controller Implementation](#controller-implementation)
5. [Service Implementation](#service-implementation)
6. [API Flow](#api-flow)
7. [Frontend Integration](#frontend-integration)
8. [Rules & Regulations](#rules--regulations)

---

## Schema Design

### User Model
```prisma
model User {
  id            String     @id @default(uuid())
  firstName     String?
  lastName      String?
  email         String     @unique
  phone         String?
  password      String?
  provider      Provider   @default(EMAIL)
  providerId    String?
  avatar        String?
  role          Role       @default(USER)
  emailVerified Boolean    @default(false)
  status        UserStatus @default(ACTIVE)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  deletedAt     DateTime?

  // Relations
  addresses Address[]
  orders    Order[]
  cart      Cart?
  wishlists Wishlist[]
  auditLogs AuditLog[]

  @@index([email])
  @@index([phone])
}
```

### Enums Used
```prisma
enum Role {
  ADMIN
  USER
}

enum Provider {
  EMAIL
  GOOGLE
  FACEBOOK
  APPLE
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}
```

**Key Points:**
- `email` is unique and used as the primary login identifier
- `password` is optional — social login users (Google, Facebook, Apple) do not have passwords
- `provider` tracks the authentication method — defaults to `EMAIL`
- `providerId` stores the external user ID from social providers (e.g., Google sub)
- `role` determines permissions: `ADMIN` has full access, `USER` has limited access
- `status` controls account state: `ACTIVE`, `INACTIVE`, or `SUSPENDED`
- `emailVerified` tracks whether the user has verified their email address
- `deletedAt` enables soft delete — users are never physically removed
- Users have relations to `Address`, `Order`, `Cart`, `Wishlist`, and `AuditLog`

---

## Module Structure

### User Module
```typescript
// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

**Registration in AppModule:**
The `UserModule` must be imported in [`src/app.module.ts`](src/app.module.ts):
```typescript
import { UserModule } from './user/user.module';

@Module({
  imports: [
    // ... other modules
    UserModule,
    // ... other modules
  ],
})
export class AppModule {}
```

---

## DTOs

### CreateUserDto
```typescript
// src/user/dto/create-user.dto.ts
import {
  IsEmail, IsNotEmpty, IsOptional, IsEnum, MinLength,
  IsString, IsPhoneNumber,
} from 'class-validator';
import { Role, Provider, UserStatus } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.USER;

  @IsEnum(Provider)
  @IsOptional()
  provider?: Provider = Provider.EMAIL;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus = UserStatus.ACTIVE;
}
```

### UpdateUserDto
```typescript
// src/user/dto/update-user.dto.ts
import {
  IsEmail, IsOptional, IsEnum, IsString, IsPhoneNumber,
} from 'class-validator';
import { Role, UserStatus } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
```

**Validation Rules:**
- `email` is required on creation and must be a valid email format
- `password` is optional on creation — required only for email/password authentication
- `password` must be at least 6 characters if provided (`@MinLength(6)`)
- `role` defaults to `USER` on creation — only admins can create other admins
- `provider` defaults to `EMAIL` — social login users have different providers
- `status` defaults to `ACTIVE` on creation
- All other fields are optional

---

## Controller Implementation

### User Controller
```typescript
// src/user/user.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Create a new user
   * Access: Admins only
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateUserDto, @Request() req: RequestWithUser) {
    return this.userService.create(dto, req.user.id, req.user.role);
  }

  /**
   * Get all users
   * Access: Admins only
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll(@Request() req: RequestWithUser) {
    return this.userService.findAll(req.user.id, req.user.role);
  }

  /**
   * Get a single user by ID
   * Access: Users can view their own profile, admins can view any
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.userService.findOne(id, req.user.id, req.user.role);
  }

  /**
   * Update a user
   * Access: Users can update their own profile, admins can update any
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: RequestWithUser,
  ) {
    return this.userService.update(id, dto, req.user.id, req.user.role);
  }

  /**
   * Delete a user
   * Access: Admins only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.userService.remove(id, req.user.id, req.user.role);
  }
}
```

---

## Service Implementation

### User Service
```typescript
// src/user/user.service.ts
import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user
   * Security: Only admins can create users with different roles
   */
  async create(
    dto: CreateUserDto,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Omit<User, 'password'>;
  }> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Only admins can create users with roles other than USER
    if (
      dto.role &&
      dto.role !== Role.USER &&
      requestingUserRole !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'Only administrators can create admin users',
      );
    }

    // Hash password if provided (for email/password auth)
    let hashedPassword: string | undefined;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        password: hashedPassword,
        provider: dto.provider || 'EMAIL',
        providerId: dto.providerId,
        avatar: dto.avatar,
        role: dto.role || Role.USER,
        status: dto.status || UserStatus.ACTIVE,
      },
    });

    // Return user without password
    const { password: _pwd, ...userWithoutPassword } = user;

    return {
      message: 'User created successfully',
      status: 'success',
      data: userWithoutPassword,
    };
  }

  /**
   * Get all users
   * Security: Admins only
   */
  async findAll(
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Omit<User, 'password'>[];
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can view all users');
    }

    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    // Remove passwords from response
    const usersWithoutPassword = users.map((u) => {
      const { password, ...rest } = u;
      return rest;
    });

    return {
      message:
        users.length > 0 ? 'Users retrieved successfully' : 'No users found',
      status: 'success',
      data: usersWithoutPassword,
    };
  }

  /**
   * Get a single user by ID
   * Security: Users can view their own profile, admins can view any
   */
  async findOne(
    id: string,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Omit<User, 'password'>;
  }> {
    // Users can only view their own profile unless they're admin
    if (requestingUserRole !== Role.ADMIN && requestingUserId !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }

    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return {
      message: 'User retrieved successfully',
      status: 'success',
      data: userWithoutPassword,
    };
  }

  /**
   * Update a user
   * Security: Users can update their own profile, admins can update any
   */
  async update(
    id: string,
    dto: UpdateUserDto,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Omit<User, 'password'>;
  }> {
    // Users can only update their own profile unless they're admin
    if (requestingUserRole !== Role.ADMIN && requestingUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Only admins can change roles
    if (dto.role && requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can change user roles');
    }

    // Only admins can change status
    if (dto.status && requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can change user status',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // If email is being changed, check if it's already taken
    if (dto.email && dto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    // If password is being changed, hash it
    const updateData: {
      email?: string;
      password?: string;
      role?: Role;
      status?: UserStatus;
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatar?: string;
    } = {};
    if (dto.email) updateData.email = dto.email;
    if (dto.firstName) updateData.firstName = dto.firstName;
    if (dto.lastName) updateData.lastName = dto.lastName;
    if (dto.phone) updateData.phone = dto.phone;
    if (dto.avatar) updateData.avatar = dto.avatar;
    if (dto.password) updateData.password = await bcrypt.hash(dto.password, 10);
    if (dto.role) updateData.role = dto.role;
    if (dto.status) updateData.status = dto.status;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { password: _pwd, ...userWithoutPassword } = user;

    return {
      message: 'User updated successfully',
      status: 'success',
      data: userWithoutPassword,
    };
  }

  /**
   * Delete a user (soft delete)
   * Security: Admins only
   */
  async remove(
    id: string,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can delete users');
    }

    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent admin from deleting themselves
    if (id === requestingUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'User deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
```

---

## API Flow

### 1. Create User
**Endpoint:** `POST /api/users`  
**Authentication:** Required (Admin only)  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+8801712345678",
  "password": "securePassword123",
  "role": "USER",
  "provider": "EMAIL",
  "avatar": "https://example.com/avatar.png",
  "status": "ACTIVE"
}
```

**Rules:**
- `email` is required and must be unique
- `password` is optional — if provided, it is hashed with bcrypt (10 rounds)
- Only admins can create users with `role: ADMIN`
- Non-admin users can only create users with `role: USER`
- `provider` defaults to `EMAIL` — social login users are typically created via the auth flow
- `status` defaults to `ACTIVE`

**Success Response (201):**
```json
{
  "message": "User created successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "newuser@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+8801712345678",
    "provider": "EMAIL",
    "providerId": null,
    "avatar": "https://example.com/avatar.png",
    "role": "USER",
    "emailVerified": false,
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "deletedAt": null
  }
}
```

**Important:** The `password` field is **never** returned in the response.

### 2. Get All Users
**Endpoint:** `GET /api/users`  
**Authentication:** Required (Admin only)

**Rules:**
- Only admins can view all users
- Returns only non-deleted users (`deletedAt: null`)
- Results are ordered by `createdAt` descending (newest first)
- Passwords are stripped from all responses

### 3. Get User by ID
**Endpoint:** `GET /api/users/{id}`  
**Authentication:** Required (any authenticated user)

**Rules:**
- Regular users can only view their own profile (`id` must match their own `id`)
- Admins can view any user's profile
- Returns `404 Not Found` if the user does not exist or is soft-deleted
- Returns `403 Forbidden` if a regular user tries to view another user's profile
- Passwords are stripped from the response

### 4. Update User
**Endpoint:** `PATCH /api/users/{id}`  
**Authentication:** Required (any authenticated user)  
**Content-Type:** `application/json`

**Request Body (all fields optional):**
```json
{
  "email": "updated@example.com",
  "firstName": "John Updated",
  "lastName": "Doe",
  "phone": "+8801799999999",
  "password": "newSecurePassword456",
  "avatar": "https://example.com/new-avatar.png",
  "role": "ADMIN",
  "status": "INACTIVE"
}
```

**Rules:**
- Regular users can only update their own profile
- Admins can update any user's profile
- Only admins can change `role` — returns `403 Forbidden` if a regular user tries
- Only admins can change `status` — returns `403 Forbidden` if a regular user tries
- If `email` is changed, it must remain unique — returns `409 Conflict` if already in use
- If `password` is changed, it is hashed with bcrypt before storing
- Returns `404 Not Found` if the user does not exist or is soft-deleted

### 5. Delete User
**Endpoint:** `DELETE /api/users/{id}`  
**Authentication:** Required (Admin only)

**Rules:**
- Only admins can delete users
- Admins **cannot** delete their own account — returns `403 Forbidden`
- Performs soft delete — sets `deletedAt` to current timestamp
- Returns `404 Not Found` if the user does not exist or is already soft-deleted

---

## Frontend Integration

### User Profile Page
```javascript
// Get current user's profile
const response = await fetch('/api/users/me', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Note: The API uses /api/users/{id}, so you need the user's ID
// Typically stored after login
const { data: user } = await response.json();
console.log(user.email, user.firstName, user.avatar);
```

### Admin User Management
```javascript
// Get all users (admin only)
const response = await fetch('/api/users', {
  headers: {
    Authorization: `Bearer ${adminToken}`,
  },
});

const { data: users } = await response.json();

// Create a new user (admin only)
const newUser = {
  email: 'newuser@example.com',
  firstName: 'Jane',
  lastName: 'Smith',
  password: 'securePass123',
  role: 'USER',
};

const createResponse = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify(newUser),
});
```

### Updating User Profile
```javascript
// User updates their own profile
const updatedData = {
  firstName: 'Updated Name',
  phone: '+8801712345678',
  avatar: 'https://example.com/new-avatar.png',
};

const response = await fetch(`/api/users/${userId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(updatedData),
});
```

### Social Login Note
Users created via social login (Google, Facebook, Apple) typically:
- Do not have a `password`
- Have `provider` set to `GOOGLE`, `FACEBOOK`, or `APPLE`
- Have `providerId` set to the external user ID
- Are created through the auth flow, not through `POST /api/users`

---

## Rules & Regulations

### General Rules

1. **Authentication & Authorization**
   - All endpoints require JWT authentication (`JwtAuthGuard` at class level)
   - `POST /api/users` (create) and `GET /api/users` (list) require **Admin** role
   - `GET /api/users/{id}` (detail) allows users to view their own profile or admins to view any
   - `PATCH /api/users/{id}` (update) allows users to update their own profile or admins to update any
   - `DELETE /api/users/{id}` requires **Admin** role

2. **Password Security**
   - Passwords are **never** returned in API responses
   - Passwords are hashed using `bcrypt` with 10 salt rounds before storage
   - When updating a user, if `password` is provided, it is automatically hashed
   - Social login users (Google, Facebook, Apple) do not have passwords — `password` field is `null`

3. **Email Uniqueness**
   - `email` must be unique across all users
   - On creation: returns `409 Conflict` if email already exists
   - On update: returns `409 Conflict` if the new email is already in use by another user
   - Email is used as the primary login identifier

4. **Role Management**
   - Default role on creation is `USER`
   - Only admins can create users with `role: ADMIN`
   - Only admins can change a user's role
   - Regular users cannot elevate their own role — returns `403 Forbidden`

5. **Status Management**
   - `status` uses the `UserStatus` enum: `ACTIVE`, `INACTIVE`, `SUSPENDED`
   - Default status on creation is `ACTIVE`
   - Only admins can change a user's status
   - Regular users cannot change their own status — returns `403 Forbidden`

6. **Self-Protection Rules**
   - Users can view and update their own profile
   - Users **cannot** delete their own account via the API — returns `403 Forbidden`
   - Admins **cannot** delete their own account — returns `403 Forbidden`
   - This prevents accidental lockout of admin accounts

7. **Soft Delete Pattern**
   - Users use soft delete via the `deletedAt` field
   - Deleted users are excluded from list and detail queries
   - Soft-deleted users cannot be deleted again — returns `404 Not Found`
   - Related data (orders, addresses, etc.) remains in the database

8. **Social Login Support**
   - `provider` tracks the authentication method: `EMAIL`, `GOOGLE`, `FACEBOOK`, `APPLE`
   - `providerId` stores the external user ID from social providers
   - Social login users are typically created through the auth flow, not via `POST /api/users`
   - When a social user logs in, the system finds or creates a user with matching `provider` and `providerId`

9. **Input Validation**
   - `email` is validated as a proper email format (`@IsEmail()`)
   - `phone` is validated as a phone number (`@IsPhoneNumber()`) if provided
   - `password` must be at least 6 characters (`@MinLength(6)`) if provided
   - `role` and `status` are validated against their respective enums
   - The global `ValidationPipe` handles DTO validation automatically

10. **Response Format**
    - All endpoints return a consistent response structure:
      ```json
      {
        "message": "Operation description",
        "status": "success",
        "data": { ... }
      }
      ```
    - For delete operations, `data` is always `null`
    - The `password` field is **always** stripped from user responses

11. **What NOT to Do**
    - **Do NOT** return the `password` field in any API response
    - **Do NOT** store plain-text passwords — always use bcrypt hashing
    - **Do NOT** allow non-admin users to create admin users
    - **Do NOT** allow non-admin users to change roles or status
    - **Do NOT** allow users to delete their own accounts
    - **Do NOT** allow admins to delete their own accounts
    - **Do NOT** skip email uniqueness checks
    - **Do NOT** use `PrismaService` directly in controllers — always go through the service layer
    - **Do NOT** expose raw Prisma errors to the client — use NestJS exception types

12. **Testing Considerations**
    - Test email uniqueness by attempting to create two users with the same email
    - Test role restrictions by attempting to create an admin user as a non-admin
    - Test self-protection by attempting to delete your own account
    - Test profile access by attempting to view another user's profile as a regular user
    - Test password hashing by verifying that stored passwords are not plain text
    - Test that passwords are never returned in API responses
    - Test email change conflict by changing to an email that already exists
