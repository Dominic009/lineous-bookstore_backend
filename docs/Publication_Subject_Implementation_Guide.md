# Publication & Subject Implementation Guide

This document provides a complete technical guide for implementing the Publication and Subject modules. These are foundational lookup/reference entities used by the Book module and other parts of the system.

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

### Publication Model
```prisma
model Publication {
  id          String     @id @default(uuid())
  name        String
  slug        String     @unique
  description String?
  logo        String?    // URL to publication logo image
  status      BookStatus @default(PUBLISHED)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?

  // Relations
  books Book[]

  @@index([slug])
  @@index([name])
}
```

### Subject Model
```prisma
model Subject {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  // Relations
  books Book[]

  @@index([slug])
  @@index([name])
}
```

**Key Points:**
- Both models use `deletedAt` for soft delete — records are never physically removed from the database
- `slug` is unique and used for URL-friendly identifiers
- `Publication` uses `BookStatus` enum for its `status` field (DRAFT, PUBLISHED, ARCHIVED)
- `Subject` does **not** have a `status` field — all subjects are effectively active unless soft-deleted
- `Publication.logo` stores a URL string (not a Cloudinary upload in the current implementation)
- Both models have a one-to-many relationship with `Book` — a book can belong to one publication and one subject

---

## Module Structure

### Publication Module
```typescript
// src/publication/publication.module.ts
import { Module } from '@nestjs/common';
import { PublicationService } from './publication.service';
import { PublicationController } from './publication.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PublicationController],
  providers: [PublicationService, PrismaService],
  exports: [PublicationService],
})
export class PublicationModule {}
```

### Subject Module
```typescript
// src/subject/subject.module.ts
import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SubjectController],
  providers: [SubjectService, PrismaService],
  exports: [SubjectService],
})
export class SubjectModule {}
```

**Registration in AppModule:**
Both modules must be imported in [`src/app.module.ts`](src/app.module.ts):
```typescript
import { PublicationModule } from './publication/publication.module';
import { SubjectModule } from './subject/subject.module';

@Module({
  imports: [
    // ... other modules
    PublicationModule,
    SubjectModule,
    // ... other modules
  ],
})
export class AppModule {}
```

---

## DTOs

### CreatePublicationDto
```typescript
// src/publication/dto/create-publication.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { BookStatus } from '@prisma/client';

export class CreatePublicationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus = BookStatus.PUBLISHED;
}
```

### UpdatePublicationDto
```typescript
// src/publication/dto/update-publication.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { BookStatus } from '@prisma/client';

export class UpdatePublicationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus;
}
```

### CreateSubjectDto
```typescript
// src/subject/dto/create-subject.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### UpdateSubjectDto
```typescript
// src/subject/dto/update-subject.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

**Validation Rules:**
- `name` and `slug` are required on creation
- `slug` must be unique across all publications/subjects
- All other fields are optional
- `status` for Publication defaults to `PUBLISHED` if not provided
- No file upload validators are needed — `logo` is a plain URL string

---

## Controller Implementation

### Publication Controller
```typescript
// src/publication/publication.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, Request,
} from '@nestjs/common';
import { PublicationService } from './publication.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
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

@Controller('publications')
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  /**
   * Create a new publication
   * Access: Admins only
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreatePublicationDto, @Request() req: RequestWithUser) {
    return this.publicationService.create(dto, req.user.role);
  }

  /**
   * Get all publications
   * Access: Public (non-admins see only non-deleted)
   */
  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.publicationService.findAll(req?.user?.role);
  }

  /**
   * Get a single publication by ID
   * Access: Public (non-admins see only non-deleted)
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.publicationService.findOne(id, req?.user?.role);
  }

  /**
   * Update a publication
   * Access: Admins only
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePublicationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.publicationService.update(id, dto, req.user.role);
  }

  /**
   * Delete a publication (soft delete)
   * Access: Admins only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.publicationService.remove(id, req.user.role);
  }
}
```

