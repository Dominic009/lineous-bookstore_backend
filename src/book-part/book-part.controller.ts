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
import { BookPartService } from './book-part.service';
import { CreateBookPartDto } from './dto/create-book-part.dto';
import { UpdateBookPartDto } from './dto/update-book-part.dto';
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

@Controller('book-parts')
export class BookPartController {
  constructor(private readonly bookPartService: BookPartService) {}

  /**
   * Create a new book part
   * Access: Admins only
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateBookPartDto, @Request() req: RequestWithUser) {
    return this.bookPartService.create(dto, req.user.role);
  }

  /**
   * Get all book parts for a book
   * Access: Public
   */
  @Get()
  findAll(@Query('bookId') bookId: string, @Request() req: RequestWithUser) {
    return this.bookPartService.findAll(bookId, req?.user?.role);
  }

  /**
   * Get a single book part by ID
   * Access: Public
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bookPartService.findOne(id, req?.user?.role);
  }

  /**
   * Update a book part
   * Access: Admins only
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookPartDto,
    @Request() req: RequestWithUser,
  ) {
    return this.bookPartService.update(id, dto, req.user.role);
  }

  /**
   * Delete a book part
   * Access: Admins only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bookPartService.remove(id, req.user.role);
  }
}
