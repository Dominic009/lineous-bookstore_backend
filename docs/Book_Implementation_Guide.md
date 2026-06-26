# Book Implementation Guide

This document provides a complete technical guide for implementing the Book module with Cloudinary image uploads, attachments, and API endpoints.

## Table of Contents
1. [Schema Design](#schema-design)
2. [Cloudinary Setup](#cloudinary-setup)
3. [Module Structure](#module-structure)
4. [DTOs](#dtos)
5. [Controller Implementation](#controller-implementation)
6. [Service Implementation](#service-implementation)
7. [API Flow](#api-flow)
8. [Frontend Integration](#frontend-integration)

---

## Schema Design

### Book Model
```prisma
model Book {
  id               String     @id @default(uuid())
  title            String
  slug             String     @unique
  shortDescription String?
  description      String?
  isbn             String?    @unique
  price            Decimal    @db.Decimal(10, 2)
  discountPrice    Decimal?   @db.Decimal(10, 2)
  publicationDate  DateTime?
  edition          String?
  language         String?
  stock            Boolean    @default(false)
  stockAmount      Int?
  status           BookStatus @default(DRAFT)
  thumbnail        String?    // Cloudinary URL for book cover
  publicationId    String?
  subjectId        String?
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt
  deletedAt        DateTime?

  // Relations
  publication  Publication?     @relation(fields: [publicationId], references: [id])
  subject      Subject?         @relation(fields: [subjectId], references: [id])
  attachments  BookAttachment[]
}
```

### BookAttachment Model
```prisma
enum AttachmentType {
  IMAGE
  PDF
  BANNER
  THUMBNAIL
}

model BookAttachment {
  id        String         @id @default(uuid())
  bookId    String
  url       String         // Cloudinary secure URL
  publicId  String         // Cloudinary public ID for deletion
  type      AttachmentType
  sortOrder Int            @default(0)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  deletedAt DateTime?

  // Relations
  book Book @relation(fields: [bookId], references: [id])

  @@index([bookId])
}
```

**Key Points:**
- `Book.thumbnail` stores the main cover image URL (quick access)
- `BookAttachment` with type `THUMBNAIL` also stores the same image (for consistency in attachments list)
- `publicId` is required to delete files from Cloudinary later
- `deletedAt` enables soft delete for both models

---

## Cloudinary Setup

### 1. Install SDK
```bash
npm install cloudinary
```

### 2. Environment Variables
Add to `.env`:
```env
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 3. Cloudinary Service
Create `src/cloudinary/cloudinary.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'bookstore',
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error) reject(new Error(error.message || 'Upload failed'));
          else if (result) resolve({ url: result.secure_url, publicId: result.public_id });
          else reject(new Error('Upload failed: no result returned'));
        },
      );
      upload.end(file.buffer);
    });
  }

  async deleteFile(publicId: string): Promise<{ result: string }> {
    return cloudinary.uploader.destroy(publicId) as Promise<{ result: string }>;
  }
}
```

### 4. Cloudinary Module
Create `src/cloudinary/cloudinary.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
```

---

## Module Structure

### Book Module
```typescript
// src/book/book.module.ts
import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [BookController],
  providers: [BookService, PrismaService],
  exports: [BookService],
})
export class BookModule {}
```

### File Upload Module
```typescript
// src/file-upload/file-upload.module.ts
import { Module } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileUploadController } from './file-upload.controller';
import { PrismaService } from '../prisma/prisma.service';
import { MulterModule } from '@nestjs/platform-express';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [MulterModule.register({}), CloudinaryModule],
  controllers: [FileUploadController],
  providers: [FileUploadService, PrismaService],
  exports: [FileUploadService],
})
export class FileUploadModule {}
```

### Book Attachment Module
```typescript
// src/book-attachment/book-attachment.module.ts
import { Module } from '@nestjs/common';
import { BookAttachmentService } from './book-attachment.service';
import { BookAttachmentController } from './book-attachment.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [BookAttachmentController],
  providers: [BookAttachmentService, PrismaService],
  exports: [BookAttachmentService],
})
export class BookAttachmentModule {}
```

---

## DTOs

### CreateBookDto
```typescript
// src/book/dto/create-book.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { BookStatus } from '@prisma/client';