### Subject Controller
```typescript
// src/subject/subject.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, Request,
} from '@nestjs/common';
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
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

@Controller('subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  /**
   * Create a new subject
   * Access: Admins only
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateSubjectDto, @Request() req: RequestWithUser) {
    return this.subjectService.create(dto, req.user.role);
  }

  /**
   * Get all subjects
   * Access: Public (non-admins see only non-deleted)
   */
  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.subjectService.findAll(req?.user?.role);
  }

  /**
   * Get a single subject by ID
   * Access: Public (non-admins see only non-deleted)
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.subjectService.findOne(id, req?.user?.role);
  }

  /**
   * Update a subject
   * Access: Admins only
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
    @Request() req: RequestWithUser,
  ) {
    return this.subjectService.update(id, dto, req.user.role);
  }

  /**
   * Delete a subject (soft delete)
   * Access: Admins only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.subjectService.remove(id, req.user.role);
  }
}
```

---

## Service Implementation

### Publication Service
```typescript
// src/publication/publication.service.ts
import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { Publication, Role, BookStatus } from '@prisma/client';

@Injectable()
export class PublicationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new publication
   * Security: Admins only
   */
  async create(
    dto: CreatePublicationDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Publication;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can create publications',
      );
    }

    // Check if slug already exists
    const existingPublication = await this.prisma.publication.findUnique({
      where: { slug: dto.slug },
    });

    if (existingPublication) {
      throw new ConflictException('Publication with this slug already exists');
    }

    const publication = await this.prisma.publication.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        logo: dto.logo,
        status: dto.status || BookStatus.PUBLISHED,
      },
    });

    return {
      message: 'Publication created successfully',
      status: 'success',
      data: publication,
    };
  }

  /**
   * Get all publications
   * Security: Public (for frontend), Admin (for CMS)
   */
  async findAll(requestingUserRole?: Role): Promise<{
    message: string;
    status: string;
    data: Publication[];
  }> {
    const where = requestingUserRole === Role.ADMIN ? {} : { deletedAt: null };

    const publications = await this.prisma.publication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      message:
        publications.length > 0
          ? 'Publications retrieved successfully'
          : 'No publications found',
      status: 'success',
      data: publications,
    };
  }

  /**
   * Get a single publication by ID
   * Security: Public (for frontend), Admin (for CMS)
   */
  async findOne(
    id: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Publication;
  }> {
    const where =
      requestingUserRole === Role.ADMIN ? { id } : { id, deletedAt: null };

    const publication = await this.prisma.publication.findUnique({
      where,
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    return {
      message: 'Publication retrieved successfully',
      status: 'success',
      data: publication,
    };
  }

  /**
   * Update a publication
   * Security: Admins only
   */
  async update(
    id: string,
    dto: UpdatePublicationDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Publication;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can update publications',
      );
    }

    const existingPublication = await this.prisma.publication.findUnique({
      where: { id },
    });

    if (!existingPublication) {
      throw new NotFoundException('Publication not found');
    }

    // If slug is being changed, check if it's already taken
    if (dto.slug && dto.slug !== existingPublication.slug) {
      const slugExists = await this.prisma.publication.findUnique({
        where: { slug: dto.slug },
      });

      if (slugExists) {
        throw new ConflictException('Slug already in use');
      }
    }

    const publication = await this.prisma.publication.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        logo: dto.logo,
        status: dto.status,
      },
    });

    return {
      message: 'Publication updated successfully',
      status: 'success',
      data: publication,
    };
  }

  /**
   * Delete a publication (soft delete)
   * Security: Admins only
   */
  async remove(
    id: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can delete publications',
      );
    }

    const publication = await this.prisma.publication.findUnique({
      where: { id, deletedAt: null },
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    // Soft delete
    await this.prisma.publication.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Publication deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
```

