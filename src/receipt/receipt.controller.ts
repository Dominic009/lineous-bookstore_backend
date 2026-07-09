/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ReceiptService } from './receipt.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  /**
   * Generate or regenerate receipt for an order
   * Access: Admins only
   */
  @Post(':id/receipt')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async generateReceipt(@Param('id') id: string) {
    const result = await this.receiptService.generate(id);

    return {
      message: 'Receipt generated successfully',
      status: 'success',
      data: result,
    };
  }

  /**
   * Download receipt PDF
   * Access: Authenticated users (own order) or Admins
   */
  @Get(':id/receipt')
  @Header('Content-Type', 'application/pdf')
  async downloadReceipt(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const receipt = await this.receiptService.findByOrderId(
      id,
      req.user.id,
      req.user.role,
    );

    // Set filename for download
    const filename = `CLC-ORD-${receipt.order.orderNumber}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Proxy the PDF from Cloudinary with proper headers
    try {
      const response = await fetch(receipt.pdfUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      return res.send(buffer);
    } catch (error) {
      console.error('Failed to fetch PDF from Cloudinary:', error);
      return res.redirect(receipt.pdfUrl);
    }
  }

  /**
   * Get receipt details
   * Access: Authenticated users (own order) or Admins
   */
  @Get(':id/receipt/details')
  async getReceiptDetails(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    const receipt = await this.receiptService.findByOrderId(
      id,
      req.user.id,
      req.user.role,
    );

    return {
      message: 'Receipt retrieved successfully',
      status: 'success',
      data: receipt,
    };
  }
}

/**
 * Public controller for receipt verification (no auth required)
 */
@Controller('receipts')
export class PublicReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  /**
   * Verify receipt by receipt number (public)
   */
  @Get('verify/:receiptNumber')
  @HttpCode(HttpStatus.OK)
  async verifyReceipt(@Param('receiptNumber') receiptNumber: string) {
    const receipt =
      await this.receiptService.findByReceiptNumber(receiptNumber);

    return {
      message: 'Receipt verified successfully',
      status: 'success',
      data: receipt,
    };
  }
}
