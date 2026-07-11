# Admin Dashboard API - Implementation Plan

## Overview

This document provides a complete implementation plan for admin dashboard APIs. All endpoints are **admin-only** and return quick stats for the bookstore admin panel.

---

## Important Business Rules

- **Total Sales** = sum of `Order.total` where `status = DELIVERED` only
- **Sold Amount** = same as total sales (revenue from completed orders)
- **Total Orders** = count of all orders regardless of status
- **Order Status Stats** = counts for each status (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED)
- **Highest Sold Book** = book with highest `quantity` sold in `OrderItem` across DELIVERED orders
- **Day/Week/Month Sales** = sum of `Order.total` where `status = DELIVERED` and `createdAt` falls in the period

---

## API Endpoints

### 1. Dashboard Overview

**Endpoint:** `GET /admin/dashboard`
**Access:** Admin only
**Description:** Returns all quick stats for the dashboard in a single call.

**Response:**
```json
{
  "status": "success",
  "data": {
    "kpis": {
      "totalProducts": 1240,
      "totalOrders": 856,
      "totalSales": 458000.00,
      "totalCustomers": 342,
      "totalSubjects": 45,
      "totalPublications": 12,
      "pendingOrders": 23,
      "lowStockBooks": 8
    },
    "orderStatusBreakdown": [
      { "status": "PENDING", "count": 23, "percentage": 12.5 },
      { "status": "CONFIRMED", "count": 45, "percentage": 24.5 },
      { "status": "PROCESSING", "count": 12, "percentage": 6.5 },
      { "status": "SHIPPED", "count": 34, "percentage": 18.5 },
      { "status": "DELIVERED", "count": 678, "percentage": 36.8 },
      { "status": "CANCELLED", "count": 4, "percentage": 2.2 },
      { "status": "RETURNED", "count": 2, "percentage": 1.0 }
    ],
    "topSellingBooks": [
      {
        "rank": 1,
        "bookId": "uuid",
        "title": "Book Title",
        "publication": "Pub Name",
        "subject": "Subject Name",
        "totalQuantitySold": 156,
        "totalRevenue": 31200.00,
        "coverImage": "url"
      }
    ],
    "recentOrders": [
      {
        "orderNumber": "ORD-100726-001",
        "customerName": "John Doe",
        "total": 500.00,
        "status": "PENDING",
        "createdAt": "2026-07-10T08:30:00.000Z"
      }
    ],
    "salesTrend": {
      "today": 12500.00,
      "thisWeek": 78500.00,
      "thisMonth": 245000.00
    }
  }
}
```

---

### 2. Sales Analytics

**Endpoint:** `GET /admin/analytics/sales`
**Access:** Admin only
**Query Parameters:**
- `period` (required): `day` | `week` | `month` | `year` | `custom`
- `startDate` (optional): ISO date string (for custom period)
- `endDate` (optional): ISO date string (for custom period)
- `groupBy` (optional): `day` | `week` | `month` (default: `day`)

**Response:**
```json
{
  "status": "success",
  "data": {
    "period": "month",
    "dateRange": {
      "start": "2026-07-01",
      "end": "2026-07-31"
    },
    "summary": {
      "totalRevenue": 245000.00,
      "totalOrders": 156,
      "averageOrderValue": 1570.51,
      "totalItemsSold": 423
    },
    "timeSeriesData": [
      { "date": "2026-07-01", "revenue": 8500.00, "orders": 12 },
      { "date": "2026-07-02", "revenue": 12300.00, "orders": 18 }
    ],
    "topProducts": [
      {
        "rank": 1,
        "bookId": "uuid",
        "title": "Book Title",
        "quantitySold": 45,
        "revenue": 9000.00
      }
    ],
    "paymentMethodBreakdown": [
      { "method": "COD", "count": 89, "revenue": 44500.00 },
      { "method": "CARD", "count": 45, "revenue": 125000.00 },
      { "method": "MOBILE_BANKING", "count": 22, "revenue": 75500.00 }
    ]
  }
}
```

---

### 3. Top Selling Books

**Endpoint:** `GET /admin/books/top-selling`
**Access:** Admin only
**Query Parameters:**
- `limit` (optional): number (default: 20, max: 100)
- `period` (optional): `all` | `month` | `week` (default: `all`)

