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
import { PublicationService } from './publication.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
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
   * Access: Public
   */
  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.publicationService.findAll(req?.user?.role);
  }

  /**
   * Get a single publication by ID
   * Access: Public
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
   * Delete a publication
   * Access: Admins only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.publicationService.remove(id, req.user.role);
  }
}