### Subject Service
```typescript
// src/subject/subject.service.ts
import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Subject, Role } from '@prisma/client';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new subject
   * Security: Admins only
   */
  async create(
    dto: CreateSubjectDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Subject;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can create subjects');
    }

    // Check if slug already exists
    const existingSubject = await this.prisma.subject.findUnique({
      where: { slug: dto.slug },
    });

    if (existingSubject) {
      throw new ConflictException('Subject with this slug already exists');
    }

    const subject = await this.prisma.subject.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      },
    });

    return {
      message: 'Subject created successfully',
      status: 'success',
      data: subject,
    };
  }

  /**
   * Get all subjects
   * Security: Public
   */
  async findAll(requestingUserRole?: Role): Promise<{
    message: string;
    status: string;
    data: Subject[];
  }> {
    const where = requestingUserRole === Role.ADMIN ? {} : { deletedAt: null };

    const subjects = await this.prisma.subject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      message:
        subjects.length > 0
          ? 'Subjects retrieved successfully'
          : 'No subjects found',
      status: 'success',
      data: subjects,
    };
  }

  /**
   * Get a single subject by ID
   * Security: Public
   */
  async findOne(
    id: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Subject;
  }> {
    const where =
      requestingUserRole === Role.ADMIN ? { id } : { id, deletedAt: null };

    const subject = await this.prisma.subject.findUnique({
      where,
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return {
      message: 'Subject retrieved successfully',
      status: 'success',
      data: subject,
    };
  }

  /**
   * Update a subject
   * Security: Admins only
   */
  async update(
    id: string,
    dto: UpdateSubjectDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Subject;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can update subjects');
    }

    const existingSubject = await this.prisma.subject.findUnique({
      where: { id },
    });

    if (!existingSubject) {
      throw new NotFoundException('Subject not found');
    }

    // If slug is being changed, check if it's already taken
    if (dto.slug && dto.slug !== existingSubject.slug) {
      const slugExists = await this.prisma.subject.findUnique({
        where: { slug: dto.slug },
      });

      if (slugExists) {
        throw new ConflictException('Slug already in use');
      }
    }

    const subject = await this.prisma.subject.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      },
    });

    return {
      message: 'Subject updated successfully',
      status: 'success',
      data: subject,
    };
  }

  /**
   * Delete a subject (soft delete)
   * Security: Admins only
   */
  async remove(
    id: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can delete subjects');
    }

    const subject = await this.prisma.subject.findUnique({
      where: { id, deletedAt: null },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Soft delete
    await this.prisma.subject.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Subject deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
```

---

## API Flow

### Publication Endpoints

#### 1. Create Publication
**Endpoint:** `POST /api/publications`  
**Authentication:** Required (Admin only)  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "name": "Pearson Education",
  "slug": "pearson-education",
  "description": "A leading publishing company",
  "logo": "https://example.com/logo.png",
  "status": "PUBLISHED"
}
```

**Rules:**
- `name` and `slug` are required
- `slug` must be unique — returns `409 Conflict` if duplicate
- `status` defaults to `PUBLISHED` if not provided
- Only users with `ADMIN` role can create publications

**Success Response (201):**
```json
{
  "message": "Publication created successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Pearson Education",
    "slug": "pearson-education",
    "description": "A leading publishing company",
    "logo": "https://example.com/logo.png",
    "status": "PUBLISHED",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "deletedAt": null
  }
}
```

#### 2. Get All Publications
**Endpoint:** `GET /api/publications`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Admins see all publications including soft-deleted ones
- Non-admins see only publications where `deletedAt` is `null`
- Results are ordered by `createdAt` descending

**Success Response (200):**
```json
{
  "message": "Publications retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Pearson Education",
      "slug": "pearson-education",
      "status": "PUBLISHED",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 3. Get Publication by ID
**Endpoint:** `GET /api/publications/:id`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Admins can view any publication by ID
- Non-admins can only view publications where `deletedAt` is `null`
- Returns `404 Not Found` if publication does not exist or is soft-deleted (for non-admins)

#### 4. Update Publication
**Endpoint:** `PATCH /api/publications/:id`  
**Authentication:** Required (Admin only)  
**Content-Type:** `application/json`

**Request Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "slug": "updated-slug",
  "description": "Updated description",
  "logo": "https://example.com/new-logo.png",
  "status": "ARCHIVED"
}
```

**Rules:**
- Only admins can update publications
- If `slug` is changed, it must remain unique
- Returns `404 Not Found` if publication does not exist
- Returns `409 Conflict` if new slug is already in use

#### 5. Delete Publication
**Endpoint:** `DELETE /api/publications/:id`  
**Authentication:** Required (Admin only)

**Rules:**
- Only admins can delete publications
- Performs soft delete — sets `deletedAt` to current timestamp
- Returns `404 Not Found` if publication does not exist or is already soft-deleted
- The record remains in the database but is excluded from public queries

---

### Subject Endpoints

#### 1. Create Subject
**Endpoint:** `POST /api/subjects`  
**Authentication:** Required (Admin only)  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "name": "Mathematics",
  "slug": "mathematics",
  "description": "All mathematics related books"
}
```

