/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review, Role, BookStatus } from '@prisma/client';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new review
   * Security: Admins only
   */
  async create(
    dto: CreateReviewDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Review;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can create reviews');
    }

    // Check if book exists
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId, deletedAt: null },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    const review = await this.prisma.review.create({
      data: {
        bookId: dto.bookId,
        reviewerName: dto.reviewerName,
        designation: dto.designation,
        rating: dto.rating,
        comment: dto.comment,
        displayOrder: dto.displayOrder ?? 0,
        status: BookStatus.PUBLISHED,
      },
    });

    return {
      message: 'Review created successfully',
      status: 'success',
      data: review,
    };
  }

  /**
   * Get all reviews for a book
   * Security: Public
   */
  async findAll(
    bookId: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Review[];
  }> {
    const where =
      requestingUserRole === Role.ADMIN
        ? { bookId }
        : { bookId, book: { deletedAt: null, status: BookStatus.PUBLISHED } };

    const reviews = await this.prisma.review.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });

    return {
      message:
        reviews.length > 0
          ? 'Reviews retrieved successfully'
          : 'No reviews found',
      status: 'success',
      data: reviews,
    };
  }

  /**
   * Get a single review by ID
   * Security: Public
   */
  async findOne(
    id: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Review;
  }> {
    const where =
      requestingUserRole === Role.ADMIN
        ? { id }
        : { id, book: { deletedAt: null, status: BookStatus.PUBLISHED } };

    const review = await this.prisma.review.findUnique({
      where,
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return {
      message: 'Review retrieved successfully',
      status: 'success',
      data: review,
    };
  }

  /**
   * Update a review
   * Security: Admins only
   */
  async update(
    id: string,
    dto: UpdateReviewDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Review;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can update reviews');
    }

    const existingReview = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!existingReview) {
      throw new NotFoundException('Review not found');
    }

    const review = await this.prisma.review.update({
      where: { id },
      data: {
        reviewerName: dto.reviewerName,
        designation: dto.designation,
        rating: dto.rating,
        comment: dto.comment,
        displayOrder: dto.displayOrder,
      },
    });

    return {
      message: 'Review updated successfully',
      status: 'success',
      data: review,
    };
  }

  /**
   * Delete a review (soft delete)
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
      throw new ForbiddenException('Only administrators can delete reviews');
    }

    const review = await this.prisma.review.findUnique({
      where: { id, book: { deletedAt: null } },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Soft delete
    await this.prisma.review.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Review deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