**Response:**
```json
{
  "status": "success",
  "data": {
    "books": [
      {
        "rank": 1,
        "bookId": "uuid",
        "title": "Book Title",
        "slug": "book-title",
        "publication": "Pub Name",
        "subject": "Subject Name",
        "totalQuantitySold": 156,
        "totalRevenue": 31200.00,
        "currentStock": 45,
        "coverImage": "url",
        "averageRating": 4.5
      }
    ]
  }
}
```

---

### 4. Order Status Stats

**Endpoint:** `GET /admin/orders/status-stats`
**Access:** Admin only
**Description:** Returns count and percentage for each order status.

**Response:**
```json
{
  "status": "success",
  "data": {
    "stats": [
      { "status": "PENDING", "count": 23, "percentage": 12.5 },
      { "status": "CONFIRMED", "count": 45, "percentage": 24.5 },
      { "status": "PROCESSING", "count": 12, "percentage": 6.5 },
      { "status": "SHIPPED", "count": 34, "percentage": 18.5 },
      { "status": "DELIVERED", "count": 678, "percentage": 36.8 },
      { "status": "CANCELLED", "count": 4, "percentage": 2.2 },
      { "status": "RETURNED", "count": 2, "percentage": 1.0 }
    ],
    "totalOrders": 856
  }
}
```

---

### 5. Sales by Period

**Endpoint:** `GET /admin/sales/period`
**Access:** Admin only
**Query Parameters:**
- `period` (required): `day` | `week` | `month`
- `date` (optional): ISO date string (default: today)

**Response:**
```json
{
  "status": "success",
  "data": {
    "period": "day",
    "date": "2026-07-10",
    "totalSales": 12500.00,
    "totalOrders": 12,
    "currency": "BDT"
  }
}
```

---

### 6. Inventory Overview

**Endpoint:** `GET /admin/inventory/overview`
**Access:** Admin only
**Description:** Returns stock status summary and alerts.

**Response:**
```json
{
  "status": "success",
  "data": {
    "summary": {
      "totalBooks": 1240,
      "publishedBooks": 980,
      "draftBooks": 120,
      "archivedBooks": 140,
      "outOfStock": 15,
      "lowStock": 8
    },
    "lowStockBooks": [
      {
        "bookId": "uuid",
        "title": "Book Title",
        "paperName": "Hardcover",
        "currentStock": 3,
        "threshold": 10
      }
    ],
    "outOfStockBooks": [
      {
        "bookId": "uuid",
        "title": "Book Title",
        "paperName": "Paperback"
      }
    ]
  }
}
```

---

### 7. Customer Insights

**Endpoint:** `GET /admin/analytics/customers`
**Access:** Admin only
**Query Parameters:**
- `period` (optional): `month` | `year` | `all` (default: `month`)

**Response:**
```json
{
  "status": "success",
  "data": {
    "summary": {
      "totalCustomers": 342,
      "newCustomersThisMonth": 45,
      "activeCustomers": 128,
      "repeatCustomers": 89
    },
    "topCustomers": [
      {
        "userId": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "totalOrders": 12,
        "totalSpent": 25000.00,
        "lastOrderAt": "2026-07-08T10:00:00.000Z"
      }
    ]
  }
}
```

---

## Implementation Details

### Database Queries

All queries should:
- Filter `deletedAt: null` for soft-deleted records
- Use Prisma aggregations (`_count`, `_sum`, `_avg`) for performance
- For sales calculations, filter `status: OrderStatus.DELIVERED`
- For date ranges, use UTC with timezone conversion for Asia/Dhaka (UTC+6)

### Caching Strategy

- **Dashboard Overview:** Cache for 5-15 minutes
- **Sales Analytics:** Cache for 1-5 minutes
- **Top Selling Books:** Cache for 15-30 minutes
- **Inventory Overview:** Cache for 10-15 minutes

### Error Responses

All endpoints return standard error format:
```json
{
  "status": "error",
  "message": "Error description",
  "error": "ExceptionName"
}
```

**Common errors:**
- `401 Unauthorized` - Missing or invalid JWT
- `403 Forbidden` - User is not admin
- `400 Bad Request` - Invalid query parameters

---

## File Structure

```
src/
  admin/
    admin.controller.ts
    admin.service.ts
    dto/
      analytics-query.dto.ts
  dashboard/
    dashboard.controller.ts
    dashboard.service.ts
```

---

## Next Steps

1. Create DTOs for query parameters
2. Implement service methods with Prisma queries
3. Create controllers with admin role guards
4. Add caching layer
5. Write unit tests
6. Update API documentation