export class CreateBookDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() slug!: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() isbn?: string;
  @IsNumber() @IsNotEmpty() price!: number;
  @IsOptional() @IsNumber() discountPrice?: number;
  @IsOptional() @IsDateString() publicationDate?: string;
  @IsOptional() @IsString() edition?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsBoolean() stock?: boolean;
  @IsOptional() @IsNumber() stockAmount?: number;
  @IsEnum(BookStatus) @IsOptional() status?: BookStatus = BookStatus.DRAFT;
  @IsOptional() @IsString() thumbnail?: string;
  @IsOptional() @IsString() publicationId?: string;
  @IsOptional() @IsString() subjectId?: string;
}
```

### CreateBookAttachmentDto
```typescript
// src/book-attachment/dto/create-book-attachment.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { AttachmentType } from '@prisma/client';

export class CreateBookAttachmentDto {
  @IsString() @IsNotEmpty() bookId!: string;
  @IsString() @IsNotEmpty() url!: string;
  @IsString() @IsNotEmpty() publicId!: string;
  @IsEnum(AttachmentType) @IsNotEmpty() type!: AttachmentType;
  @IsOptional() @IsNumber() sortOrder?: number;
}
```

### UpdateBookAttachmentDto
```typescript
// src/book-attachment/dto/update-book-attachment.dto.ts
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { AttachmentType } from '@prisma/client';

export class UpdateBookAttachmentDto {
  @IsString() @IsOptional() url?: string;
  @IsString() @IsOptional() publicId?: string;
  @IsEnum(AttachmentType) @IsOptional() type?: AttachmentType;
  @IsNumber() @IsOptional() sortOrder?: number;
}
```

---

## Controller Implementation

### Book Controller
```typescript
// src/book/book.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

interface RequestWithUser extends Request {
  user: { id: string; email: string; role: Role };
}

