/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookAttachmentService } from './book-attachment.service';
import { CreateBookAttachmentDto } from './dto/create-book-attachment.dto';
import { UpdateBookAttachmentDto } from './dto/update-book-attachment.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';

/**
 * Request interface with user from JWT
 */
interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('book-attachments')
export class BookAttachmentController {
  constructor(private readonly bookAttachmentService: BookAttachmentService) {}

  /**
   * Create a new book attachment
   * Access: Admins only
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @Body() dto: CreateBookAttachmentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.bookAttachmentService.create(dto, req.user.role);
  }

  /**
   * Get all book attachments for a book
   * Access: Public
   */
  @Get()
  findAll(@Query('bookId') bookId: string, @Request() req: RequestWithUser) {
    return this.bookAttachmentService.findAll(bookId, req?.user?.role);
  }

  /**
   * Get a single book attachment by ID
   * Access: Public
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bookAttachmentService.findOne(id, req?.user?.role);
  }

  /**
   * Update a book attachment
   * Access: Admins only
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookAttachmentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.bookAttachmentService.update(id, dto, req.user.role);
  }

  /**
   * Delete a book attachment
   * Access: Admins only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bookAttachmentService.remove(id, req.user.role);
  }
}
