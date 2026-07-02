/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { Cart, CartItem, BookStatus, BookPaper } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the authenticated user's cart
   * Security: Authenticated users
   */
  async getCart(userId: string): Promise<{
    message: string;
    status: string;
    data: Cart & { cartItems: CartItem[] };
  }> {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        cartItems: {
          include: {
            book: true,
            paper: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          cartItems: {
            include: {
              book: true,
              paper: true,
            },
          },
        },
      });
    }

    return {
      message: 'Cart retrieved successfully',
      status: 'success',
      data: cart,
    };
  }

  /**
   * Add a book to cart
   * Security: Authenticated users
   */
  async addToCart(
    dto: AddToCartDto,
    userId: string,
  ): Promise<{
    message: string;
    status: string;
    data: Cart;
  }> {
    // Check if book exists and is published
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId, deletedAt: null, status: BookStatus.PUBLISHED },
    });

    if (!book) {
      throw new NotFoundException('Book not found or not available');
    }

    // Validate paper if provided
    let paper: BookPaper | null = null;
    if (dto.paperId) {
      paper = await this.prisma.bookPaper.findUnique({
        where: {
          id: dto.paperId,
          bookId: dto.bookId,
          deletedAt: null,
          status: BookStatus.PUBLISHED,
        },
      });

      if (!paper) {
        throw new NotFoundException('Paper not found or not available');
      }

      if (paper.stock < dto.quantity) {
        throw new ConflictException('Not enough stock available');
      }
    }

    // Get or create cart
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    // Check if item already exists in cart (match paper too)
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        bookId: dto.bookId,
        ...(dto.paperId && { paperId: dto.paperId }),
      },
    });

    if (existingItem) {
      // Update quantity
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: { increment: dto.quantity } },
      });
    } else {
      // Create new cart item
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          bookId: dto.bookId,
          paperId: dto.paperId,
          quantity: dto.quantity,
        },
      });
    }

    return {
      message: 'Book added to cart successfully',
      status: 'success',
      data: cart,
    };
  }

  /**
   * Update cart item quantity
   * Security: Authenticated users
   */
  async updateCartItem(
    cartItemId: string,
    quantity: number,
    userId: string,
  ): Promise<{
    message: string;
    status: string;
    data: CartItem;
  }> {
    // Check if cart item belongs to user
    const cartItem = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    const updatedItem = await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    return {
      message: 'Cart item updated successfully',
      status: 'success',
      data: updatedItem,
    };
  }

  /**
   * Remove a book from cart
   * Security: Authenticated users
   */
  async removeFromCart(
    cartItemId: string,
    userId: string,
  ): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    // Check if cart item belongs to user
    const cartItem = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return {
      message: 'Book removed from cart successfully',
      status: 'success',
      data: null,
    };
  }

  /**
   * Clear the cart
   * Security: Authenticated users
   */
  async clearCart(userId: string): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return {
      message: 'Cart cleared successfully',
      status: 'success',
      data: null,
    };
  }
}
