/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { Publication, Role, BookStatus } from '@prisma/client';

@Injectable()
export class PublicationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new publication
   * Security: Admins only
   */
  async create(
    dto: CreatePublicationDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Publication;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can create publications',
      );
    }

    // Check if slug already exists
    const existingPublication = await this.prisma.publication.findUnique({
      where: { slug: dto.slug },
    });

    if (existingPublication) {
      throw new ConflictException('Publication with this slug already exists');
    }

    const publication = await this.prisma.publication.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        logo: dto.logo,
        status: dto.status || BookStatus.PUBLISHED,
      },
    });

    return {
      message: 'Publication created successfully',
      status: 'success',
      data: publication,
    };
  }

  /**
   * Get all publications
   * Security: Public (for frontend), Admin (for CMS)
   */
  async findAll(requestingUserRole?: Role): Promise<{
    message: string;
    status: string;
    data: Publication[];
  }> {
    const where = requestingUserRole === Role.ADMIN ? {} : { deletedAt: null };

    const publications = await this.prisma.publication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      message:
        publications.length > 0
          ? 'Publications retrieved successfully'
          : 'No publications found',
      status: 'success',
      data: publications,
    };
  }

  /**
   * Get a single publication by ID
   * Security: Public (for frontend), Admin (for CMS)
   */
  async findOne(
    id: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Publication;
  }> {
    const where =
      requestingUserRole === Role.ADMIN ? { id } : { id, deletedAt: null };

    const publication = await this.prisma.publication.findUnique({
      where,
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    return {
      message: 'Publication retrieved successfully',
      status: 'success',
      data: publication,
    };
  }

  /**
   * Update a publication
   * Security: Admins only
   */
  async update(
    id: string,
    dto: UpdatePublicationDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Publication;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can update publications',
      );
    }

    const existingPublication = await this.prisma.publication.findUnique({
      where: { id },
    });

    if (!existingPublication) {
      throw new NotFoundException('Publication not found');
    }

    // If slug is being changed, check if it's already taken
    if (dto.slug && dto.slug !== existingPublication.slug) {
      const slugExists = await this.prisma.publication.findUnique({
        where: { slug: dto.slug },
      });

      if (slugExists) {
        throw new ConflictException('Slug already in use');
      }
    }

    const publication = await this.prisma.publication.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        logo: dto.logo,
        status: dto.status,
      },
    });

    return {
      message: 'Publication updated successfully',
      status: 'success',
      data: publication,
    };
  }

  /**
   * Delete a publication (soft delete)
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
      throw new ForbiddenException(
        'Only administrators can delete publications',
      );
    }

    const publication = await this.prisma.publication.findUnique({
      where: { id, deletedAt: null },
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    // Soft delete
    await this.prisma.publication.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Publication deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
