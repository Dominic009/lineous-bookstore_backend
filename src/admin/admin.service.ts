/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, BookStatus, Role } from '@prisma/client';
import {
  AnalyticsPeriod,
  GroupBy,
  SalesPeriod,
} from './dto/analytics-query.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get dashboard overview with all KPIs and stats
   */
  async getDashboardOverview() {
    const [
      totalProducts,
      totalOrders,
      totalSales,
      totalCustomers,
      totalSubjects,
      totalPublications,
      pendingOrders,
      lowStockBooks,
      orderStatusBreakdown,
      topSellingBooks,
      recentOrders,
      todaySales,
      weekSales,
      monthSales,
    ] = await Promise.all([
      this.getTotalProducts(),
      this.getTotalOrders(),
      this.getTotalSales(),
      this.getTotalCustomers(),
      this.getTotalSubjects(),
      this.getTotalPublications(),
      this.getPendingOrders(),
      this.getLowStockBooks(),
      this.getOrderStatusBreakdown(),
      this.getTopSellingBooks(5),
      this.getRecentOrders(5),
      this.getSalesForPeriod(SalesPeriod.DAY),
      this.getSalesForPeriod(SalesPeriod.WEEK),
      this.getSalesForPeriod(SalesPeriod.MONTH),
    ]);

    return {
      status: 'success',
      data: {
        kpis: {
          totalProducts,
          totalOrders,
          totalSales,
          totalCustomers,
          totalSubjects,
          totalPublications,
          pendingOrders,
          lowStockBooks,
        },
        orderStatusBreakdown,
        topSellingBooks,
        recentOrders,
        salesTrend: {
          today: todaySales.totalSales,
          thisWeek: weekSales.totalSales,
          thisMonth: monthSales.totalSales,
        },
      },
    };
  }

  /**
   * Get total products count (non-deleted)
   */
  private async getTotalProducts(): Promise<number> {
    const result = await this.prisma.book.count({
      where: { deletedAt: null },
    });
    return result;
  }

  /**
   * Get total orders count (non-deleted)
   */
  private async getTotalOrders(): Promise<number> {
    const result = await this.prisma.order.count({
      where: { deletedAt: null },
    });
    return result;
  }

  /**
   * Get total sales (sum of delivered orders only)
   */
  private async getTotalSales(): Promise<number> {
    const result = await this.prisma.order.aggregate({
      where: {
        status: OrderStatus.DELIVERED,
        deletedAt: null,
      },
      _sum: { total: true },
    });
    return Number(result._sum.total || 0);
  }

  /**
   * Get total customers count (users with USER role, non-deleted)
   */
  private async getTotalCustomers(): Promise<number> {
    const result = await this.prisma.user.count({
      where: {
        role: Role.USER,
        deletedAt: null,
      },
    });
    return result;
  }

  /**
   * Get total subjects count (active, non-deleted)
   */
  private async getTotalSubjects(): Promise<number> {
    const result = await this.prisma.subject.count({
      where: {
        isActive: true,
        deletedAt: null,
      },
    });
    return result;
  }

  /**
   * Get total publications count (active, non-deleted)
   */
  private async getTotalPublications(): Promise<number> {
    const result = await this.prisma.publication.count({
      where: {
        isActive: true,
        deletedAt: null,
      },
    });
    return result;
  }

  /**
   * Get pending orders count
   */
  private async getPendingOrders(): Promise<number> {
    const result = await this.prisma.order.count({
      where: {
        status: OrderStatus.PENDING,
        deletedAt: null,
      },
    });
    return result;
  }

  /**
   * Get low stock books count (stock <= 10)
   */
  private async getLowStockBooks(): Promise<number> {
    const result = await this.prisma.bookPaper.count({
      where: {
        stock: { lte: 10 },
        deletedAt: null,
        status: BookStatus.PUBLISHED,
      },
    });
    return result;
  }

  /**
   * Get order status breakdown with counts and percentages
   */
  private async getOrderStatusBreakdown() {
    const statuses = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.RETURNED,
    ];

    const counts = await this.prisma.order.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    const totalOrders = counts.reduce((sum, item) => sum + item._count.id, 0);

    const breakdown = statuses.map((status) => {
      const found = counts.find((c) => c.status === status);
      const count = found ? found._count.id : 0;
      const percentage = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
      return {
        status,
        count,
        percentage: Math.round(percentage * 10) / 10,
      };
    });

    return breakdown;
  }

  /**
   * Get top selling books
   */
  private async getTopSellingBooks(
    limit: number = 20,
    period?: AnalyticsPeriod,
  ) {
    // First get delivered order IDs in the period
    const orderWhere: any = {
      status: OrderStatus.DELIVERED,
      deletedAt: null,
    };

    if (period && period !== AnalyticsPeriod.ALL) {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case AnalyticsPeriod.DAY:
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case AnalyticsPeriod.WEEK:
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case AnalyticsPeriod.MONTH:
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate = new Date(0);
      }

      orderWhere.createdAt = { gte: startDate };
    }

    const deliveredOrders = await this.prisma.order.findMany({
      where: orderWhere,
      select: { id: true },
    });

    const orderIds = deliveredOrders.map((o) => o.id);

    if (orderIds.length === 0) {
      return [];
    }

    // Get order items grouped by book
    const orderItems = await this.prisma.orderItem.groupBy({
      by: ['bookId'],
      where: {
        orderId: { in: orderIds },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    // Fetch book details
    const bookIds = orderItems.map((b) => b.bookId);
    const books = await this.prisma.book.findMany({
      where: {
        id: { in: bookIds },
        deletedAt: null,
      },
      include: {
        publication: { select: { name: true } },
        subject: { select: { name: true } },
        attachments: {
          where: { type: 'THUMBNAIL', deletedAt: null },
          take: 1,
          select: { url: true },
        },
      },
    });

    const bookMap = new Map(books.map((b) => [b.id, b]));

    return orderItems.map((item, index) => {
      const book = bookMap.get(item.bookId);
      return {
        rank: index + 1,
        bookId: item.bookId,
        title: book?.title || 'Unknown',
        publication: book?.publication?.name || 'Unknown',
        subject: book?.subject?.name || 'Unknown',
        totalQuantitySold: item._sum.quantity || 0,
        totalRevenue: Number(item._sum.subtotal || 0),
        coverImage: book?.attachments?.[0]?.url || null,
      };
    });
  }

  /**
   * Get recent orders
   */
  private async getRecentOrders(limit: number = 10) {
    const orders = await this.prisma.order.findMany({
      where: { deletedAt: null },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        orderNumber: true,
        total: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return orders.map((order) => ({
      orderNumber: order.orderNumber,
      customerName:
        `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() ||
        'Unknown',
      total: Number(order.total),
      status: order.status,
      createdAt: order.createdAt,
    }));
  }

  /**
   * Get sales for a specific period (day, week, month)
   * Only counts DELIVERED orders
   */
  async getSalesForPeriod(period: SalesPeriod, date?: Date) {
    const now = date || new Date();
    let startDate: Date;

    // Convert to Dhaka timezone (UTC+6) for day boundaries
    const dhakaOffset = 6 * 60 * 60 * 1000;
    const dhakaNow = new Date(now.getTime() + dhakaOffset);

    switch (period) {
      case SalesPeriod.DAY:
        // Start of day in Dhaka timezone
        startDate = new Date(dhakaNow);
        startDate.setUTCHours(18, 0, 0, 0);
        startDate = new Date(startDate.getTime() - dhakaOffset);
        break;
      case SalesPeriod.WEEK:
        // Start of week (7 days ago)
        startDate = new Date(dhakaNow);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setUTCHours(0, 0, 0, 0);
        startDate = new Date(startDate.getTime() - dhakaOffset);
        break;
      case SalesPeriod.MONTH:
        // Start of month
        startDate = new Date(dhakaNow);
        startDate.setDate(1);
        startDate.setUTCHours(0, 0, 0, 0);
        startDate = new Date(startDate.getTime() - dhakaOffset);
        break;
      default:
        startDate = new Date(0);
    }

    const result = await this.prisma.order.aggregate({
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: { gte: startDate },
        deletedAt: null,
      },
      _sum: { total: true },
      _count: { id: true },
    });

    return {
      period,
      totalSales: Number(result._sum.total || 0),
      totalOrders: result._count.id,
      currency: 'BDT',
    };
  }

  /**
   * Get sales analytics with time series data
   */
  async getSalesAnalytics(queryDto: {
    period: AnalyticsPeriod;
    startDate?: string;
    endDate?: string;
    groupBy: GroupBy;
  }) {
    const { period, startDate, endDate, groupBy } = queryDto;

    // Calculate date range using Dhaka timezone (UTC+6)
    const now = new Date();
    const dhakaOffset = 6 * 60 * 60 * 1000;
    const dhakaNow = new Date(now.getTime() + dhakaOffset);
    let rangeStart: Date;
    let rangeEnd: Date = now;

    switch (period) {
      case AnalyticsPeriod.DAY:
        // Start of day in Dhaka timezone
        rangeStart = new Date(dhakaNow);
        rangeStart.setUTCHours(18, 0, 0, 0); // UTC midnight = Dhaka 00:00
        rangeStart = new Date(rangeStart.getTime() - dhakaOffset);
        break;
      case AnalyticsPeriod.WEEK:
        rangeStart = new Date(dhakaNow);
        rangeStart.setDate(rangeStart.getDate() - 7);
        rangeStart.setUTCHours(0, 0, 0, 0);
        rangeStart = new Date(rangeStart.getTime() - dhakaOffset);
        break;
      case AnalyticsPeriod.MONTH:
        rangeStart = new Date(dhakaNow);
        rangeStart.setDate(1);
        rangeStart.setUTCHours(0, 0, 0, 0);
        rangeStart = new Date(rangeStart.getTime() - dhakaOffset);
        break;
      case AnalyticsPeriod.YEAR:
        rangeStart = new Date(dhakaNow);
        rangeStart.setMonth(0, 1);
        rangeStart.setUTCHours(0, 0, 0, 0);
        rangeStart = new Date(rangeStart.getTime() - dhakaOffset);
        break;
      case AnalyticsPeriod.CUSTOM:
        if (!startDate || !endDate) {
          throw new Error(
            'startDate and endDate are required for custom period',
          );
        }
        rangeStart = new Date(startDate);
        rangeEnd = new Date(endDate);
        break;
      default:
        rangeStart = new Date(0);
    }

    // Get summary stats
    const summary = await this.prisma.order.aggregate({
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: { gte: rangeStart, lte: rangeEnd },
        deletedAt: null,
      },
      _sum: { total: true },
      _count: { id: true },
    });

    // Get order items for items sold count
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          status: OrderStatus.DELIVERED,
          createdAt: { gte: rangeStart, lte: rangeEnd },
          deletedAt: null,
        },
      },
      select: { quantity: true },
    });

    const totalItemsSold = orderItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const totalRevenue = Number(summary._sum.total || 0);
    const totalOrders = summary._count.id;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Generate time series data
    const timeSeriesData = await this.generateTimeSeriesData(
      rangeStart,
      rangeEnd,
      groupBy,
    );

    // Get top products
    const deliveredOrderIds = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: { gte: rangeStart, lte: rangeEnd },
        deletedAt: null,
      },
      select: { id: true },
    });

    const deliveredOrderIdsList = deliveredOrderIds.map((o) => o.id);

    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['bookId'],
      where: {
        orderId: { in: deliveredOrderIdsList },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    // Get book titles for top products
    const bookIds = topProducts.map((p) => p.bookId);
    const books = await this.prisma.book.findMany({
      where: { id: { in: bookIds }, deletedAt: null },
      select: { id: true, title: true },
    });
    const bookMap = new Map(books.map((b) => [b.id, b.title]));

    const topProductsFormatted = topProducts.map((item, index) => ({
      rank: index + 1,
      bookId: item.bookId,
      title: bookMap.get(item.bookId) || 'Unknown',
      quantitySold: item._sum.quantity || 0,
      revenue: Number(item._sum.subtotal || 0),
    }));

    // Get payment method breakdown
    const paymentBreakdown = await this.prisma.order.groupBy({
      by: ['paymentMethod'],
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: { gte: rangeStart, lte: rangeEnd },
        deletedAt: null,
        paymentMethod: { not: null },
      },
      _sum: { total: true },
      _count: { id: true },
    });

    const paymentMethodBreakdown = paymentBreakdown.map((item) => ({
      method: item.paymentMethod || 'UNKNOWN',
      count: item._count.id,
      revenue: Number(item._sum.total || 0),
    }));

    return {
      period,
      dateRange: {
        start: rangeStart.toISOString().split('T')[0],
        end: rangeEnd.toISOString().split('T')[0],
      },
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        totalItemsSold,
      },
      timeSeriesData,
      topProducts: topProductsFormatted,
      paymentMethodBreakdown,
    };
  }

  /**
   * Generate time series data for charts
   */
  private async generateTimeSeriesData(
    startDate: Date,
    endDate: Date,
    groupBy: GroupBy,
  ) {
    const data: { date: string; revenue: number; orders: number }[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      let periodStart: Date;
      let periodEnd: Date;
      let dateLabel: string;

      switch (groupBy) {
        case GroupBy.DAY:
          periodStart = new Date(current);
          periodStart.setHours(0, 0, 0, 0);
          periodEnd = new Date(current);
          periodEnd.setHours(23, 59, 59, 999);
          dateLabel = current.toISOString().split('T')[0];
          current.setDate(current.getDate() + 1);
          break;
        case GroupBy.WEEK:
          periodStart = new Date(current);
          periodStart.setDate(current.getDate() - current.getDay());
          periodStart.setHours(0, 0, 0, 0);
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodStart.getDate() + 6);
          periodEnd.setHours(23, 59, 59, 999);
          dateLabel = `Week of ${periodStart.toISOString().split('T')[0]}`;
          current.setDate(current.getDate() + 7);
          break;
        case GroupBy.MONTH:
          periodStart = new Date(current.getFullYear(), current.getMonth(), 1);
          periodEnd = new Date(
            current.getFullYear(),
            current.getMonth() + 1,
            0,
          );
          periodEnd.setHours(23, 59, 59, 999);
          dateLabel = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          current.setMonth(current.getMonth() + 1);
          break;
      }

      const result = await this.prisma.order.aggregate({
        where: {
          status: OrderStatus.DELIVERED,
          createdAt: { gte: periodStart, lte: periodEnd },
          deletedAt: null,
        },
        _sum: { total: true },
        _count: { id: true },
      });

      data.push({
        date: dateLabel,
        revenue: Number(result._sum.total || 0),
        orders: result._count.id,
      });
    }

    return data;
  }

  /**
   * Get top selling books with optional period filter
   */
  async getTopSellingBooksService(
    limit: number = 20,
    period: AnalyticsPeriod = AnalyticsPeriod.ALL,
  ) {
    return this.getTopSellingBooks(limit, period);
  }

  /**
   * Get order status statistics
   */
  async getOrderStatusStats() {
    const breakdown = await this.getOrderStatusBreakdown();
    const totalOrders = breakdown.reduce((sum, item) => sum + item.count, 0);

    return {
      stats: breakdown,
      totalOrders,
    };
  }

  /**
   * Get inventory overview
   */
  async getInventoryOverview() {
    const [
      totalBooks,
      publishedBooks,
      draftBooks,
      archivedBooks,
      outOfStock,
      lowStock,
      lowStockBooks,
      outOfStockBooks,
    ] = await Promise.all([
      this.prisma.book.count({ where: { deletedAt: null } }),
      this.prisma.book.count({
        where: { status: BookStatus.PUBLISHED, deletedAt: null },
      }),
      this.prisma.book.count({
        where: { status: BookStatus.DRAFT, deletedAt: null },
      }),
      this.prisma.book.count({
        where: { status: BookStatus.ARCHIVED, deletedAt: null },
      }),
      this.prisma.bookPaper.count({
        where: { stock: 0, deletedAt: null, status: BookStatus.PUBLISHED },
      }),
      this.prisma.bookPaper.count({
        where: {
          stock: { gt: 0, lte: 10 },
          deletedAt: null,
          status: BookStatus.PUBLISHED,
        },
      }),
      this.prisma.bookPaper.findMany({
        where: {
          stock: { gt: 0, lte: 10 },
          deletedAt: null,
          status: BookStatus.PUBLISHED,
        },
        include: {
          book: {
            select: { id: true, title: true },
          },
        },
        take: 20,
      }),
      this.prisma.bookPaper.findMany({
        where: { stock: 0, deletedAt: null, status: BookStatus.PUBLISHED },
        include: {
          book: {
            select: { id: true, title: true },
          },
        },
        take: 20,
      }),
    ]);

    return {
      summary: {
        totalBooks,
        publishedBooks,
        draftBooks,
        archivedBooks,
        outOfStock,
        lowStock,
      },
      lowStockBooks: lowStockBooks.map((item) => ({
        bookId: item.book.id,
        title: item.book.title,
        paperName: item.name,
        currentStock: item.stock,
        threshold: 10,
      })),
      outOfStockBooks: outOfStockBooks.map((item) => ({
        bookId: item.book.id,
        title: item.book.title,
        paperName: item.name,
      })),
    };
  }

  /**
   * Get customer insights
   */
  async getCustomerInsights(period: AnalyticsPeriod = AnalyticsPeriod.MONTH) {
    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case AnalyticsPeriod.MONTH:
        periodStart = new Date(now);
        periodStart.setMonth(periodStart.getMonth() - 1);
        break;
      case AnalyticsPeriod.YEAR:
        periodStart = new Date(now);
        periodStart.setFullYear(periodStart.getFullYear() - 1);
        break;
      default:
        periodStart = new Date(0);
    }

    const [
      totalCustomers,
      newCustomersThisMonth,
      activeCustomers,
      repeatCustomers,
      topCustomers,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: Role.USER, deletedAt: null },
      }),
      this.prisma.user.count({
        where: {
          role: Role.USER,
          createdAt: { gte: periodStart },
          deletedAt: null,
        },
      }),
      this.getActiveCustomersCount(),
      this.getRepeatCustomersCount(),
      this.getTopCustomers(10),
    ]);

    return {
      summary: {
        totalCustomers,
        newCustomersThisMonth,
        activeCustomers,
        repeatCustomers,
      },
      topCustomers,
    };
  }

  /**
   * Get count of active customers (users with at least one order)
   */
  private async getActiveCustomersCount(): Promise<number> {
    // Get all unique user IDs from delivered orders
    const orders = await this.prisma.order.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        userId: true,
      },
    });

    const uniqueUserIds = new Set(orders.map((o) => o.userId));
    return uniqueUserIds.size;
  }

  /**
   * Get count of repeat customers (2+ delivered orders)
   */
  private async getRepeatCustomersCount(): Promise<number> {
    // Get all delivered orders grouped by userId
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        deletedAt: null,
      },
      select: {
        userId: true,
      },
    });

    // Count orders per user
    const userOrderCount = new Map<string, number>();
    for (const order of orders) {
      const count = userOrderCount.get(order.userId) || 0;
      userOrderCount.set(order.userId, count + 1);
    }

    // Count users with 2+ orders
    let repeatCount = 0;
    for (const count of userOrderCount.values()) {
      if (count >= 2) {
        repeatCount++;
      }
    }

    return repeatCount;
  }

  /**
   * Get top customers by spending
   */
  private async getTopCustomers(limit: number) {
    // Get all delivered orders with user info
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        deletedAt: null,
      },
      select: {
        userId: true,
        total: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Group by user
    const customerMap = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        totalOrders: number;
        totalSpent: number;
        lastOrderAt: Date;
      }
    >();

    for (const order of orders) {
      const existing = customerMap.get(order.userId);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent += Number(order.total);
        if (new Date(order.createdAt) > new Date(existing.lastOrderAt)) {
          existing.lastOrderAt = order.createdAt;
        }
      } else {
        customerMap.set(order.userId, {
          userId: order.userId,
          name:
            `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() ||
            'Unknown',
          email: order.user.email,
          totalOrders: 1,
          totalSpent: Number(order.total),
          lastOrderAt: order.createdAt,
        });
      }
    }

    // Convert to array, sort by totalSpent, and take top N
    const sortedCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);

    return sortedCustomers;
  }
}
