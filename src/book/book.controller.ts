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
} from '@nestjs/common';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
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

@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  /**
   * Create a new book
   * Access: Admins only
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateBookDto, @Request() req: RequestWithUser) {
    return this.bookService.create(dto, req.user.role);
  }

  /**
   * Get all books
   * Access: Public
   */
  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.bookService.findAll(req?.user?.role);
  }

  /**
   * Get a single book by ID
   * Access: Public
   */
  @Get(':id')
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
    @Request() req: RequestWithUser,
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
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bookService.remove(id, req.user.role);
  }
}