**Rules:**
- `name` and `slug` are required
- `slug` must be unique — returns `409 Conflict` if duplicate
- Subject has no `status` field — all subjects are active unless soft-deleted
- Only users with `ADMIN` role can create subjects

**Success Response (201):**
```json
{
  "message": "Subject created successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Mathematics",
    "slug": "mathematics",
    "description": "All mathematics related books",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "deletedAt": null
  }
}
```

#### 2. Get All Subjects
**Endpoint:** `GET /api/subjects`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Admins see all subjects including soft-deleted ones
- Non-admins see only subjects where `deletedAt` is `null`
- Results are ordered by `createdAt` descending

**Success Response (200):**
```json
{
  "message": "Subjects retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Mathematics",
      "slug": "mathematics",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 3. Get Subject by ID
**Endpoint:** `GET /api/subjects/:id`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Admins can view any subject by ID
- Non-admins can only view subjects where `deletedAt` is `null`
- Returns `404 Not Found` if subject does not exist or is soft-deleted (for non-admins)

#### 4. Update Subject
**Endpoint:** `PATCH /api/subjects/:id`  
**Authentication:** Required (Admin only)  
**Content-Type:** `application/json`

**Request Body (all fields optional):**
```json
{
  "name": "Advanced Mathematics",
  "slug": "advanced-mathematics",
  "description": "Advanced mathematics topics"
}
```

**Rules:**
- Only admins can update subjects
- If `slug` is changed, it must remain unique
- Returns `404 Not Found` if subject does not exist
- Returns `409 Conflict` if new slug is already in use

#### 5. Delete Subject
**Endpoint:** `DELETE /api/subjects/:id`  
**Authentication:** Required (Admin only)

**Rules:**
- Only admins can delete subjects
- Performs soft delete — sets `deletedAt` to current timestamp
- Returns `404 Not Found` if subject does not exist or is already soft-deleted
- The record remains in the database but is excluded from public queries

---

## Frontend Integration

### Fetching Publications for Dropdown
```javascript
// Get all active publications for a dropdown/select
const response = await fetch('/api/publications');
const { data } = await response.json();

// Map to options for a select input
const publicationOptions = data.map(pub => ({
  value: pub.id,
  label: pub.name,
}));
```

### Fetching Subjects for Dropdown
```javascript
// Get all active subjects for a dropdown/select
const response = await fetch('/api/subjects');
const { data } = await response.json();

// Map to options for a select input
const subjectOptions = data.map(sub => ({
  value: sub.id,
  label: sub.name,
}));
```

### Creating a Publication (Admin)
```javascript
const newPublication = {
  name: 'Pearson Education',
  slug: 'pearson-education',
  description: 'A leading publishing company',
  logo: 'https://example.com/logo.png',
  status: 'PUBLISHED',
};

const response = await fetch('/api/publications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify(newPublication),
});

const result = await response.json();
console.log(result.data.id); // Use this ID when creating books
```

### Creating a Subject (Admin)
```javascript
const newSubject = {
  name: 'Mathematics',
  slug: 'mathematics',
  description: 'All mathematics related books',
};

const response = await fetch('/api/subjects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify(newSubject),
});

const result = await response.json();
console.log(result.data.id); // Use this ID when creating books
```

### Updating a Publication (Admin)
```javascript
const updatedData = {
  name: 'Updated Name',
  status: 'ARCHIVED',
};

