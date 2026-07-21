/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateTestOrderDto } from './dto/create-test-order.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import {
  Order,
  Role,
  OrderStatus,
  PaymentStatus,
  BookStatus,
} from '@prisma/client';
import { ReceiptService } from '../receipt/receipt.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private receiptService: ReceiptService,
  ) {}

  /**
   * Generate order number in format ORD-DDMMYY-XXX
   * where XXX is a daily sequence starting from 001
   */
  private async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const day = String(now.getUTCDate()).padStart(2, '0');
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const year = String(now.getUTCFullYear()).slice(-2);
    const datePrefix = `${day}${month}${year}`;

    // Find the last order for today to get the next sequence
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: `ORD-${datePrefix}-`,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
      select: {
        orderNumber: true,
      },
    });

    let sequence = 1;
    if (lastOrder) {
      const parts = lastOrder.orderNumber.split('-');
      const lastSequence = parseInt(parts[parts.length - 1], 10);
      sequence = lastSequence + 1;
    }

    return `ORD-${datePrefix}-${String(sequence).padStart(3, '0')}`;
  }

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
            paper: true,
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

    // Calculate totals using paper prices
    let subtotal = 0;
    const orderItemsData: any[] = [];

    for (const item of cart.cartItems) {
      // Get effective price from paper or book
      let unitPrice: number;

      if (item.paper) {
        const now = new Date();
        const paper = item.paper;

        if (
          paper.discountPrice &&
          paper.discountStartDate &&
          paper.discountEndDate &&
          now >= paper.discountStartDate &&
          now <= paper.discountEndDate
        ) {
          unitPrice = Number(paper.discountPrice);
        } else {
          unitPrice = Number(paper.price);
        }
      } else {
        // Fallback to book price (for backward compatibility or books without papers)
        const book = item.book as any;
        unitPrice = book.discountPrice
          ? Number(book.discountPrice)
          : Number(book.price);
      }

      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      const orderItem: any = {
        bookId: item.bookId,
        bookTitle: item.book.title,
        paperPrice: unitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      };

      if (item.paperId) {
        orderItem.paperId = item.paperId;
        orderItem.paperName = item.paper?.name;
      }

      orderItemsData.push(orderItem);
    }

    const discount = dto.discount ?? 0;
    const shipping = dto.shipping ?? 0;
    const total = subtotal - discount + shipping;

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

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
          create: orderItemsData,
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

    // Generate receipt asynchronously (don't block the response)
    this.receiptService.generate(order.id).catch((error) => {
      console.error('Failed to generate receipt:', error);
    });

    return {
      message: 'Order created successfully',
      status: 'success',
      data: order,
    };
  }

  /**
   * Create a test order directly (for testing purposes)
   * This endpoint creates address, cart items, and order in one request
   * Access: Authenticated users
   */
  async testOrder(
    dto: CreateTestOrderDto,
    userId: string,
  ): Promise<{
    message: string;
    status: string;
    data: Order;
  }> {
    // Validate all books exist and are published
    const bookIds = dto.items.map((item) => item.bookId);
    const books = await this.prisma.book.findMany({
      where: {
        id: { in: bookIds },
        deletedAt: null,
        status: BookStatus.PUBLISHED,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (books.length !== bookIds.length) {
      throw new BadRequestException(
        'One or more books not found or not available',
      );
    }

    // Validate papers if provided and get prices
    const paperPrices = new Map<
      string,
      {
        price: number;
        discountPrice?: number;
        discountStartDate?: Date;
        discountEndDate?: Date;
        name?: string;
      }
    >();
    for (const item of dto.items) {
      if (item.paperId) {
        const paper = await this.prisma.bookPaper.findUnique({
          where: {
            id: item.paperId,
            bookId: item.bookId,
            deletedAt: null,
            status: BookStatus.PUBLISHED,
          },
        });

        if (!paper) {
          throw new BadRequestException(
            `Paper not found for book ${item.bookId}`,
          );
        }

        paperPrices.set(item.paperId, {
          price: Number(paper.price),
          discountPrice: paper.discountPrice
            ? Number(paper.discountPrice)
            : undefined,
          discountStartDate: paper.discountStartDate || undefined,
          discountEndDate: paper.discountEndDate || undefined,
          name: paper.name,
        });
      }
    }

    // Create address
    const address = await this.prisma.address.create({
      data: {
        ...dto.address,
        userId,
      },
    });

    // Get or create cart
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    // Clear existing cart items
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // Create cart items
    for (const item of dto.items) {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          bookId: item.bookId,
          paperId: item.paperId,
          quantity: item.quantity,
        },
      });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItemsData: any[] = [];

    for (const item of dto.items) {
      let unitPrice: number;
      let paperName: string | undefined;

      if (item.paperId && paperPrices.has(item.paperId)) {
        const paper = paperPrices.get(item.paperId)!;
        const now = new Date();
        if (
          paper.discountPrice &&
          paper.discountStartDate &&
          paper.discountEndDate &&
          now >= paper.discountStartDate &&
          now <= paper.discountEndDate
        ) {
          unitPrice = paper.discountPrice;
        } else {
          unitPrice = paper.price;
        }
        paperName = paper.name;
      } else {
        // Fallback: get default paper price for the book
        const defaultPaper = await this.prisma.bookPaper.findFirst({
          where: {
            bookId: item.bookId,
            deletedAt: null,
            status: BookStatus.PUBLISHED,
          },
          orderBy: { sortOrder: 'asc' },
        });

        if (defaultPaper) {
          const now = new Date();
          if (
            defaultPaper.discountPrice &&
            defaultPaper.discountStartDate &&
            defaultPaper.discountEndDate &&
            now >= defaultPaper.discountStartDate &&
            now <= defaultPaper.discountEndDate
          ) {
            unitPrice = Number(defaultPaper.discountPrice);
          } else {
            unitPrice = Number(defaultPaper.price);
          }
          paperName = defaultPaper.name;
        } else {
          throw new BadRequestException(
            `No paper available for book ${item.bookId}`,
          );
        }
      }

      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      const book = books.find((b) => b.id === item.bookId)!;

      const orderItem: any = {
        bookId: item.bookId,
        bookTitle: book.title,
        paperPrice: unitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      };

      if (item.paperId) {
        orderItem.paperId = item.paperId;
        orderItem.paperName = paperName;
      }

      orderItemsData.push(orderItem);
    }

    const discount = dto.discount ?? 0;
    const shipping = dto.shipping ?? 0;
    const total = subtotal - discount + shipping;

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Create order with items
    const order = await this.prisma.order.create({
      data: {
        userId,
        addressId: address.id,
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
          create: orderItemsData,
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

    // Generate receipt asynchronously
    this.receiptService.generate(order.id).catch((error) => {
      console.error('Failed to generate receipt:', error);
    });

    return {
      message: 'Test order created successfully',
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
        user: true,
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
        orderItems: {
          include: {
            paper: true,
          },
        },
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
   * Valid order status transitions for fulfillment lifecycle
   */
  private static readonly VALID_TRANSITIONS: Record<
    OrderStatus,
    OrderStatus[]
  > = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [
      OrderStatus.PROCESSING,
      OrderStatus.CANCELLED,
      OrderStatus.RETURNED,
    ],
    [OrderStatus.PROCESSING]: [
      OrderStatus.SHIPPED,
      OrderStatus.CANCELLED,
      OrderStatus.RETURNED,
    ],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
    [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.RETURNED]: [],
  };

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

    const allowedTransitions = OrderService.VALID_TRANSITIONS[order.status];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${status}`,
      );
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

  /**
   * Update order shipping charge and recalculate total
   * Security: Admins only
   */
  async updateShipping(
    id: string,
    dto: UpdateShippingDto,
  ): Promise<{
    message: string;
    status: string;
    data: Order;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const subtotal = Number(order.subtotal);
    const discount = Number(order.discount) || 0;
    const shipping = dto.shipping;
    const total = subtotal - discount + shipping;

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { shipping, total },
    });

    return {
      message: 'Order shipping updated successfully',
      status: 'success',
      data: updatedOrder,
    };
  }
}