@Controller('books')
export class BookController {
  constructor(
    private readonly bookService: BookService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('thumbnail'), FilesInterceptor('attachments', 10))
  async create(
    @Body() dto: CreateBookDto,
    @Request() req: RequestWithUser,
    @UploadedFile() thumbnail?: Express.Multer.File,
    @UploadedFiles() attachments?: Express.Multer.File[],
  ) {
    return this.bookService.create(dto, req.user.role, thumbnail, attachments, this.cloudinaryService);
  }

  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.bookService.findAll(req?.user?.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bookService.findOne(id, req?.user?.role);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateBookDto, @Request() req: RequestWithUser) {
    return this.bookService.update(id, dto, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bookService.remove(id, req.user.role);
  }
}
```

### File Upload Controller
```typescript
// src/file-upload/file-upload.controller.ts
import { Controller, Post, Delete, UseGuards, UseInterceptors, UploadedFile, Body, Param } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role, AttachmentType } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('book-attachment')
  @UseInterceptors(FileInterceptor('file'))
  uploadBookAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body('bookId') bookId: string,
    @Body('type') type: AttachmentType,
  ) {
    return this.fileUploadService.uploadBookAttachment(file, bookId, type);
  }

  @Delete('book-attachment/:id')
  remove(@Param('id') id: string) {
    return this.fileUploadService.deleteBookAttachment(id);
  }
}
```

---

## Service Implementation

### Book Service
```typescript
// src/book/book.service.ts
import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book, Role, BookStatus, AttachmentType } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class BookService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateBookDto,
    requestingUserRole: Role,
    thumbnail?: Express.Multer.File,
    attachments?: Express.Multer.File[],
    cloudinaryService?: CloudinaryService,
  ): Promise<{ message: string; status: string; data: Book }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can create books');
    }

    // Check slug uniqueness
    const existingBook = await this.prisma.book.findUnique({ where: { slug: dto.slug } });
    if (existingBook) throw new ConflictException('Book with this slug already exists');

    // Check ISBN uniqueness
    if (dto.isbn) {
      const isbnExists = await this.prisma.book.findUnique({ where: { isbn: dto.isbn } });
      if (isbnExists) throw new ConflictException('Book with this ISBN already exists');
    }

    // Handle thumbnail upload
    let thumbnailUrl: string | undefined;
    let thumbnailPublicId: string | undefined;

    if (thumbnail && cloudinaryService) {
      const result = await cloudinaryService.uploadFile(thumbnail, 'bookstore/thumbnails');
      thumbnailUrl = result.url;
      thumbnailPublicId = result.publicId;
    }

    // Create book
    const book = await this.prisma.book.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        shortDescription: dto.shortDescription,
        description: dto.description,
        isbn: dto.isbn,
        price: dto.price,
        discountPrice: dto.discountPrice,
        publicationDate: dto.publicationDate ? new Date(dto.publicationDate) : undefined,
        edition: dto.edition,
        language: dto.language,
        stock: dto.stock ?? false,
        stockAmount: dto.stockAmount,
        status: dto.status || BookStatus.DRAFT,
        thumbnail: thumbnailUrl || dto.thumbnail,
        publicationId: dto.publicationId,
        subjectId: dto.subjectId,
      },
      include: { publication: true, subject: true },
    });

    // Handle additional attachments
    if (attachments && attachments.length > 0 && cloudinaryService) {
      for (const file of attachments) {
        const result = await cloudinaryService.uploadFile(file, 'bookstore/attachments');
        await this.prisma.bookAttachment.create({
          data: { bookId: book.id, url: result.url, publicId: result.publicId, type: AttachmentType.IMAGE, sortOrder: 0 },
        });
      }
    }

    // Create thumbnail attachment record
    if (thumbnailUrl && thumbnailPublicId && cloudinaryService) {
      await this.prisma.bookAttachment.create({
        data: { bookId: book.id, url: thumbnailUrl, publicId: thumbnailPublicId, type: AttachmentType.THUMBNAIL, sortOrder: 0 },
      });
    }

    return { message: 'Book created successfully', status: 'success', data: book };
  }

  async findAll(requestingUserRole?: Role): Promise<{ message: string; status: string; data: Book[] }> {
    const where = requestingUserRole === Role.ADMIN ? {} : { deletedAt: null, status: BookStatus.PUBLISHED };
    const books = await this.prisma.book.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { publication: true, subject: true, attachments: true },
    });
    return { message: books.length > 0 ? 'Books retrieved successfully' : 'No books found', status: 'success', data: books };
  }

  async findOne(id: string, requestingUserRole?: Role): Promise<{ message: string; status: string; data: Book }> {
    const where = requestingUserRole === Role.ADMIN ? { id } : { id, deletedAt: null, status: BookStatus.PUBLISHED };
    const book = await this.prisma.book.findUnique({
      where,
      include: { publication: true, subject: true, parts: true, attachments: true, reviews: true },
    });
    if (!book) throw new NotFoundException('Book not found');
    return { message: 'Book retrieved successfully', status: 'success', data: book };
  }

  async update(id: string, dto: UpdateBookDto, requestingUserRole: Role): Promise<{ message: string; status: string; data: Book }> {
    if (requestingUserRole !== Role.ADMIN) throw new ForbiddenException('Only administrators can update books');
    const existingBook = await this.prisma.book.findUnique({ where: { id } });
    if (!existingBook) throw new NotFoundException('Book not found');

    if (dto.slug && dto.slug !== existingBook.slug) {
      const slugExists = await this.prisma.book.findUnique({ where: { slug: dto.slug } });
      if (slugExists) throw new ConflictException('Slug already in use');
    }

    if (dto.isbn && dto.isbn !== existingBook.isbn) {
      const isbnExists = await this.prisma.book.findUnique({ where: { isbn: dto.isbn } });
      if (isbnExists) throw new ConflictException('ISBN already in use');
    }

    const book = await this.prisma.book.update({
      where: { id },
      data: {
        title: dto.title, slug: dto.slug, shortDescription: dto.shortDescription,
        description: dto.description, isbn: dto.isbn, price: dto.price,
        discountPrice: dto.discountPrice,
        publicationDate: dto.publicationDate ? new Date(dto.publicationDate) : undefined,
        edition: dto.edition, language: dto.language, stock: dto.stock,
        status: dto.status, thumbnail: dto.thumbnail,
        publicationId: dto.publicationId, subjectId: dto.subjectId,
      },
      include: { publication: true, subject: true, attachments: true },
    });

    return { message: 'Book updated successfully', status: 'success', data: book };
  }

  async remove(id: string, requestingUserRole: Role): Promise<{ message: string; status: string; data: null }> {
    if (requestingUserRole !== Role.ADMIN) throw new ForbiddenException('Only administrators can delete books');
    const book = await this.prisma.book.findUnique({ where: { id, deletedAt: null } });
    if (!book) throw new NotFoundException('Book not found');
    await this.prisma.book.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Book deleted successfully', status: 'success', data: null };
  }
}
```

### File Upload Service
```typescript
// src/file-upload/file-upload.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentType } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class FileUploadService {
  constructor(private prisma: PrismaService, private cloudinaryService: CloudinaryService) {}

  async uploadBookAttachment(file: Express.Multer.File, bookId: string, type: AttachmentType) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId, deletedAt: null } });
    if (!book) throw new BadRequestException('Book not found');

    const { url, publicId } = await this.cloudinaryService.uploadFile(file, 'bookstore');
    const attachment = await this.prisma.bookAttachment.create({
      data: { bookId, url, publicId, type },
    });

    return { message: 'File uploaded successfully', status: 'success', data: { url: attachment.url, publicId: attachment.publicId } };
  }

  async deleteBookAttachment(id: string) {
    const attachment = await this.prisma.bookAttachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Book attachment not found');

    await this.cloudinaryService.deleteFile(attachment.publicId);
    await this.prisma.bookAttachment.update({ where: { id }, data: { deletedAt: new Date() } });

    return { message: 'Book attachment deleted successfully', status: 'success', data: null };
  }
}
```

### Book Attachment Service
```typescript
// src/book-attachment/book-attachment.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookAttachmentDto } from './dto/create-book-attachment.dto';
import { UpdateBookAttachmentDto } from './dto/update-book-attachment.dto';
import { BookAttachment, Role, BookStatus } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class BookAttachmentService {
  constructor(private prisma: PrismaService, private cloudinaryService: CloudinaryService) {}

  async create(dto: CreateBookAttachmentDto, requestingUserRole: Role) {
    if (requestingUserRole !== Role.ADMIN) throw new ForbiddenException('Only administrators can create book attachments');
    const book = await this.prisma.book.findUnique({ where: { id: dto.bookId, deletedAt: null } });
    if (!book) throw new NotFoundException('Book not found');

    const attachment = await this.prisma.bookAttachment.create({
      data: { bookId: dto.bookId, url: dto.url, publicId: dto.publicId, type: dto.type, sortOrder: dto.sortOrder ?? 0 },
    });

    return { message: 'Book attachment created successfully', status: 'success', data: attachment };
  }

  async findAll(bookId: string, requestingUserRole?: Role) {
    const where = requestingUserRole === Role.ADMIN ? { bookId } : { bookId, book: { deletedAt: null, status: BookStatus.PUBLISHED } };
    const attachments = await this.prisma.bookAttachment.findMany({ where, orderBy: { sortOrder: 'asc' } });
    return { message: attachments.length > 0 ? 'Book attachments retrieved successfully' : 'No book attachments found', status: 'success', data: attachments };
  }

  async findOne(id: string, requestingUserRole?: Role) {
    const attachment = requestingUserRole === Role.ADMIN
      ? await this.prisma.bookAttachment.findUnique({ where: { id } })
      : await this.prisma.bookAttachment.findFirst({ where: { id, book: { deletedAt: null, status: BookStatus.PUBLISHED } } });
    if (!attachment) throw new NotFoundException('Book attachment not found');
    return { message: 'Book attachment retrieved successfully', status: 'success', data: attachment };
  }

  async update(id: string, dto: UpdateBookAttachmentDto, requestingUserRole: Role) {
    if (requestingUserRole !== Role.ADMIN) throw new ForbiddenException('Only administrators can update book attachments');
    const existing = await this.prisma.bookAttachment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Book attachment not found');

    if (dto.publicId && dto.publicId !== existing.publicId) {
      await this.cloudinaryService.deleteFile(existing.publicId);
    }

    const attachment = await this.prisma.bookAttachment.update({
      where: { id },
      data: { url: dto.url, publicId: dto.publicId, type: dto.type, sortOrder: dto.sortOrder },
    });

    return { message: 'Book attachment updated successfully', status: 'success', data: attachment };
  }

  async remove(id: string, requestingUserRole: Role) {
    if (requestingUserRole !== Role.ADMIN) throw new ForbiddenException('Only administrators can delete book attachments');
    const attachment = await this.prisma.bookAttachment.findUnique({ where: { id, book: { deletedAt: null } } });
    if (!attachment) throw new NotFoundException('Book attachment not found');

    await this.cloudinaryService.deleteFile(attachment.publicId);
    await this.prisma.bookAttachment.update({ where: { id }, data: { deletedAt: new Date() } });

    return { message: 'Book attachment deleted successfully', status: 'success', data: null };
  }
}
```

---

## API Flow

### 1. Create Book with Images (Single API Call)
**Endpoint:** `POST /api/books`  
**Content-Type:** `multipart/form-data`

**Form Data:**
- Text fields: `title`, `slug`, `price`, `status`, etc.
- `thumbnail`: Single image file (book cover)
- `attachments`: Multiple image files (gallery)

**Flow:**
1. Controller receives multipart request
2. `FileInterceptor('thumbnail')` extracts single thumbnail file
3. `FilesInterceptor('attachments', 10)` extracts up to 10 additional files
4. Service uploads thumbnail to Cloudinary → gets `url` + `publicId`
5. Service creates `Book` record with `thumbnail` URL
6. Service creates `BookAttachment` with type `THUMBNAIL`
7. Service uploads each additional file to Cloudinary
8. Service creates `BookAttachment` records with type `IMAGE`
9. Returns book with all attachments

### 2. Get All Books
**Endpoint:** `GET /api/books`

**Response includes:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Book A",
      "thumbnail": "https://res.cloudinary.com/...",
      "attachments": [
        { "id": "uuid", "url": "https://...", "type": "THUMBNAIL", "publicId": "..." },
        { "id": "uuid", "url": "https://...", "type": "IMAGE", "publicId": "..." }
      ]
    }
  ]
}
```

