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
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
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

@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  /**
   * Create a new banner
   * Access: Admins only
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateBannerDto, @Request() req: RequestWithUser) {
    return this.bannerService.create(dto, req.user.role);
  }

  /**
   * Get all banners
   * Access: Public
   */
  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.bannerService.findAll(req?.user?.role);
  }

  /**
   * Get a single banner by ID
   * Access: Public
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bannerService.findOne(id, req?.user?.role);
  }

  /**
   * Update a banner
   * Access: Admins only
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
    @Request() req: RequestWithUser,
  ) {
    return this.bannerService.update(id, dto, req.user.role);
  }

  /**
   * Delete a banner
   * Access: Admins only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.bannerService.remove(id, req.user.role);
  }
}
