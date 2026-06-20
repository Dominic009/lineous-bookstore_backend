/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Wishlist, BookStatus } from '@prisma/client';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the authenticated user's wishlist
   * Security: Authenticated users
   */
  async getWishlist(userId: string): Promise<{
    message: string;
    status: string;
    data: Wishlist[];
  }> {
    const wishlist = await this.prisma.wishlist.findMany({
      where: {
        userId,
        book: { deletedAt: null, status: BookStatus.PUBLISHED },
      },
      include: {
        book: true,
      },
    });

    return {
      message:
        wishlist.length > 0
          ? 'Wishlist retrieved successfully'
          : 'No items in wishlist',
      status: 'success',
      data: wishlist,
    };
  }

  /**
   * Add a book to wishlist
   * Security: Authenticated users
   */
  async addToWishlist(
    bookId: string,
    userId: string,
  ): Promise<{
    message: string;
    status: string;
    data: Wishlist;
  }> {
    // Check if book exists and is published
    const book = await this.prisma.book.findUnique({
      where: { id: bookId, deletedAt: null, status: BookStatus.PUBLISHED },
    });

    if (!book) {
      throw new NotFoundException('Book not found or not available');
    }

    // Check if already in wishlist
    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });

    if (existing) {
      return {
        message: 'Book already in wishlist',
        status: 'success',
        data: existing,
      };
    }

    const wishlistItem = await this.prisma.wishlist.create({
      data: {
        userId,
        bookId,
      },
    });

    return {
      message: 'Book added to wishlist successfully',
      status: 'success',
      data: wishlistItem,
    };
  }

  /**
   * Remove a book from wishlist
   * Security: Authenticated users
   */
  async removeFromWishlist(
    bookId: string,
    userId: string,
  ): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    const wishlistItem = await this.prisma.wishlist.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Book not found in wishlist');
    }

    await this.prisma.wishlist.delete({
      where: { userId_bookId: { userId, bookId } },
    });

    return {
      message: 'Book removed from wishlist successfully',
      status: 'success',
      data: null,
    };
  }
}
