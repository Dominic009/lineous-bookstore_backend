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
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Subject, Role } from '@prisma/client';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new subject
   * Security: Admins only
   */
  async create(
    dto: CreateSubjectDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Subject;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can create subjects');
    }

    // Check if slug already exists
    const existingSubject = await this.prisma.subject.findUnique({
      where: { slug: dto.slug },
    });

    if (existingSubject) {
      throw new ConflictException('Subject with this slug already exists');
    }

    const subject = await this.prisma.subject.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      },
    });

    return {
      message: 'Subject created successfully',
      status: 'success',
      data: subject,
    };
  }

  /**
   * Get all subjects
   * Security: Public
   */
  async findAll(requestingUserRole?: Role): Promise<{
    message: string;
    status: string;
    data: Subject[];
  }> {
    const where = requestingUserRole === Role.ADMIN ? {} : { deletedAt: null };

    const subjects = await this.prisma.subject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      message:
        subjects.length > 0
          ? 'Subjects retrieved successfully'
          : 'No subjects found',
      status: 'success',
      data: subjects,
    };
  }

  /**
   * Get a single subject by ID
   * Security: Public
   */
  async findOne(
    id: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Subject;
  }> {
    const where =
      requestingUserRole === Role.ADMIN ? { id } : { id, deletedAt: null };

    const subject = await this.prisma.subject.findUnique({
      where,
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return {
      message: 'Subject retrieved successfully',
      status: 'success',
      data: subject,
    };
  }

  /**
   * Update a subject
   * Security: Admins only
   */
  async update(
    id: string,
    dto: UpdateSubjectDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Subject;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can update subjects');
    }

    const existingSubject = await this.prisma.subject.findUnique({
      where: { id },
    });

    if (!existingSubject) {
      throw new NotFoundException('Subject not found');
    }

    // If slug is being changed, check if it's already taken
    if (dto.slug && dto.slug !== existingSubject.slug) {
      const slugExists = await this.prisma.subject.findUnique({
        where: { slug: dto.slug },
      });

      if (slugExists) {
        throw new ConflictException('Slug already in use');
      }
    }

    const subject = await this.prisma.subject.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      },
    });

    return {
      message: 'Subject updated successfully',
      status: 'success',
      data: subject,
    };
  }

  /**
   * Delete a subject (soft delete)
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
      throw new ForbiddenException('Only administrators can delete subjects');
    }

    const subject = await this.prisma.subject.findUnique({
      where: { id, deletedAt: null },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Soft delete
    await this.prisma.subject.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Subject deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
