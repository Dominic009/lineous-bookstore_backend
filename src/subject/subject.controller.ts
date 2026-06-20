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
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
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
   * Access: Public
   */
  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.subjectService.findAll(req?.user?.role);
  }

  /**
   * Get a single subject by ID
   * Access: Public
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
   * Delete a subject
   * Access: Admins only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.subjectService.remove(id, req.user.role);
  }
}
