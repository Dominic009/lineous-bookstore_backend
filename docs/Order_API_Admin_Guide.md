# Order API - Admin Panel Implementation Guide

## Overview

This document provides a complete implementation guide for the Order API from the admin panel perspective. Admins can view all orders, update order statuses, and generate/download receipts.

```

## Authentication

Most endpoints require a valid JWT token. Some endpoints are restricted to users with the `ADMIN` role, while others are accessible to any authenticated user.

```
Authorization: Bearer <jwt-token>
```

---

## Endpoints

### 1. Get All Orders

Retrieve all orders in the system.

**Endpoint:** `GET /orders`

**Access:** Authenticated users (own orders) or Admins

**Response:**
```json
{
  "message": "Orders retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "orderNumber": "ORD-090726-001",
      "subtotal": "500.00",
      "discount": "50.00",
      "shipping": "40.00",
      "total": "490.00",
      "status": "PENDING",
      "paymentStatus": "PENDING",
      "paymentMethod": "COD",
      "notes": null,
      "createdAt": "2026-07-06T10:00:00.000Z",
      "updatedAt": "2026-07-06T10:00:00.000Z",
      "userId": "uuid",
      "addressId": "uuid",
      "user": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+8801712345678"
      },
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
  ]
}
```

---

### 2. Get Single Order

Retrieve a specific order by ID.

**Endpoint:** `GET /orders/:id`

**Access:** Authenticated users (own order) or Admins

**Response:**
```json
{
  "message": "Order retrieved successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-090726-001",
    "subtotal": "500.00",
    "discount": "50.00",
    "shipping": "40.00",
    "total": "490.00",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "paymentMethod": "COD",
    "notes": null,
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
        "subtotal": "500.00",
        "paper": {
          "id": "uuid",
          "name": "Hardcover",
          "price": "250.00"
        }
      }
    ],
    "payments": [
      {
        "id": "uuid",
        "orderId": "uuid",
        "gateway": "COD",
        "transactionId": null,
        "amount": "490.00",
        "currency": "BDT",
        "status": "PENDING",
        "paidAt": null,
        "createdAt": "2026-07-06T10:00:00.000Z",
        "updatedAt": "2026-07-06T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 3. Update Order Status

Update the status of an order. Only valid transitions from the current status are allowed.

**Endpoint:** `PATCH /orders/:id/status`

**Access:** Admin only

**Request Body:**
```json
{
  "status": "CONFIRMED"
}
```

**Valid Status Values:**
- `PENDING` - Order placed, awaiting confirmation
- `CONFIRMED` - Order confirmed by admin
- `PROCESSING` - Order is being processed
- `SHIPPED` - Order has been shipped
- `DELIVERED` - Order has been delivered
- `CANCELLED` - Order has been cancelled
- `RETURNED` - Order has been returned

**Valid Transitions:**
- `PENDING` → `CONFIRMED`, `CANCELLED`
- `CONFIRMED` → `PROCESSING`, `CANCELLED`, `RETURNED`
- `PROCESSING` → `SHIPPED`, `CANCELLED`, `RETURNED`
- `SHIPPED` → `DELIVERED`, `RETURNED`
- `DELIVERED` → `RETURNED`
- `CANCELLED` → (terminal, no transitions)
- `RETURNED` → (terminal, no transitions)

**Response:**
```json
{
  "message": "Order status updated successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-090726-001",
    "subtotal": "500.00",
    "discount": "50.00",
    "shipping": "40.00",
    "total": "490.00",
    "status": "CONFIRMED",
    "paymentStatus": "PENDING",
    "paymentMethod": "COD",
    "notes": null,
    "createdAt": "2026-07-06T10:00:00.000Z",
    "updatedAt": "2026-07-06T10:30:00.000Z",
    "userId": "uuid",
    "addressId": "uuid",
    "orderItems": [...]
  }
}
```

---

### 4. Generate Receipt

Generate a PDF receipt for an order. This creates a new receipt or regenerates an existing one.

**Endpoint:** `POST /orders/:id/receipt`

**Access:** Admin only

**Response:**
```json
{
  "message": "Receipt generated successfully",
  "status": "success",
  "data": {
    "pdfUrl": "https://res.cloudinary.com/.../receipts/RC-20260709-A1B2C3.pdf",
    "receiptNumber": "RC-20260709-A1B2C3"
  }
}
```

---

### 5. Download Receipt

Download the PDF receipt for an order. Proxies the PDF from Cloudinary and returns it as a file download. Falls back to a redirect if the Cloudinary fetch fails.

**Endpoint:** `GET /orders/:id/receipt`

**Access:** Authenticated users (own order) or Admins

**Response:** PDF file download with `Content-Disposition: attachment` header

---

### 6. Get Receipt Details

Get detailed receipt information including the PDF URL.

**Endpoint:** `GET /orders/:id/receipt/details`

**Access:** Authenticated users (own order) or Admins

**Response:**
```json
{
  "message": "Receipt retrieved successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "orderId": "uuid",
    "receiptNumber": "RC-20260709-A1B2C3",
    "pdfUrl": "https://res.cloudinary.com/.../receipts/RC-20260709-A1B2C3.pdf",
    "publicId": "receipts/RC-20260709-A1B2C3",
    "qrCodeUrl": "data:image/png;base64,...",
    "generatedAt": "2026-07-06T10:30:00.000Z",
    "createdAt": "2026-07-06T10:30:00.000Z",
    "updatedAt": "2026-07-06T10:30:00.000Z",
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-090726-001",
      "subtotal": "500.00",
      "discount": "50.00",
      "shipping": "40.00",
      "total": "490.00",
      "status": "CONFIRMED",
      "paymentStatus": "COMPLETED",
      "paymentMethod": "COD",
      "orderItems": [
        {
          "id": "uuid",
          "bookId": "uuid",
          "paperId": "uuid",
          "bookTitle": "Atomic Habits",
          "paperName": "Hardcover",
          "paperPrice": "250.00",
          "quantity": 2,
          "subtotal": "500.00",
          "paper": {
            "id": "uuid",
            "name": "Hardcover",
            "price": "250.00"
          }
        }
      ],
      "address": {
        "id": "uuid",
        "name": "John Doe",
        "phone": "+8801712345678",
        "district": "Dhaka",
        "addressLine": "123 Main Street"
      },
      "user": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+8801712345678"
      }
    }
  }
}
```

---

### 7. Verify Receipt (Public)

Verify a receipt by its receipt number. This endpoint is public and does not require authentication.

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
    "receiptNumber": "RC-20260709-A1B2C3",
    "pdfUrl": "https://res.cloudinary.com/.../receipts/RC-20260709-A1B2C3.pdf",
    "qrCodeUrl": "data:image/png;base64,...",
    "generatedAt": "2026-07-06T10:30:00.000Z",
    "order": {
      "orderNumber": "ORD-090726-001",
      "total": "490.00",
      "status": "CONFIRMED",
      "orderItems": [
        {
          "id": "uuid",
          "bookId": "uuid",
          "paperId": "uuid",
          "bookTitle": "Atomic Habits",
          "paperName": "Hardcover",
          "paperPrice": "250.00",
          "quantity": 2,
          "subtotal": "500.00",
          "paper": {
            "id": "uuid",
            "name": "Hardcover",
            "price": "250.00"
          }
        }
      ]
    }
  }
}
```

---

## Order Status Flow

```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
    ↓         ↓
CANCELLED   RETURNED
```

## Receipt Features

- **Auto-generation**: Receipts are automatically generated when an order is created
- **QR Code**: Each receipt contains a QR code for verification
- **Cloud Storage**: PDFs are stored on Cloudinary for reliable access
- **Professional Template**: HTML-based template with branded design
- **Regeneration**: Admins can regenerate receipts if needed

## Error Responses

### 404 Not Found
```json
{
  "message": "Order not found",
  "status": "error",
  "error": "Not Found"
}
```

### 403 Forbidden
```json
{
  "message": "Only administrators can update order status",
  "status": "error",
  "error": "Forbidden"
}
```

### 400 Bad Request
```json
{
  "message": "Invalid status transition from PENDING to DELIVERED",
  "status": "error",
  "error": "Bad Request"
}
```
