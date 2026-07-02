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
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book, Role, BookStatus, AttachmentType } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { BookSuccessMessages } from '../common/validators/book.validators';

@Injectable()
export class BookService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new book with optional thumbnail and attachments
   * Security: Admins only
   */
  async create(
    dto: CreateBookDto,
    requestingUserRole: Role,
    thumbnail?: Express.Multer.File,
    attachments?: Express.Multer.File[],
    cloudinaryService?: CloudinaryService,
  ): Promise<{
    message: string;
    status: string;
    data: Book;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can create books');
    }

    // Check if slug already exists
    const existingBook = await this.prisma.book.findUnique({
      where: { slug: dto.slug },
    });

    if (existingBook) {
      throw new ConflictException('Book with this slug already exists');
    }

    // Validate publication exists
    const publication = await this.prisma.publication.findUnique({
      where: { id: dto.publicationId },
    });
    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    // Validate subject exists and belongs to the publication
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    if (subject.publicationId && subject.publicationId !== dto.publicationId) {
      throw new ConflictException(
        'Subject does not belong to the selected publication',
      );
    }

    // Handle thumbnail upload
    let thumbnailUrl: string | undefined;
    let thumbnailPublicId: string | undefined;

    if (thumbnail && cloudinaryService) {
      const result = await cloudinaryService.uploadFile(
        thumbnail,
        'bookstore/thumbnails',
      );
      thumbnailUrl = result.url;
      thumbnailPublicId = result.publicId;
    }

    // Create the book (without price/stock/isbn - those go to papers)
    const book = await this.prisma.book.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        shortDescription: dto.shortDescription,
        description: dto.description,
        publicationDate: dto.publicationDate
          ? new Date(dto.publicationDate)
          : undefined,
        edition: dto.edition,
        language: dto.language,
        status: dto.status || BookStatus.DRAFT,
        thumbnail: thumbnailUrl || dto.thumbnail,
        publicationId: dto.publicationId,
        subjectId: dto.subjectId,
      },
      include: {
        publication: true,
        subject: true,
      },
    });

    // Handle additional attachments
    if (attachments && attachments.length > 0 && cloudinaryService) {
      for (const file of attachments) {
        const result = await cloudinaryService.uploadFile(
          file,
          'bookstore/attachments',
        );
        await this.prisma.bookAttachment.create({
          data: {
            bookId: book.id,
            url: result.url,
            publicId: result.publicId,
            type: AttachmentType.IMAGE,
            sortOrder: 0,
          },
        });
      }
    }

    // If thumbnail was uploaded, also create a BookAttachment for it
    if (thumbnailUrl && thumbnailPublicId && cloudinaryService) {
      await this.prisma.bookAttachment.create({
        data: {
          bookId: book.id,
          url: thumbnailUrl,
          publicId: thumbnailPublicId,
          type: AttachmentType.THUMBNAIL,
          sortOrder: 0,
        },
      });
    }

    return {
      message: BookSuccessMessages.CREATED,
      status: 'success',
      data: book,
    };
  }

  /**
   * Get all books
   * Security: Public
   */
  async findAll(requestingUserRole?: Role): Promise<{
    message: string;
    status: string;
    data: Book[];
  }> {
    const where =
      requestingUserRole === Role.ADMIN
        ? {}
        : { deletedAt: null, status: BookStatus.PUBLISHED };

    const books = await this.prisma.book.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        publication: true,
        subject: true,
        papers: {
          where: { deletedAt: null },
        },
        attachments: true,
        reviews: true,
      },
    });

    const booksWithPriceRange = books.map((book) => ({
      ...book,
      priceRange: this.calculatePriceRange(book.papers),
    }));

    return {
      message:
        booksWithPriceRange.length > 0
          ? BookSuccessMessages.RETRIEVED_ALL
          : BookSuccessMessages.NOT_FOUND,
      status: 'success',
      data: booksWithPriceRange,
    };
  }

  /**
   * Get a single book by ID
   * Security: Public
   */
  async findOne(
    id: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Book;
  }> {
    const where =
      requestingUserRole === Role.ADMIN
        ? { id }
        : { id, deletedAt: null, status: BookStatus.PUBLISHED };

    const book = await this.prisma.book.findUnique({
      where,
      include: {
        publication: true,
        subject: true,
        papers: true,
        attachments: true,
        reviews: true,
      },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    return {
      message: BookSuccessMessages.RETRIEVED,
      status: 'success',
      data: book,
    };
  }

  /**
   * Update a book with optional thumbnail and attachments
   * Security: Admins only
   */
  async update(
    id: string,
    dto: UpdateBookDto,
    requestingUserRole: Role,
    thumbnail?: Express.Multer.File,
    attachments?: Express.Multer.File[],
    cloudinaryService?: CloudinaryService,
  ): Promise<{
    message: string;
    status: string;
    data: Book;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can update books');
    }

    const existingBook = await this.prisma.book.findUnique({
      where: { id },
    });

    if (!existingBook) {
      throw new NotFoundException('Book not found');
    }

    // If slug is being changed, check if it's already taken
    if (dto.slug && dto.slug !== existingBook.slug) {
      const slugExists = await this.prisma.book.findUnique({
        where: { slug: dto.slug },
      });

      if (slugExists) {
        throw new ConflictException('Slug already in use');
      }
    }

    // Handle thumbnail upload
    let thumbnailUrl: string | undefined;
    let thumbnailPublicId: string | undefined;

    if (thumbnail && cloudinaryService) {
      const result = await cloudinaryService.uploadFile(
        thumbnail,
        'bookstore/thumbnails',
      );
      thumbnailUrl = result.url;
      thumbnailPublicId = result.publicId;
    }

    // Build update data object - only include fields that are provided
    const updateData: Record<string, unknown> = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.shortDescription !== undefined)
      updateData.shortDescription = dto.shortDescription;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.publicationDate !== undefined)
      updateData.publicationDate = new Date(dto.publicationDate);
    if (dto.edition !== undefined) updateData.edition = dto.edition;
    if (dto.language !== undefined) updateData.language = dto.language;
    if (dto.status !== undefined) updateData.status = dto.status;
    // If new thumbnail uploaded, use it; otherwise use the provided URL
    if (thumbnailUrl) {
      updateData.thumbnail = thumbnailUrl;
    } else if (dto.thumbnail !== undefined) {
      updateData.thumbnail = dto.thumbnail;
    }
    if (dto.publicationId !== undefined)
      updateData.publicationId = dto.publicationId;
    if (dto.subjectId !== undefined) updateData.subjectId = dto.subjectId;

    const book = await this.prisma.book.update({
      where: { id },
      data: updateData,
      include: {
        publication: true,
        subject: true,
        attachments: true,
      },
    });

    // Handle additional attachments
    if (attachments && attachments.length > 0 && cloudinaryService) {
      for (const file of attachments) {
        const result = await cloudinaryService.uploadFile(
          file,
          'bookstore/attachments',
        );
        await this.prisma.bookAttachment.create({
          data: {
            bookId: book.id,
            url: result.url,
            publicId: result.publicId,
            type: AttachmentType.IMAGE,
            sortOrder: 0,
          },
        });
      }
    }

    // If thumbnail was uploaded, also create a BookAttachment for it
    if (thumbnailUrl && thumbnailPublicId && cloudinaryService) {
      await this.prisma.bookAttachment.create({
        data: {
          bookId: book.id,
          url: thumbnailUrl,
          publicId: thumbnailPublicId,
          type: AttachmentType.THUMBNAIL,
          sortOrder: 0,
        },
      });
    }

    return {
      message: BookSuccessMessages.UPDATED,
      status: 'success',
      data: book,
    };
  }

  /**
   * Delete a book (soft delete)
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
      throw new ForbiddenException('Only administrators can delete books');
    }

    const book = await this.prisma.book.findUnique({
      where: { id, deletedAt: null },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Soft delete
    await this.prisma.book.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: BookSuccessMessages.DELETED,
      status: 'success',
      data: null,
    };
  }

  /**
   * Get books in tree structure: publications > subjects > books
   * Security: Public (returns only active, published books)
   */
  async getTree() {
    // Get all active publications
    const publications = await this.prisma.publication.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const result: {
      publication: {
        id: string;
        name: string;
        slug: string;
        isActive: boolean;
      };
      subjects: {
        subject: {
          id: string;
          name: string;
          slug: string;
          isActive: boolean;
        };
        books: {
          id: string;
          title: string;
          slug: string;
          priceRange: { min: number; max: number; display: string } | null;
          thumbnail: string | null;
        }[];
      }[];
    }[] = [];

    for (const pub of publications) {
      // Get all active subjects for this publication
      const subjects = await this.prisma.subject.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [{ publicationId: pub.id }, { publicationId: null }],
        },
        orderBy: { createdAt: 'desc' },
      });

      const subjectsWithBooks: {
        subject: {
          id: string;
          name: string;
          slug: string;
          isActive: boolean;
        };
        books: {
          id: string;
          title: string;
          slug: string;
          priceRange: { min: number; max: number; display: string } | null;
          thumbnail: string | null;
        }[];
      }[] = [];

      for (const subject of subjects) {
        // Get all published books for this subject and publication
        const books = await this.prisma.book.findMany({
          where: {
            deletedAt: null,
            status: BookStatus.PUBLISHED,
            publicationId: pub.id,
            subjectId: subject.id,
          },
          include: {
            papers: {
              where: { deletedAt: null },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (books.length > 0) {
          const mappedBooks = books.map((book) => ({
            id: book.id,
            title: book.title,
            slug: book.slug,
            priceRange: this.calculatePriceRange(book.papers),
            thumbnail: book.thumbnail,
          }));
          subjectsWithBooks.push({
            subject: {
              id: subject.id,
              name: subject.name,
              slug: subject.slug,
              isActive: subject.isActive,
            },
            books: mappedBooks,
          });
        }
      }

      if (subjectsWithBooks.length > 0) {
        result.push({
          publication: {
            id: pub.id,
            name: pub.name,
            slug: pub.slug,
            isActive: pub.isActive,
          },
          subjects: subjectsWithBooks,
        });
      }
    }

    return result;
  }

  private calculatePriceRange(papers: any[]): {
    min: number;
    max: number;
    display: string;
  } | null {
    if (!papers || papers.length === 0) return null;

    const now = new Date();
    const effectivePrices = papers.map((paper) => {
      const basePrice = Number(paper.price);
      if (
        paper.discountPrice &&
        paper.discountStartDate &&
        paper.discountEndDate &&
        now >= paper.discountStartDate &&
        now <= paper.discountEndDate
      ) {
        return Number(paper.discountPrice);
      }
      return basePrice;
    });

    if (effectivePrices.length === 0) return null;

    const min = Math.min(...effectivePrices);
    const max = Math.max(...effectivePrices);

    return {
      min,
      max,
      display: min === max ? `৳${min}` : `From ৳${min}`,
    };
  }
}