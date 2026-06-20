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
import { SettingService } from './setting.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
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

@Controller('settings')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  /**
   * Get a setting by key
   * Access: Public
   */
  @Get(':key')
  findByKey(@Param('key') key: string) {
    return this.settingService.findByKey(key);
  }

  /**
   * Get all settings
   * Access: Public
   */
  @Get()
  findAll() {
    return this.settingService.findAll();
  }

  /**
   * Create or update a setting
   * Access: Admins only
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateSettingDto, @Request() req: RequestWithUser) {
    return this.settingService.createOrUpdate(dto, req.user.role);
  }

  /**
   * Update a setting
   * Access: Admins only
   */
  @Patch(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @Request() req: RequestWithUser,
  ) {
    return this.settingService.update(key, dto, req.user.role);
  }

  /**
   * Delete a setting
   * Access: Admins only
   */
  @Delete(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('key') key: string, @Request() req: RequestWithUser) {
    return this.settingService.remove(key, req.user.role);
  }
}