### 3. Get Book by ID
**Endpoint:** `GET /api/books/:id`

**Response includes:** Full book details with all attachments (thumbnail, images, PDFs, banners).

### 4. Update Book
**Endpoint:** `PATCH /api/books/:id`  
**Content-Type:** `multipart/form-data`

Updates book metadata and/or uploads new files. All fields are optional.

**Form Data Fields:**
| Field | Type | Description |
|-------|------|-------------|
| title | string | Book title |
| slug | string | URL slug (must be unique) |
| shortDescription | string | Short description |
| description | string | Full description |
| isbn | string | ISBN (must be unique) |
| price | number | Price (non-negative) |
| discountPrice | number | Discount price (non-negative, ≤ price) |
| publicationDate | string | ISO date string |
| edition | string | Edition |
| language | string | Language |
| stock | boolean | Has stock (print-on-demand: false) |
| stockAmount | number | Stock quantity (if stock is true) |
| status | string | `DRAFT`, `PUBLISHED`, or `ARCHIVED` |
| thumbnail | File | New thumbnail image (replaces existing) |
| thumbnail | string | Or provide thumbnail URL directly |
| publicationId | string | Publication ID |
| subjectId | string | Subject ID |
| attachments | File[] | Additional attachment images (appended) |

**Note:** New files are uploaded to Cloudinary automatically. Existing attachments are preserved unless explicitly deleted via the attachment endpoints.

