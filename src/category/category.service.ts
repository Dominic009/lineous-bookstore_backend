/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, Role } from '@prisma/client';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new category
   * Security: Admins only
   */
  async create(
    dto: CreateCategoryDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Category;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can create categories');
    }

    // Check if slug already exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this slug already exists');
    }

    // Check if parent exists
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId, deletedAt: null },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        parentId: dto.parentId,
      },
    });

    return {
      message: 'Category created successfully',
      status: 'success',
      data: category,
    };
  }

  /**
   * Get all categories
   * Security: Public
   */
  async findAll(requestingUserRole?: Role): Promise<{
    message: string;
    status: string;
    data: Category[];
  }> {
    const where = requestingUserRole === Role.ADMIN ? {} : { deletedAt: null };

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return {
      message:
        categories.length > 0
          ? 'Categories retrieved successfully'
          : 'No categories found',
      status: 'success',
      data: categories,
    };
  }

  /**
   * Get a single category by ID
   * Security: Public
   */
  async findOne(
    id: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Category;
  }> {
    const where =
      requestingUserRole === Role.ADMIN ? { id } : { id, deletedAt: null };

    const category = await this.prisma.category.findUnique({
      where,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return {
      message: 'Category retrieved successfully',
      status: 'success',
      data: category,
    };
  }

  /**
   * Update a category
   * Security: Admins only
   */
  async update(
    id: string,
    dto: UpdateCategoryDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Category;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can update categories');
    }

    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    // If slug is being changed, check if it's already taken
    if (dto.slug && dto.slug !== existingCategory.slug) {
      const slugExists = await this.prisma.category.findUnique({
        where: { slug: dto.slug },
      });

      if (slugExists) {
        throw new ConflictException('Slug already in use');
      }
    }

    // If parentId is being changed, check if it exists
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId, deletedAt: null },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        parentId: dto.parentId,
      },
    });

    return {
      message: 'Category updated successfully',
      status: 'success',
      data: category,
    };
  }

  /**
   * Delete a category (soft delete)
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
      throw new ForbiddenException('Only administrators can delete categories');
    }

    const category = await this.prisma.category.findUnique({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Soft delete
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Category deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
