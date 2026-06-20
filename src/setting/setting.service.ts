/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting, Role } from '@prisma/client';

@Injectable()
export class SettingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get a setting by key
   * Security: Public
   */
  async findByKey(key: string): Promise<{
    message: string;
    status: string;
    data: Setting | null;
  }> {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });

    return {
      message: 'Setting retrieved successfully',
      status: 'success',
      data: setting,
    };
  }

  /**
   * Get all settings
   * Security: Public
   */
  async findAll(): Promise<{
    message: string;
    status: string;
    data: Setting[];
  }> {
    const settings = await this.prisma.setting.findMany();

    return {
      message: 'Settings retrieved successfully',
      status: 'success',
      data: settings,
    };
  }

  /**
   * Create or update a setting
   * Security: Admins only
   */
  async createOrUpdate(
    dto: CreateSettingDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Setting;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can manage settings');
    }

    const setting = await this.prisma.setting.upsert({
      where: { key: dto.key },
      update: { value: dto.value },
      create: { key: dto.key, value: dto.value },
    });

    return {
      message: 'Setting saved successfully',
      status: 'success',
      data: setting,
    };
  }

  /**
   * Update a setting
   * Security: Admins only
   */
  async update(
    key: string,
    dto: UpdateSettingDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Setting;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can update settings');
    }

    const existingSetting = await this.prisma.setting.findUnique({
      where: { key },
    });

    if (!existingSetting) {
      throw new NotFoundException('Setting not found');
    }

    const setting = await this.prisma.setting.update({
      where: { key },
      data: { value: dto.value },
    });

    return {
      message: 'Setting updated successfully',
      status: 'success',
      data: setting,
    };
  }

  /**
   * Delete a setting
   * Security: Admins only
   */
  async remove(
    key: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can delete settings');
    }

    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    await this.prisma.setting.delete({
      where: { key },
    });

    return {
      message: 'Setting deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
