/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Banner, Role, BookStatus } from '@prisma/client';

@Injectable()
export class BannerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new banner
   * Security: Admins only
   */
  async create(
    dto: CreateBannerDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Banner;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can create banners');
    }

    const banner = await this.prisma.banner.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        image: dto.image,
        buttonText: dto.buttonText,
        buttonUrl: dto.buttonUrl,
        displayOrder: dto.displayOrder ?? 0,
        status: BookStatus.PUBLISHED,
      },
    });

    return {
      message: 'Banner created successfully',
      status: 'success',
      data: banner,
    };
  }

  /**
   * Get all banners
   * Security: Public
   */
  async findAll(requestingUserRole?: Role): Promise<{
    message: string;
    status: string;
    data: Banner[];
  }> {
    const where =
      requestingUserRole === Role.ADMIN
        ? {}
        : { deletedAt: null, status: BookStatus.PUBLISHED };

    const banners = await this.prisma.banner.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });

    return {
      message:
        banners.length > 0
          ? 'Banners retrieved successfully'
          : 'No banners found',
      status: 'success',
      data: banners,
    };
  }

  /**
   * Get a single banner by ID
   * Security: Public
   */
  async findOne(
    id: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Banner;
  }> {
    const where =
      requestingUserRole === Role.ADMIN
        ? { id }
        : { id, deletedAt: null, status: BookStatus.PUBLISHED };

    const banner = await this.prisma.banner.findUnique({
      where,
    });

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return {
      message: 'Banner retrieved successfully',
      status: 'success',
      data: banner,
    };
  }

  /**
   * Update a banner
   * Security: Admins only
   */
  async update(
    id: string,
    dto: UpdateBannerDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Banner;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can update banners');
    }

    const existingBanner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!existingBanner) {
      throw new NotFoundException('Banner not found');
    }

    const banner = await this.prisma.banner.update({
      where: { id },
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        image: dto.image,
        buttonText: dto.buttonText,
        buttonUrl: dto.buttonUrl,
        displayOrder: dto.displayOrder,
      },
    });

    return {
      message: 'Banner updated successfully',
      status: 'success',
      data: banner,
    };
  }

  /**
   * Delete a banner (soft delete)
   * Security: Admins only
   */
  async remove(
    id: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can delete banners');
    }

    const banner = await this.prisma.banner.findUnique({
      where: { id, deletedAt: null },
    });

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    // Soft delete
    await this.prisma.banner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Banner deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
