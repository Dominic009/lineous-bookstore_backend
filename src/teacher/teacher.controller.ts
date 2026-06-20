/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  //   Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
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

@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  /**
   * Create a new teacher
   * Access: Admins only
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTeacherDto, @Request() req: RequestWithUser) {
    return this.teacherService.create(dto, req.user.role);
  }

  /**
   * Get all teachers
   * Access: Public
   */
  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.teacherService.findAll(req?.user?.role);
  }

  /**
   * Get a single teacher by ID
   * Access: Public
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.teacherService.findOne(id, req?.user?.role);
  }

  /**
   * Update a teacher
   * Access: Admins only
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
    @Request() req: RequestWithUser,
  ) {
    return this.teacherService.update(id, dto, req.user.role);
  }

  /**
   * Delete a teacher
   * Access: Admins only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.teacherService.remove(id, req.user.role);
  }

  /**
   * Add a book to teacher
   * Access: Admins only
   */
  @Post(':id/books')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  addBook(
    @Param('id') teacherId: string,
    @Body('bookId') bookId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.teacherService.addBook(teacherId, bookId, req.user.role);
  }

  /**
   * Remove a book from teacher
   * Access: Admins only
   */
  @Delete(':id/books')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  removeBook(
    @Param('id') teacherId: string,
    @Body('bookId') bookId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.teacherService.removeBook(teacherId, bookId, req.user.role);
  }
}
