/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { Teacher, Role, BookStatus } from '@prisma/client';

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new teacher
   * Security: Admins only
   */
  async create(
    dto: CreateTeacherDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Teacher;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can create teachers');
    }

    const teacher = await this.prisma.teacher.create({
      data: {
        name: dto.name,
        designation: dto.designation,
        bio: dto.bio,
        photo: dto.photo,
        facebook: dto.facebook,
        linkedin: dto.linkedin,
        website: dto.website,
        displayOrder: dto.displayOrder ?? 0,
        featured: dto.featured ?? false,
        status: BookStatus.PUBLISHED,
      },
    });

    return {
      message: 'Teacher created successfully',
      status: 'success',
      data: teacher,
    };
  }

  /**
   * Get all teachers
   * Security: Public
   */
  async findAll(requestingUserRole?: Role): Promise<{
    message: string;
    status: string;
    data: Teacher[];
  }> {
    const where =
      requestingUserRole === Role.ADMIN
        ? {}
        : { deletedAt: null, status: BookStatus.PUBLISHED };

    const teachers = await this.prisma.teacher.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });

    return {
      message:
        teachers.length > 0
          ? 'Teachers retrieved successfully'
          : 'No teachers found',
      status: 'success',
      data: teachers,
    };
  }

  /**
   * Get a single teacher by ID
   * Security: Public
   */
  async findOne(
    id: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Teacher;
  }> {
    const where =
      requestingUserRole === Role.ADMIN
        ? { id }
        : { id, deletedAt: null, status: BookStatus.PUBLISHED };

    const teacher = await this.prisma.teacher.findUnique({
      where,
      include: {
        teacherBooks: {
          include: {
            book: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return {
      message: 'Teacher retrieved successfully',
      status: 'success',
      data: teacher,
    };
  }

  /**
   * Update a teacher
   * Security: Admins only
   */
  async update(
    id: string,
    dto: UpdateTeacherDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Teacher;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can update teachers');
    }

    const existingTeacher = await this.prisma.teacher.findUnique({
      where: { id },
    });

    if (!existingTeacher) {
      throw new NotFoundException('Teacher not found');
    }

    const teacher = await this.prisma.teacher.update({
      where: { id },
      data: {
        name: dto.name,
        designation: dto.designation,
        bio: dto.bio,
        photo: dto.photo,
        facebook: dto.facebook,
        linkedin: dto.linkedin,
        website: dto.website,
        displayOrder: dto.displayOrder,
        featured: dto.featured,
      },
    });

    return {
      message: 'Teacher updated successfully',
      status: 'success',
      data: teacher,
    };
  }

  /**
   * Delete a teacher (soft delete)
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
      throw new ForbiddenException('Only administrators can delete teachers');
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id, deletedAt: null },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Soft delete
    await this.prisma.teacher.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Teacher deleted successfully',
      status: 'success',
      data: null,
    };
  }

  /**
   * Add a book to teacher
   * Security: Admins only
   */
  async addBook(
    teacherId: string,
    bookId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can add books to teachers',
      );
    }

    // Check if teacher exists
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId, deletedAt: null },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Check if book exists
    const book = await this.prisma.book.findUnique({
      where: { id: bookId, deletedAt: null },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Create teacher-book relationship
    await this.prisma.teacherBook.create({
      data: {
        teacherId,
        bookId,
      },
    });

    return {
      message: 'Book added to teacher successfully',
      status: 'success',
      data: null,
    };
  }

  /**
   * Remove a book from teacher
   * Security: Admins only
   */
  async removeBook(
    teacherId: string,
    bookId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can remove books from teachers',
      );
    }

    await this.prisma.teacherBook.delete({
      where: {
        teacherId_bookId: { teacherId, bookId },
      },
    });

    return {
      message: 'Book removed from teacher successfully',
      status: 'success',
      data: null,
    };
  }
}
