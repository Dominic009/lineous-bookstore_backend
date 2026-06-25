/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentType } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class FileUploadService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Upload a file to Cloudinary and create a book attachment
   */
  async uploadBookAttachment(
    file: Express.Multer.File,
    bookId: string,
    type: AttachmentType,
  ): Promise<{
    message: string;
    status: string;
    data: { url: string; publicId: string };
  }> {
    // Check if book exists
    const book = await this.prisma.book.findUnique({
      where: { id: bookId, deletedAt: null },
    });

    if (!book) {
      throw new BadRequestException('Book not found');
    }

    // Upload to Cloudinary
    const { url, publicId } = await this.cloudinaryService.uploadFile(
      file,
      'bookstore',
    );

    // Create book attachment
    const attachment = await this.prisma.bookAttachment.create({
      data: {
        bookId,
        url,
        publicId,
        type,
      },
    });

    return {
      message: 'File uploaded successfully',
      status: 'success',
      data: {
        url: attachment.url,
        publicId: attachment.publicId,
      },
    };
  }

  /**
   * Delete a book attachment (soft delete from DB + hard delete from Cloudinary)
   */
  async deleteBookAttachment(id: string): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    const attachment = await this.prisma.bookAttachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Book attachment not found');
    }

    // Delete from Cloudinary
    await this.cloudinaryService.deleteFile(attachment.publicId);

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

  /**
   * Get file upload configuration
   */
  getUploadConfig() {
    return {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: {
        [AttachmentType.IMAGE]: ['image/jpeg', 'image/png', 'image/webp'],
        [AttachmentType.PDF]: ['application/pdf'],
        [AttachmentType.BANNER]: ['image/jpeg', 'image/png', 'image/webp'],
        [AttachmentType.THUMBNAIL]: ['image/jpeg', 'image/png', 'image/webp'],
      },
    };
  }
}