### 5. Delete Book
**Endpoint:** `DELETE /api/books/:id`

Soft deletes the book. Associated attachments are also soft-deleted.

### 6. Upload Attachment (Standalone)
**Endpoint:** `POST /api/upload/book-attachment`  
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: The file to upload
- `bookId`: UUID of the book
- `type`: `IMAGE`, `PDF`, `BANNER`, or `THUMBNAIL`

**Response:**
```json
{
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "bookstore/abc123"
  }
}
```

### 7. Delete Attachment
**Endpoint:** `DELETE /api/upload/book-attachment/:id`

Permanently deletes file from Cloudinary using `publicId` and soft-deletes the DB record.

---

## Frontend Integration

### Creating a Book with Images
```javascript
const formData = new FormData();
formData.append('title', 'Book A');
formData.append('slug', 'book-a');
formData.append('price', '29.99');
formData.append('status', 'PUBLISHED');
formData.append('thumbnail', thumbnailFile); // Single file
formData.append('attachments', imageFile1); // Multiple files
formData.append('attachments', imageFile2);

const response = await fetch('/api/books', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

### Displaying Book Images
```javascript
// Get book with attachments
const { data } = await fetch(`/api/books/${bookId}`).then(r => r.json());

// Display thumbnail
const thumbnail = data.thumbnail; // Direct URL

// Display all images
const images = data.attachments.filter(a => a.type === 'IMAGE' || a.type === 'THUMBNAIL');
images.forEach(img => {
  <img key={img.id} src={img.url} alt={data.title} />
});
```

### Deleting an Attachment
```javascript
await fetch(`/api/upload/book-attachment/${attachmentId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## Key Implementation Notes

1. **Multipart Request Handling**: NestJS `FileInterceptor` and `FilesInterceptor` parse `multipart/form-data`. Text fields remain accessible via `@Body()`.

2. **Cloudinary Folders**: Use separate folders for organization:
   - `bookstore/thumbnails` — book cover images
   - `bookstore/attachments` — additional images

3. **Soft Delete Pattern**: Both `Book` and `BookAttachment` use `deletedAt` for soft deletes. When deleting an attachment, also delete from Cloudinary.

4. **Public ID Storage**: Always store Cloudinary `public_id` alongside the `url`. The `public_id` is required for file deletion.

5. **Validation**: The global `ValidationPipe` handles DTO validation. For multipart endpoints, text fields are still validated via `@Body()`.

6. **Authorization**: Book creation/update/delete requires `ADMIN` role. Reading books is public (only published books for non-admins).

7. **Attachment Types**:
   - `THUMBNAIL` — Book cover (also stored in `Book.thumbnail`)
   - `IMAGE` — Additional book images
   - `PDF` — Digital book files
   - `BANNER` — Promotional banners
