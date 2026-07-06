/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateTestOrderDto } from './dto/create-test-order.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role, OrderStatus } from '@prisma/client';

/**
 * Request interface with user from JWT
 */
interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * Create a new order from cart
   * Access: Authenticated users
   */
  @Post()
  create(@Body() dto: CreateOrderDto, @Request() req: RequestWithUser) {
    return this.orderService.create(dto, req.user.id);
  }

  /**
   * Create a test order directly (for testing purposes)
   * This endpoint creates address, cart items, and order in one request
   * Access: Authenticated users
   */
  @Post('test')
  testOrder(@Body() dto: CreateTestOrderDto, @Request() req: RequestWithUser) {
    return this.orderService.testOrder(dto, req.user.id);
  }

  /**
   * Get all orders
   * Access: Authenticated users (own orders) or Admins
   */
  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.orderService.findAll(req.user.id, req.user.role);
  }

  /**
   * Get a single order by ID
   * Access: Authenticated users (own order) or Admins
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.orderService.findOne(id, req.user.id, req.user.role);
  }

  /**
   * Update order status
   * Access: Admins only
   */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Request() req: RequestWithUser,
  ) {
    return this.orderService.updateStatus(id, status, req.user.role);
  }
}
