/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  Order,
  //   OrderItem,
  Role,
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new order from cart
   * Security: Authenticated users
   */
  async create(
    dto: CreateOrderDto,
    userId: string,
  ): Promise<{
    message: string;
    status: string;
    data: Order;
  }> {
    // Get user's cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        cartItems: {
          include: {
            book: true,
          },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      throw new NotFoundException('Cart is empty');
    }

    // Check if address exists and belongs to user
    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId, userId, deletedAt: null },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of cart.cartItems) {
      const price = item.book.discountPrice || item.book.price;
      subtotal += Number(price) * item.quantity;
    }

    const discount = dto.discount ?? 0;
    const shipping = dto.shipping ?? 0;
    const total = subtotal - discount + shipping;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create order with items
    const order = await this.prisma.order.create({
      data: {
        userId,
        addressId: dto.addressId,
        orderNumber,
        subtotal,
        discount,
        shipping,
        total,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        orderItems: {
          create: cart.cartItems.map((item) => ({
            bookId: item.bookId,
            bookTitle: item.book.title,
            bookPrice: item.book.discountPrice || item.book.price,
            quantity: item.quantity,
            subtotal:
              Number(item.book.discountPrice || item.book.price) *
              item.quantity,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });

    // Clear cart
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return {
      message: 'Order created successfully',
      status: 'success',
      data: order,
    };
  }

  /**
   * Get all orders for the authenticated user
   * Security: Authenticated users
   */
  async findAll(
    userId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Order[];
  }> {
    const where = requestingUserRole === Role.ADMIN ? {} : { userId };

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: true,
      },
    });

    return {
      message:
        orders.length > 0 ? 'Orders retrieved successfully' : 'No orders found',
      status: 'success',
      data: orders,
    };
  }

  /**
   * Get a single order by ID
   * Security: Authenticated users (own order) or Admins
   */
  async findOne(
    id: string,
    userId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Order;
  }> {
    const where = requestingUserRole === Role.ADMIN ? { id } : { id, userId };

    const order = await this.prisma.order.findUnique({
      where,
      include: {
        orderItems: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      message: 'Order retrieved successfully',
      status: 'success',
      data: order,
    };
  }

  /**
   * Update order status
   * Security: Admins only
   */
  async updateStatus(
    id: string,
    status: OrderStatus,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Order;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can update order status',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status },
    });

    return {
      message: 'Order status updated successfully',
      status: 'success',
      data: updatedOrder,
    };
  }
}
