/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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
  Query,
} from '@nestjs/common';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/auth/optional-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
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
   * Create a new book with optional thumbnail
   * Access: Admins only
   * Note: Attachments are managed via separate endpoints (POST /book-attachments, DELETE /upload/book-attachment/:id)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('thumbnail'))
  async create(
    @Body() dto: CreateBookDto,
    @Request() req: AuthenticatedRequest,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    return this.bookService.create(
      dto,
      req.user.role,
      thumbnail,
      undefined,
      this.cloudinaryService,
    );
  }

  /**
   * Get all books
   * Access: Public (returns PUBLISHED only) or Admin (returns all)
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard, RolesGuard)
  findAll(
    @Request() req: RequestWithUser,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.bookService.findAll(req?.user?.role, subjectId);
  }

  /**
   * Get books in tree structure: publications > subjects > books
   * Access: Public
   */
  @Get('tree')
  getTree() {
    return this.bookService.getTree();
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
   * Update a book with optional thumbnail
   * Access: Admins only
   * Note: Attachments are managed via separate endpoints (POST /book-attachments, DELETE /upload/book-attachment/:id)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('thumbnail'))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
    @Request() req: AuthenticatedRequest,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    // console.log(`[DEBUG] Book update controller - ID: ${id}`);
    // console.log(`[DEBUG] DTO keys:`, Object.keys(dto || {}));
    // console.log(
    //   `[DEBUG] Thumbnail file:`,
    //   thumbnail
    //     ? {
    //         name: thumbnail.originalname,
    //         size: thumbnail.size,
    //         mimetype: thumbnail.mimetype,
    //       }
    //     : null,
    // );
    return this.bookService.update(
      id,
      dto,
      req.user.role,
      thumbnail,
      undefined,
      this.cloudinaryService,
    );
  }

  /**
   * Test endpoint for debugging file uploads
   * Access: Admins only
   */
  // @Post('test-upload')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.ADMIN)
  // @UseInterceptors(FileInterceptor('file'))
  // testUpload(@UploadedFile() file?: Express.Multer.File) {
  //   console.log(
  //     '[DEBUG] Test upload - file:',
  //     file
  //       ? {
  //           name: file.originalname,
  //           size: file.size,
  //           mimetype: file.mimetype,
  //         }
  //       : null,
  //   );
  //   return { success: true, file };
  // }

  /**
   * Simplified test endpoint - mimics update but without FilesInterceptor and @Body()
   * Access: Admins only
   */
  // @Patch('test-update/:id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.ADMIN)
  // @UseInterceptors(FileInterceptor('thumbnail'))
  // testUpdate(
  //   @Param('id') id: string,
  //   @UploadedFile() thumbnail?: Express.Multer.File,
  // ) {
  //   console.log(`[DEBUG] Simplified test update - ID: ${id}`);
  //   console.log(
  //     `[DEBUG] Thumbnail:`,
  //     thumbnail
  //       ? {
  //           name: thumbnail.originalname,
  //           size: thumbnail.size,
  //           mimetype: thumbnail.mimetype,
  //         }
  //       : null,
  //   );
  //   return { success: true, id, thumbnail };
  // }

  /**
   * Test endpoint with both interceptors but no @Body()
   * Access: Admins only
   */
  // @Patch('test-update2/:id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.ADMIN)
  // @UseInterceptors(
  //   FileInterceptor('thumbnail'),
  //   FilesInterceptor('attachments', 10),
  // )
  // testUpdate2(
  //   @Param('id') id: string,
  //   @UploadedFile() thumbnail?: Express.Multer.File,
  //   @UploadedFiles() attachments?: Express.Multer.File[],
  // ) {
  //   console.log(`[DEBUG] Test update2 - ID: ${id}`);
  //   console.log(
  //     `[DEBUG] Thumbnail:`,
  //     thumbnail
  //       ? {
  //           name: thumbnail.originalname,
  //           size: thumbnail.size,
  //           mimetype: thumbnail.mimetype,
  //         }
  //       : null,
  //   );
  //   console.log(
  //     `[DEBUG] Attachments:`,
  //     attachments
  //       ? attachments.map((a) => ({
  //           name: a.originalname,
  //           size: a.size,
  //           mimetype: a.mimetype,
  //         }))
  //       : [],
  //   );
  //   return { success: true, id, thumbnail, attachments };
  // }

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
