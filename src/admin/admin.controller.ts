/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';
import {
  AnalyticsQueryDto,
  TopBooksQueryDto,
  SalesPeriodQueryDto,
  CustomerInsightsQueryDto,
  AnalyticsPeriod,
  GroupBy,
} from './dto/analytics-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get dashboard overview
   * Access: Admin only
   */
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardOverview();
  }

  /**
   * Get sales analytics
   * Access: Admin only
   */
  @Get('analytics/sales')
  getSalesAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.adminService.getSalesAnalytics({
      period: query.period || AnalyticsPeriod.MONTH,
      startDate: query.startDate,
      endDate: query.endDate,
      groupBy: query.groupBy || GroupBy.DAY,
    });
  }

  /**
   * Get top selling books
   * Access: Admin only
   */
  @Get('books/top-selling')
  getTopSellingBooks(@Query() query: TopBooksQueryDto) {
    const period = query.period;
    return this.adminService.getTopSellingBooksService(
      query.limit || 20,
      period,
    );
  }

  /**
   * Get order status statistics
   * Access: Admin only
   */
  @Get('orders/status-stats')
  getOrderStatusStats() {
    return this.adminService.getOrderStatusStats();
  }

  /**
   * Get sales for a specific period
   * Access: Admin only
   */
  @Get('sales/period')
  getSalesByPeriod(@Query() query: SalesPeriodQueryDto) {
    const date = query.date ? new Date(query.date) : undefined;
    return this.adminService.getSalesForPeriod(query.period, date);
  }

  /**
   * Get inventory overview
   * Access: Admin only
   */
  @Get('inventory/overview')
  getInventoryOverview() {
    return this.adminService.getInventoryOverview();
  }

  /**
   * Get customer insights
   * Access: Admin only
   */
  @Get('analytics/customers')
  getCustomerInsights(@Query() query: CustomerInsightsQueryDto) {
    return this.adminService.getCustomerInsights(
      query.period || AnalyticsPeriod.MONTH,
    );
  }
}
