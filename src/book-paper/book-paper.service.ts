/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookPaperDto } from './dto/create-book-paper.dto';
import { UpdateBookPaperDto } from './dto/update-book-paper.dto';
import { BookPaper, Role, BookStatus } from '@prisma/client';

@Injectable()
export class BookPaperService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateBookPaperDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: BookPaper;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can create book papers',
      );
    }

    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId, deletedAt: null },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (dto.isbn) {
      const existing = await this.prisma.bookPaper.findUnique({
        where: { isbn: dto.isbn },
      });
      if (existing) {
        throw new ConflictException('Paper with this ISBN already exists');
      }
    }

    if (dto.isDefault) {
      await this.prisma.bookPaper.updateMany({
        where: { bookId: dto.bookId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const paper = await this.prisma.bookPaper.create({
      data: {
        bookId: dto.bookId,
        code: dto.code,
        name: dto.name,
        price: dto.price,
        discountPrice: dto.discountPrice,
        discountStartDate: dto.discountStartDate
          ? new Date(dto.discountStartDate)
          : undefined,
        discountEndDate: dto.discountEndDate
          ? new Date(dto.discountEndDate)
          : undefined,
        stock: dto.stock ?? 0,
        isbn: dto.isbn,
        pageCount: dto.pageCount,
        thumbnail: dto.thumbnail,
        sortOrder: dto.sortOrder ?? 0,
        isDefault: dto.isDefault ?? false,
        status: dto.status || BookStatus.PUBLISHED,
      },
      include: { book: true },
    });

    return {
      message: 'Book paper created successfully',
      status: 'success',
      data: paper,
    };
  }

  async findAll(
    bookId: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: BookPaper[];
  }> {
    const where: any = { bookId };
    if (requestingUserRole !== Role.ADMIN) {
      where.deletedAt = null;
      where.status = BookStatus.PUBLISHED;
    }

    const papers = await this.prisma.bookPaper.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return {
      message:
        papers.length > 0
          ? 'Book papers retrieved successfully'
          : 'No papers found',
      status: 'success',
      data: papers.map((paper) => this.calculateEffectivePrice(paper)),
    };
  }

  async findOne(
    id: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: BookPaper;
  }> {
    const paper =
      requestingUserRole === Role.ADMIN
        ? await this.prisma.bookPaper.findUnique({ where: { id } })
        : await this.prisma.bookPaper.findFirst({
            where: {
              id,
              book: { deletedAt: null, status: BookStatus.PUBLISHED },
            },
          });

    if (!paper) {
      throw new NotFoundException('Book paper not found');
    }

    return {
      message: 'Book paper retrieved successfully',
      status: 'success',
      data: this.calculateEffectivePrice(paper),
    };
  }

  async update(
    id: string,
    dto: UpdateBookPaperDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: BookPaper;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can update book papers',
      );
    }

    const existing = await this.prisma.bookPaper.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Book paper not found');
    }

    if (dto.isbn && dto.isbn !== existing.isbn) {
      const exists = await this.prisma.bookPaper.findUnique({
        where: { isbn: dto.isbn },
      });
      if (exists) {
        throw new ConflictException('ISBN already in use');
      }
    }

    if (dto.isDefault) {
      await this.prisma.bookPaper.updateMany({
        where: { bookId: existing.bookId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const paper = await this.prisma.bookPaper.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        price: dto.price,
        discountPrice: dto.discountPrice,
        discountStartDate: dto.discountStartDate
          ? new Date(dto.discountStartDate)
          : undefined,
        discountEndDate: dto.discountEndDate
          ? new Date(dto.discountEndDate)
          : undefined,
        stock: dto.stock,
        isbn: dto.isbn,
        pageCount: dto.pageCount,
        thumbnail: dto.thumbnail,
        sortOrder: dto.sortOrder,
        isDefault: dto.isDefault,
        status: dto.status,
      },
    });

    return {
      message: 'Book paper updated successfully',
      status: 'success',
      data: paper,
    };
  }

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
        'Only administrators can delete book papers',
      );
    }

    const paper = await this.prisma.bookPaper.findUnique({
      where: { id, book: { deletedAt: null } },
    });

    if (!paper) {
      throw new NotFoundException('Book paper not found');
    }

    await this.prisma.bookPaper.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Book paper deleted successfully',
      status: 'success',
      data: null,
    };
  }

  private calculateEffectivePrice(paper: any): BookPaper & {
    effectivePrice: number;
    isInStock: boolean;
  } {
    const now = new Date();
    let effectivePrice = Number(paper.price);

    if (
      paper.discountPrice &&
      paper.discountStartDate &&
      paper.discountEndDate &&
      now >= paper.discountStartDate &&
      now <= paper.discountEndDate
    ) {
      effectivePrice = Number(paper.discountPrice);
    }

    return {
      ...paper,
      effectivePrice,
      isInStock: paper.stock > 0,
    };
  }
}
