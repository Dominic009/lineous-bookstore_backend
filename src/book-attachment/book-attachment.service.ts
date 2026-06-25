/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookAttachmentDto } from './dto/create-book-attachment.dto';
import { UpdateBookAttachmentDto } from './dto/update-book-attachment.dto';
import { BookAttachment, Role, BookStatus } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class BookAttachmentService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Create a new book attachment
   * Security: Admins only
   */
  async create(
    dto: CreateBookAttachmentDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: BookAttachment;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can create book attachments',
      );
    }

    // Check if book exists
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId, deletedAt: null },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    const bookAttachment = await this.prisma.bookAttachment.create({
      data: {
        bookId: dto.bookId,
        url: dto.url,
        publicId: dto.publicId,
        type: dto.type,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return {
      message: 'Book attachment created successfully',
      status: 'success',
      data: bookAttachment,
    };
  }

  /**
   * Get all book attachments for a book
   * Security: Public
   */
  async findAll(
    bookId: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: BookAttachment[];
  }> {
    const where =
      requestingUserRole === Role.ADMIN
        ? { bookId }
        : { bookId, book: { deletedAt: null, status: BookStatus.PUBLISHED } };

    const bookAttachments = await this.prisma.bookAttachment.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return {
      message:
        bookAttachments.length > 0
          ? 'Book attachments retrieved successfully'
          : 'No book attachments found',
      status: 'success',
      data: bookAttachments,
    };
  }

  /**
   * Get a single book attachment by ID
   * Security: Public
   */
  async findOne(
    id: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: BookAttachment;
  }> {
    const bookAttachment =
      requestingUserRole === Role.ADMIN
        ? await this.prisma.bookAttachment.findUnique({ where: { id } })
        : await this.prisma.bookAttachment.findFirst({
            where: {
              id,
              book: { deletedAt: null, status: BookStatus.PUBLISHED },
            },
          });

    if (!bookAttachment) {
      throw new NotFoundException('Book attachment not found');
    }

    return {
      message: 'Book attachment retrieved successfully',
      status: 'success',
      data: bookAttachment,
    };
  }

  /**
   * Update a book attachment
   * Security: Admins only
   */
  async update(
    id: string,
    dto: UpdateBookAttachmentDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: BookAttachment;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can update book attachments',
      );
    }

    const existingBookAttachment = await this.prisma.bookAttachment.findUnique({
      where: { id },
    });

    if (!existingBookAttachment) {
      throw new NotFoundException('Book attachment not found');
    }

    // If publicId is being changed, delete old file from Cloudinary
    if (dto.publicId && dto.publicId !== existingBookAttachment.publicId) {
      await this.cloudinaryService.deleteFile(existingBookAttachment.publicId);
    }

    const bookAttachment = await this.prisma.bookAttachment.update({
      where: { id },
      data: {
        url: dto.url,
        publicId: dto.publicId,
        type: dto.type,
        sortOrder: dto.sortOrder,
      },
    });

    return {
      message: 'Book attachment updated successfully',
      status: 'success',
      data: bookAttachment,
    };
  }

  /**
   * Delete a book attachment (soft delete from DB + hard delete from Cloudinary)
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
        'Only administrators can delete book attachments',
      );
    }

    const bookAttachment = await this.prisma.bookAttachment.findUnique({
      where: { id, book: { deletedAt: null } },
    });

    if (!bookAttachment) {
      throw new NotFoundException('Book attachment not found');
    }

    // Delete from Cloudinary
    await this.cloudinaryService.deleteFile(bookAttachment.publicId);

    // Soft delete from DB
    await this.prisma.bookAttachment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Book attachment deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
