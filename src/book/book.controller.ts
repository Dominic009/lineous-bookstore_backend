/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/auth/optional-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

/**
 * Request interface with user from JWT (optional for public endpoints)
 */
interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
}

/**
 * Request interface for authenticated endpoints
 */
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('books')
export class BookController {
  constructor(
    private readonly bookService: BookService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Create a new book with optional thumbnail and attachments
   * Access: Admins only
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('thumbnail'),
    FilesInterceptor('attachments', 10),
  )
  async create(
    @Body() dto: CreateBookDto,
    @Request() req: AuthenticatedRequest,
    @UploadedFile() thumbnail?: Express.Multer.File,
    @UploadedFiles() attachments?: Express.Multer.File[],
  ) {
    return this.bookService.create(
      dto,
      req.user.role,
      thumbnail,
      attachments,
      this.cloudinaryService,
    );
  }

  /**
   * Get all books
   * Access: Public (returns PUBLISHED only) or Admin (returns all)
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard, RolesGuard)
  findAll(@Request() req: RequestWithUser) {
    return this.bookService.findAll(req?.user?.role);
  }

  /**
   * Get a single book by ID
   * Access: Public (returns PUBLISHED only) or Admin (returns any status)
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard, RolesGuard)
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bookService.findOne(id, req?.user?.role);
  }

  /**
   * Update a book
   * Access: Admins only
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.bookService.update(id, dto, req.user.role);
  }

  /**
   * Delete a book
   * Access: Admins only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.bookService.remove(id, req.user.role);
  }
}
