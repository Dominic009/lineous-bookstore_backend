/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentType } from '@prisma/client';

@Injectable()
export class FileUploadService {
  constructor(private prisma: PrismaService) {}

  /**
   * Upload a file and create a book attachment
   */
  async uploadBookAttachment(
    file: Express.Multer.File,
    bookId: string,
    type: AttachmentType,
  ): Promise<{
    message: string;
    status: string;
    data: { url: string };
  }> {
    // Check if book exists
    const book = await this.prisma.book.findUnique({
      where: { id: bookId, deletedAt: null },
    });

    if (!book) {
      throw new BadRequestException('Book not found');
    }

    // In a real implementation, you would upload to cloud storage (S3, Cloudinary, etc.)
    // For now, we'll just return a placeholder URL
    const url = `/uploads/${file.filename}`;

    // Create book attachment
    await this.prisma.bookAttachment.create({
      data: {
        bookId,
        url,
        type,
      },
    });

    return {
      message: 'File uploaded successfully',
      status: 'success',
      data: { url },
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
      },
    };
  }
}