const response = await fetch('/api/publications/{publicationId}', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify(updatedData),
});
```

### Deleting a Publication (Admin)
```javascript
await fetch('/api/publications/{publicationId}', {
  method: 'DELETE',
  headers: {
    Authorization: `Bearer ${adminToken}`,
  },
});
```

---

## Rules & Regulations

### General Rules

1. **Authentication & Authorization**
   - `GET` (list and detail) endpoints are **public** — no authentication required
   - `POST`, `PATCH`, `DELETE` endpoints require **Admin** role authentication
   - The `OptionalJwtAuthGuard` pattern is used for public endpoints — if a valid token is provided, the user's role is used to determine visibility; if no token is provided, the request is treated as a public (non-admin) request
   - Non-admin users can only see records where `deletedAt` is `null`

2. **Soft Delete Pattern**
   - Both `Publication` and `Subject` use soft delete via the `deletedAt` field
   - Deleted records are **not** physically removed from the database
   - Soft-deleted records are excluded from public queries automatically
   - Admins can still see soft-deleted records in list views
   - A soft-deleted record cannot be deleted again — returns `404 Not Found`

3. **Slug Uniqueness**
   - `slug` must be unique across all publications/subjects
   - On creation: returns `409 Conflict` if slug already exists
   - On update: returns `409 Conflict` if the new slug is already used by another record
   - Slugs are URL-friendly identifiers — use lowercase letters, numbers, and hyphens only

4. **Status Management (Publication Only)**
   - `Publication` has a `status` field using the `BookStatus` enum: `DRAFT`, `PUBLISHED`, `ARCHIVED`
   - Default status on creation is `PUBLISHED`
   - `Subject` does **not** have a status field — all subjects are active unless soft-deleted

5. **Logo Field (Publication Only)**
   - `Publication.logo` stores a plain URL string
   - Unlike `Book.thumbnail`, the logo is **not** uploaded via Cloudinary in the current implementation
   - The frontend or admin should provide a fully qualified URL
   - If logo management with Cloudinary is needed later, a separate upload endpoint should be added

6. **Relation Integrity**
   - Both `Publication` and `Subject` have a one-to-many relationship with `Book`
   - A book references a publication via `publicationId` and a subject via `subjectId`
   - **Do NOT** delete a publication or subject that has associated books — this would orphan those books
   - If a publication/subject must be removed, first reassign or delete the dependent books
   - The current soft-delete approach prevents accidental data loss but does not enforce referential integrity at the application level

7. **Input Validation**
   - All DTOs use `class-validator` decorators
   - `name` and `slug` are required on creation (`@IsString() @IsNotEmpty()`)
   - `slug` uniqueness is validated at the service level, not just at the DTO level
   - All other fields are optional (`@IsOptional()`)

8. **Response Format**
   - All endpoints return a consistent response structure:
     ```json
     {
       "message": "Operation description",
       "status": "success",
       "data": { ... }
     }
     ```
   - For delete operations, `data` is always `null`

9. **Error Handling**
   - `400 Bad Request` — Invalid input data (handled by `ValidationPipe`)
   - `401 Unauthorized` — Missing or invalid JWT token (handled by `JwtAuthGuard`)
   - `403 Forbidden` — User lacks required role (handled by `RolesGuard` and service checks)
   - `404 Not Found` — Record does not exist or is soft-deleted (for non-admins)
   - `409 Conflict` — Slug uniqueness violation

10. **What NOT to Do**
    - **Do NOT** use `PrismaService` directly in controllers — always go through the service layer
    - **Do NOT** expose raw Prisma errors to the client — use NestJS exception types (`NotFoundException`, `ConflictException`, `ForbiddenException`)
    - **Do NOT** perform hard deletes — always use soft delete (`deletedAt`)
    - **Do NOT** allow non-admin users to create, update, or delete publications/subjects
    - **Do NOT** skip slug uniqueness checks — always validate before creating or updating
    - **Do NOT** return soft-deleted records to public (non-admin) users
    - **Do NOT** modify the `id` field — it is auto-generated as UUID
    - **Do NOT** forget to export the service from the module if other modules need to inject it

11. **Testing Considerations**
    - Test slug uniqueness by attempting to create two publications/subjects with the same slug
    - Test soft delete by verifying the record is excluded from public queries but visible to admin queries
    - Test authorization by attempting admin endpoints with a non-admin token
    - Test update slug conflict by changing a slug to one that already exists
    - Test 404 responses for non-existent IDs and soft-deleted IDs (for non-admin users)
