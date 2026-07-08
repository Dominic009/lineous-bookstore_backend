# Order API - Customer Frontend Implementation Guide

## Overview

This document provides a complete implementation guide for the Order API from the customer frontend perspective. Customers can view their own orders, download receipts, and verify receipts.


## Authentication

All endpoints require a valid JWT token obtained from the login endpoint.

```
Authorization: Bearer <customer-jwt-token>
```

---

## Endpoints

### 1. Create Order

Create a new order from the user's cart.

**Endpoint:** `POST /orders`

**Access:** Authenticated customers

**Request Body:**
```json
{
  "addressId": "uuid-of-address",
  "discount": 0,
  "shipping": 40,
  "paymentMethod": "COD",
  "notes": "Please deliver before evening"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `addressId` | string | Yes | ID of the delivery address |
| `discount` | number | No | Discount amount (default: 0) |
| `shipping` | number | No | Shipping cost (default: 0) |
| `paymentMethod` | enum | No | Payment method: `COD`, `CARD`, `BANK_TRANSFER`, `MOBILE_BANKING` |
| `notes` | string | No | Additional notes for the order |

**Important Notes:**
- The order is created from the user's current cart items
- The cart is cleared after order creation
- A receipt is automatically generated in the background

**Response:**
```json
{
  "message": "Order created successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-1234567890-123",
    "subtotal": "500.00",
    "discount": "0.00",
    "shipping": "40.00",
    "total": "540.00",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "paymentMethod": "COD",
    "notes": "Please deliver before evening",
    "createdAt": "2026-07-06T10:00:00.000Z",
    "updatedAt": "2026-07-06T10:00:00.000Z",
    "userId": "uuid",
    "addressId": "uuid",
    "orderItems": [
      {
        "id": "uuid",
        "orderId": "uuid",
        "bookId": "uuid",
        "paperId": "uuid",
        "bookTitle": "Atomic Habits",
        "paperName": "Hardcover",
        "paperPrice": "250.00",
        "quantity": 2,
        "subtotal": "500.00"
      }
    ]
  }
}
```

---

### 2. Get My Orders

Retrieve all orders for the authenticated customer.

**Endpoint:** `GET /orders`

**Access:** Authenticated customers

**Response:**
```json
{
  "message": "Orders retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "orderNumber": "ORD-1234567890-123",
      "subtotal": "500.00",
      "discount": "0.00",
      "shipping": "40.00",
      "total": "540.00",
      "status": "PENDING",
      "paymentStatus": "PENDING",
      "paymentMethod": "COD",
      "createdAt": "2026-07-06T10:00:00.000Z",
      "orderItems": [
        {
          "id": "uuid",
          "bookTitle": "Atomic Habits",
          "paperName": "Hardcover",
          "paperPrice": "250.00",
          "quantity": 2,
          "subtotal": "500.00"
        }
      ]
    }
  ]
}
```

---

### 3. Get My Order Details

Retrieve a specific order by ID. Customers can only view their own orders.

**Endpoint:** `GET /orders/:id`

**Access:** Authenticated customers (own orders only)

**Response:**
```json
{
  "message": "Order retrieved successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-1234567890-123",
    "subtotal": "500.00",
    "discount": "0.00",
    "shipping": "40.00",
    "total": "540.00",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "paymentMethod": "COD",
    "notes": "Please deliver before evening",
    "createdAt": "2026-07-06T10:00:00.000Z",
    "orderItems": [
      {
        "id": "uuid",
        "bookId": "uuid",
        "paperId": "uuid",
        "bookTitle": "Atomic Habits",
        "paperName": "Hardcover",
        "paperPrice": "250.00",
        "quantity": 2,
        "subtotal": "500.00"
      }
    ],
    "address": {
      "id": "uuid",
      "name": "John Doe",
      "phone": "+8801712345678",
      "district": "Dhaka",
      "addressLine": "123 Main Street"
    },
    "payments": [
      {
        "id": "uuid",
        "gateway": "COD",
        "amount": "540.00",
        "currency": "BDT",
        "status": "PENDING"
      }
    ]
  }
}
```

---

### 4. Download Receipt

Download the PDF receipt for an order.

**Endpoint:** `GET /orders/:id/receipt`

**Access:** Authenticated customers (own orders only)

**Response:** Redirects to PDF URL (302 Redirect to Cloudinary)

The PDF will be downloaded or opened in the browser depending on the client settings.

---

### 5. Get Receipt Details

Get detailed receipt information including the PDF URL.

**Endpoint:** `GET /orders/:id/receipt/details`

**Access:** Authenticated customers (own orders only)

**Response:**
```json
{
  "message": "Receipt retrieved successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "orderId": "uuid",
    "receiptNumber": "RC-20260706-ABC123",
    "pdfUrl": "https://res.cloudinary.com/.../receipts/RC-20260706-ABC123.pdf",
    "qrCodeUrl": "data:image/png;base64,...",
    "generatedAt": "2026-07-06T10:30:00.000Z",
    "order": {
      "orderNumber": "ORD-1234567890-123",
      "total": "540.00",
      "status": "PENDING",
      "orderItems": [...]
    }
  }
}
```

---

### 6. Verify Receipt (Public)

Verify a receipt by its receipt number. This endpoint is public and does not require authentication. Useful for sharing receipts with others.

**Endpoint:** `GET /receipts/verify/:receiptNumber`

**Access:** Public

**Response:**
```json
{
  "message": "Receipt verified successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "orderId": "uuid",
    "receiptNumber": "RC-20260706-ABC123",
    "pdfUrl": "https://res.cloudinary.com/.../receipts/RC-20260706-ABC123.pdf",
    "qrCodeUrl": "data:image/png;base64,...",
    "generatedAt": "2026-07-06T10:30:00.000Z",
    "order": {
      "orderNumber": "ORD-1234567890-123",
      "total": "540.00",
      "status": "PENDING",
      "orderItems": [...]
    }
  }
}
```

---

## Order Status Values

| Status | Description |
|--------|-------------|
| `PENDING` | Order placed, awaiting confirmation |
| `CONFIRMED` | Order confirmed by admin |
| `PROCESSING` | Order is being processed |
| `SHIPPED` | Order has been shipped |
| `DELIVERED` | Order has been delivered |
| `CANCELLED` | Order has been cancelled |
| `RETURNED` | Order has been returned |

## Payment Method Values

| Value | Description |
|-------|-------------|
| `COD` | Cash on Delivery |
| `CARD` | Credit/Debit Card |
| `BANK_TRANSFER` | Bank Transfer |
| `MOBILE_BANKING` | Mobile Banking (bKash, Nagad, etc.) |

## Payment Status Values

| Status | Description |
|--------|-------------|
| `PENDING` | Payment pending |
| `COMPLETED` | Payment completed |
| `FAILED` | Payment failed |
| `REFUNDED` | Payment refunded |

## Receipt Information

- **Auto-generation**: Receipts are automatically generated when an order is created
- **Receipt Number Format**: `RC-YYYYMMDD-XXXXXX` (e.g., `RC-20260706-ABC123`)
- **QR Code**: Each receipt contains a QR code that links to the verification page
- **PDF Storage**: PDFs are stored on Cloudinary for reliable access
- **Download**: Customers can download receipts as PDF files

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Unauthorized",
  "status": "error",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "message": "You can only view your own orders",
  "status": "error",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "message": "Order not found",
  "status": "error",
  "error": "Not Found"
}
```

### 400 Bad Request
```json
{
  "message": "Cart is empty",
  "status": "error",
  "error": "Bad Request"
}
```

## Implementation Notes

1. **Cart Management**: Before creating an order, ensure the user has items in their cart
2. **Address Validation**: The `addressId` must belong to the authenticated user
3. **Receipt Generation**: Receipts are generated asynchronously after order creation
4. **PDF Access**: Receipt PDFs are stored on Cloudinary and accessed via URL
5. **Order History**: Use `GET /orders` to display order history in the frontend
