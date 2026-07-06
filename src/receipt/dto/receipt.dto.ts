export interface ReceiptItem {
  bookTitle: string;
  paperName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ReceiptDTO {
  receiptNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  grandTotal: number;
  items: ReceiptItem[];
  address: {
    name: string;
    phone: string;
    addressLine: string;
    area?: string;
    district: string;
    division?: string;
    country?: string;
    postalCode?: string;
  };
  qrCodeDataUrl?: string;
}
