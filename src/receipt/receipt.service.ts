/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptBuilder } from './builder/receipt.builder';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Order, OrderItem, User, Address, OrderStatus } from '@prisma/client';
import { generatePdfFromTemplate, getTemplatePath } from '../utils/pdf';
import QRCode from 'qrcode';
import dayjs from 'dayjs';

type OrderWithRelations = Order & {
  orderItems: (OrderItem & { paper?: { name: string } })[];
  user: User;
  address?: Address | null;
};

@Injectable()
export class ReceiptService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Auto-confirm order when receipt is generated
   */
  async confirmOrder(orderId: string): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED },
    });
  }

  /**
   * Generate a receipt for an order
   */
  async generate(
    orderId: string,
  ): Promise<{ pdfUrl: string; receiptNumber: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            paper: true,
          },
        },
        user: true,
        address: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if receipt already exists
    const existingReceipt = await this.prisma.receipt.findUnique({
      where: { orderId },
    });

    if (existingReceipt) {
      return {
        pdfUrl: existingReceipt.pdfUrl,
        receiptNumber: existingReceipt.receiptNumber,
      };
    }

    // Generate QR code
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/receipts/verify/${order.orderNumber}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1e40af',
        light: '#ffffff',
      },
    });

    // Build receipt data
    const receiptData = ReceiptBuilder.build(
      order as OrderWithRelations,
      qrCodeDataUrl,
    );

    // Generate PDF
    const templatePath = getTemplatePath('receipt.hbs');
    let pdfBuffer: Buffer;

    try {
      pdfBuffer = await generatePdfFromTemplate(
        templatePath,
        receiptData as any,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to generate PDF:', message);
      throw new BadRequestException(
        `Failed to generate receipt PDF: ${message}`,
      );
    }

    // Upload to Cloudinary
    let uploadResult: { url: string; publicId: string };

    try {
      uploadResult = await this.cloudinaryService.uploadFile(
        {
          buffer: pdfBuffer,
          mimetype: 'application/pdf',
          originalname: `receipt-${order.orderNumber}.pdf`,
        } as any,
        'receipts',
      );
    } catch (error) {
      console.error('Failed to upload PDF to Cloudinary:', error);
      throw new BadRequestException(
        'Failed to upload receipt to cloud storage',
      );
    }

    // Generate receipt number
    const receiptNumber = `RC-${dayjs().format('YYYYMMDD')}-${String(order.id).slice(-6).toUpperCase()}`;

    // Save receipt record
    const receipt = await this.prisma.receipt.create({
      data: {
        orderId: order.id,
        receiptNumber,
        pdfUrl: uploadResult.url,
        publicId: uploadResult.publicId,
        qrCodeUrl: qrCodeDataUrl,
      },
    });

    return {
      pdfUrl: receipt.pdfUrl,
      receiptNumber: receipt.receiptNumber,
    };
  }

  /**
   * Get receipt by order ID
   */
  async findByOrderId(
    orderId: string,
    userId: string,
    requestingUserRole: string,
  ) {
    const where: any = { orderId };

    // If not admin, verify the order belongs to the user
    if (requestingUserRole !== 'ADMIN') {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
      });

      if (!order || order.userId !== userId) {
        throw new NotFoundException('Receipt not found');
      }
    }

    const receipt = await this.prisma.receipt.findUnique({
      where,
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                paper: true,
              },
            },
            user: true,
            address: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    return receipt;
  }

  /**
   * Get receipt by receipt number (public verification)
   */
  async findByReceiptNumber(receiptNumber: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { receiptNumber },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                paper: true,
              },
            },
            user: true,
            address: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    return receipt;
  }

  /**
   * Regenerate a receipt (delete old and create new)
   */
  async regenerate(
    orderId: string,
  ): Promise<{ pdfUrl: string; receiptNumber: string }> {
    const existingReceipt = await this.prisma.receipt.findUnique({
      where: { orderId },
    });

    if (existingReceipt) {
      // Delete old PDF from Cloudinary
      if (existingReceipt.publicId) {
        try {
          await this.cloudinaryService.deleteFile(existingReceipt.publicId);
        } catch (error) {
          console.error('Failed to delete old receipt from Cloudinary:', error);
        }
      }

      // Delete old receipt record
      await this.prisma.receipt.delete({
        where: { id: existingReceipt.id },
      });
    }

    return this.generate(orderId);
  }
}
