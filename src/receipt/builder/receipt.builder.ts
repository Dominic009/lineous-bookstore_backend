import { ReceiptDTO, ReceiptItem } from '../dto/receipt.dto';
import { Order, OrderItem, User, Address } from '@prisma/client';

type OrderWithRelations = Order & {
  orderItems: (OrderItem & { paper?: { name: string } })[];
  user: User;
  address?: Address | null;
};

export class ReceiptBuilder {
  static build(order: OrderWithRelations, qrCodeDataUrl?: string): ReceiptDTO {
    const customerName = [order.user.firstName, order.user.lastName]
      .filter(Boolean)
      .join(' ');
    const fullName = customerName.trim() || 'Guest Customer';

    const items: ReceiptItem[] = order.orderItems.map((item) => ({
      bookTitle: item.bookTitle,
      paperName: item.paperName || undefined,
      quantity: item.quantity,
      unitPrice: Number(item.paperPrice),
      subtotal: Number(item.subtotal),
    }));

    const subtotal = Number(order.subtotal);
    const discount = Number(order.discount) || 0;
    const shipping = Number(order.shipping) || 0;
    const tax = 0;
    const grandTotal = subtotal - discount + shipping + tax;

    const address = order.address
      ? {
          name: order.address.name,
          phone: order.address.phone,
          addressLine: order.address.addressLine,
          area: order.address.area || undefined,
          district: order.address.district,
          division: order.address.division || undefined,
          country: order.address.country || undefined,
          postalCode: order.address.postalCode || undefined,
        }
      : {
          name: fullName,
          phone: order.user.phone || 'N/A',
          addressLine: 'N/A',
          district: 'N/A',
        };

    return {
      receiptNumber: order.orderNumber,
      orderNumber: order.orderNumber,
      customerName: fullName,
      customerEmail: order.user.email,
      customerPhone: order.user.phone || undefined,
      date: order.createdAt.toISOString(),
      paymentMethod: order.paymentMethod || 'N/A',
      paymentStatus: order.paymentStatus,
      subtotal,
      discount,
      shipping,
      tax,
      grandTotal,
      items,
      address,
      qrCodeDataUrl,
    };
  }
}
