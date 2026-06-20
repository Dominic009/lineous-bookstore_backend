import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from '@prisma/client';

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

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Get the authenticated user's cart
   * Access: Authenticated users
   */
  @Get()
  getCart(@Request() req: RequestWithUser) {
    return this.cartService.getCart(req.user.id);
  }

  /**
   * Add a book to cart
   * Access: Authenticated users
   */
  @Post()
  addToCart(@Body() dto: AddToCartDto, @Request() req: RequestWithUser) {
    return this.cartService.addToCart(dto, req.user.id);
  }

  /**
   * Update cart item quantity
   * Access: Authenticated users
   */
  @Patch('items/:id')
  updateCartItem(
    @Param('id') cartItemId: string,
    @Body('quantity') quantity: number,
    @Request() req: RequestWithUser,
  ) {
    return this.cartService.updateCartItem(cartItemId, quantity, req.user.id);
  }

  /**
   * Remove a book from cart
   * Access: Authenticated users
   */
  @Delete('items/:id')
  removeFromCart(
    @Param('id') cartItemId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.cartService.removeFromCart(cartItemId, req.user.id);
  }

  /**
   * Clear the cart
   * Access: Authenticated users
   */
  @Delete()
  clearCart(@Request() req: RequestWithUser) {
    return this.cartService.clearCart(req.user.id);
  }
}
