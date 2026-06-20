import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
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

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  /**
   * Get the authenticated user's wishlist
   * Access: Authenticated users
   */
  @Get()
  getWishlist(@Request() req: RequestWithUser) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  /**
   * Add a book to wishlist
   * Access: Authenticated users
   */
  @Post()
  addToWishlist(
    @Body('bookId') bookId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.wishlistService.addToWishlist(bookId, req.user.id);
  }

  /**
   * Remove a book from wishlist
   * Access: Authenticated users
   */
  @Delete(':bookId')
  removeFromWishlist(
    @Param('bookId') bookId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.wishlistService.removeFromWishlist(bookId, req.user.id);
  }
}
