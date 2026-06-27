# Order Implementation Guide

This document provides a complete technical guide for implementing the Order module. Orders are created when a user checks out their cart, converting cart items into a permanent purchase record with order items, shipping address, and payment information.

## Table of Contents
1. [Schema Design](#schema-design)
2. [Module Structure](#module-structure)
3. [DTOs](#dtos)
4. [Controller Implementation](#controller-implementation)
5. [Service Implementation](#service-implementation)
6. [API Flow](#api-flow)
7. [Frontend Integration](#frontend-integration)
8. [How to Place an Order](#how-to-place-an-order)
9. [Rules & Regulations](#rules--regulations)

---

## Schema Design

### Order Model
```prisma
model Order {
  id            String         @id @default(uuid())
  userId        String
  addressId     String?
  orderNumber   String         @unique
  subtotal      Decimal        @db.Decimal(10, 2)
  discount      Decimal?       @db.Decimal(10, 2)
  shipping      Decimal?       @db.Decimal(10, 2)
  total         Decimal        @db.Decimal(10, 2)
  status        OrderStatus    @default(PENDING)
  paymentStatus PaymentStatus  @default(PENDING)
  paymentMethod PaymentMethod?
  notes         String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  deletedAt     DateTime?

  // Relations
  user       User        @relation(fields: [userId], references: [id])
  address    Address?    @relation(fields: [addressId], references: [id])
  orderItems OrderItem[]
  payments   Payment[]

  @@index([userId])
  @@index([addressId])
  @@index([orderNumber])
}
```

### OrderItem Model
```prisma
model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  bookId    String
  bookTitle String
  bookPrice Decimal @db.Decimal(10, 2)
  quantity  Int
  subtotal  Decimal @db.Decimal(10, 2)

  // Relations
  order Order @relation(fields: [orderId], references: [id])
  book  Book  @relation(fields: [bookId], references: [id])

  @@index([orderId])
  @@index([bookId])
}
```

### Enums Used
```prisma
enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  RETURNED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum PaymentMethod {
  COD
  CARD
  BANK_TRANSFER
  MOBILE_BANKING
}
```

**Key Points:**
- `orderNumber` is a unique, human-readable identifier (e.g., `ORD-1710000000000-123`)
- `OrderItem` snapshots the book data at the time of purchase (`bookTitle`, `bookPrice`) — this preserves historical data even if the book is later updated or deleted
- `subtotal` on each `OrderItem` = `bookPrice × quantity`
- `total` on `Order` = `subtotal - discount + shipping`
- `status` tracks the fulfillment lifecycle: `PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`
- `paymentStatus` tracks payment: `PENDING` → `COMPLETED` or `FAILED`
- `deletedAt` enables soft delete for orders
- Orders are always scoped to a `userId` and optionally an `addressId`

---

## Module Structure

### Order Module
```typescript
// src/order/order.module.ts
import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [OrderController],
  providers: [OrderService, PrismaService],
  exports: [OrderService],
})
export class OrderModule {}
```

**Registration in AppModule:**
The `OrderModule` must be imported in [`src/app.module.ts`](src/app.module.ts):
```typescript
import { OrderModule } from './order/order.module';

@Module({
  imports: [
    // ... other modules
    OrderModule,
    // ... other modules
  ],
})
export class AppModule {}
```

---

## DTOs

### CreateOrderDto
```typescript
// src/order/dto/create-order.dto.ts
import {
  IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  shipping?: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

**Validation Rules:**
- `addressId` is required — must reference a valid address belonging to the user
- `discount` and `shipping` are optional numbers — default to `0` if not provided
- `paymentMethod` is optional — must be one of `COD`, `CARD`, `BANK_TRANSFER`, `MOBILE_BANKING`
- `notes` is optional — any additional order instructions

---

## Controller Implementation

### Order Controller
```typescript
// src/order/order.controller.ts
import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, Request,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role, OrderStatus } from '@prisma/client';

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
   * Get all orders
   * Access: Authenticated users (own orders) or Admins (all orders)
   */
  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.orderService.findAll(req.user.id, req.user.role);
  }

  /**
   * Get a single order by ID
   * Access: Authenticated users (own order) or Admins (any order)
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
```

---

## Service Implementation

### Order Service
```typescript
// src/order/order.service.ts
import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, Role, OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new order from cart
   * Security: Authenticated users
   */
  async create(
    dto: CreateOrderDto,
    userId: string,
  ): Promise<{
    message: string;
    status: string;
    data: Order;
  }> {
    // Get user's cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        cartItems: {
          include: {
            book: true,
          },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      throw new NotFoundException('Cart is empty');
    }

    // Check if address exists and belongs to user
    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId, userId, deletedAt: null },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of cart.cartItems) {
      const price = item.book.discountPrice || item.book.price;
      subtotal += Number(price) * item.quantity;
    }

    const discount = dto.discount ?? 0;
    const shipping = dto.shipping ?? 0;
    const total = subtotal - discount + shipping;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create order with items
    const order = await this.prisma.order.create({
      data: {
        userId,
        addressId: dto.addressId,
        orderNumber,
        subtotal,
        discount,
        shipping,
        total,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        orderItems: {
          create: cart.cartItems.map((item) => ({
            bookId: item.bookId,
            bookTitle: item.book.title,
            bookPrice: item.book.discountPrice || item.book.price,
            quantity: item.quantity,
            subtotal:
              Number(item.book.discountPrice || item.book.price) *
              item.quantity,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });

    // Clear cart
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return {
      message: 'Order created successfully',
      status: 'success',
      data: order,
    };
  }

  /**
   * Get all orders for the authenticated user
   * Security: Authenticated users (own orders) or Admins (all orders)
   */
  async findAll(
    userId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Order[];
  }> {
    const where = requestingUserRole === Role.ADMIN ? {} : { userId };

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: true,
      },
    });

    return {
      message:
        orders.length > 0 ? 'Orders retrieved successfully' : 'No orders found',
      status: 'success',
      data: orders,
    };
  }

  /**
   * Get a single order by ID
   * Security: Authenticated users (own order) or Admins (any order)
   */
  async findOne(
    id: string,
    userId: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Order;
  }> {
    const where = requestingUserRole === Role.ADMIN ? { id } : { id, userId };

    const order = await this.prisma.order.findUnique({
      where,
      include: {
        orderItems: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      message: 'Order retrieved successfully',
      status: 'success',
      data: order,
    };
  }

  /**
   * Update order status
   * Security: Admins only
   */
  async updateStatus(
    id: string,
    status: OrderStatus,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Order;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can update order status',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status },
    });

    return {
      message: 'Order status updated successfully',
      status: 'success',
      data: updatedOrder,
    };
  }
}
```

---

## API Flow

### 1. Create Order (Checkout)
**Endpoint:** `POST /api/orders`  
**Authentication:** Required (any authenticated user)  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "addressId": "uuid-of-address",
  "discount": 50,
  "shipping": 30,
  "paymentMethod": "COD",
  "notes": "Please deliver before 5 PM"
}
```

**Rules:**
- `addressId` is required and must belong to the authenticated user
- The user must have at least one item in their cart
- `discount` and `shipping` default to `0` if not provided
- `paymentMethod` is optional — can be set later
- Order is created with `status: PENDING` and `paymentStatus: PENDING`
- Cart is automatically cleared after successful order creation
- Order number is auto-generated in format `ORD-{timestamp}-{random}`

**Success Response (201):**
```json
{
  "message": "Order created successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "addressId": "uuid",
    "orderNumber": "ORD-1710000000000-123",
    "subtotal": "500.00",
    "discount": "50.00",
    "shipping": "30.00",
    "total": "480.00",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "paymentMethod": "COD",
    "notes": "Please deliver before 5 PM",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "deletedAt": null,
    "orderItems": [
      {
        "id": "uuid",
        "orderId": "uuid",
        "bookId": "uuid",
        "bookTitle": "Book A",
        "bookPrice": "250.00",
        "quantity": 2,
        "subtotal": "500.00"
      }
    ]
  }
}
```

### 2. Get All Orders
**Endpoint:** `GET /api/orders`  
**Authentication:** Required (any authenticated user)

**Rules:**
- Regular users see only their own orders
- Admins see all orders
- Results are ordered by `createdAt` descending (newest first)

**Success Response (200):**
```json
{
  "message": "Orders retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "orderNumber": "ORD-1710000000000-123",
      "total": "480.00",
      "status": "PENDING",
      "paymentStatus": "PENDING",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "orderItems": [...]
    }
  ]
}
```

### 3. Get Order by ID
**Endpoint:** `GET /api/orders/{id}`  
**Authentication:** Required (any authenticated user)

**Rules:**
- Regular users can only view their own orders
- Admins can view any order
- Returns `404 Not Found` if the order does not exist or does not belong to the user
- Response includes `orderItems` and `payments`

### 4. Update Order Status
**Endpoint:** `PATCH /api/orders/{id}/status`  
**Authentication:** Required (Admin only)  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "status": "CONFIRMED"
}
```

**Rules:**
- Only admins can update order status
- `status` must be one of: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`
- Returns `404 Not Found` if the order does not exist

---

## Frontend Integration

### Placing an Order (Checkout)
```javascript
async function placeOrder(addressId, discount = 0, shipping = 0, paymentMethod = 'COD', notes = '') {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      addressId,
      discount,
      shipping,
      paymentMethod,
      notes,
    }),
  });

  const result = await response.json();
  return result.data; // Contains order with orderItems
}
```

### Fetching User's Orders
```javascript
// Get all orders for the logged-in user
const response = await fetch('/api/orders', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const { data: orders } = await response.json();

// Display orders
orders.forEach(order => {
  console.log(`Order #${order.orderNumber}: ${order.status} - ${order.total}`);
});
```

### Fetching a Single Order
```javascript
const orderId = 'order-uuid-here';
const response = await fetch(`/api/orders/${orderId}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const { data: order } = await response.json();
console.log(order.orderItems); // Array of items in the order
```

### Admin Updating Order Status
```javascript
async function updateOrderStatus(orderId, newStatus) {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: newStatus }),
  });

  return await response.json();
}

// Usage: Mark order as shipped
updateOrderStatus('order-uuid', 'SHIPPED');
```

---

## How to Place an Order

Placing an order is a multi-step process that converts a user's cart into a confirmed purchase.

### Step 1: Ensure Cart Has Items
Before placing an order, the user must have items in their cart. The order service reads from the cart automatically.

```javascript
// Check cart (if you have a cart endpoint)
const { data: cart } = await fetch('/api/cart', {
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json());

if (!cart.items || cart.items.length === 0) {
  alert('Your cart is empty. Add items before checking out.');
  return;
}
```

### Step 2: Select a Shipping Address
The user must have at least one saved address. The `addressId` is required when creating an order.

```javascript
// Fetch user's addresses
const { data: addresses } = await fetch('/api/addresses', {
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json());

// User selects an address
const selectedAddressId = addresses[0].id;
```

### Step 3: Calculate Totals (Optional)
The backend calculates `subtotal`, `total`, etc., but you may want to show a summary to the user before checkout.

```javascript
// Calculate on frontend for display purposes
const subtotal = cart.items.reduce((sum, item) => {
  const price = item.book.discountPrice || item.book.price;
  return sum + (Number(price) * item.quantity);
}, 0);

const discount = 0; // Or apply coupon discount
const shipping = 50; // Flat rate or calculated
const total = subtotal - discount + shipping;
```

### Step 4: Submit the Order
```javascript
async function checkout(addressId, options = {}) {
  const payload = {
    addressId,
    discount: options.discount ?? 0,
    shipping: options.shipping ?? 0,
    paymentMethod: options.paymentMethod || 'COD',
    notes: options.notes || '',
  };

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to place order');
  }

  const result = await response.json();
  return result.data;
}

// Usage
const order = await checkout('address-uuid', {
  paymentMethod: 'COD',
  notes: 'Leave at the door',
});

console.log('Order placed:', order.orderNumber);
console.log('Total:', order.total);
```

### Step 5: Handle Post-Order Actions
After order creation:
- Cart is automatically cleared
- Show order confirmation page with `orderNumber`
- Redirect to order tracking or payment page (if using online payment)
- Send order confirmation email (if configured)

```javascript
// Redirect to order confirmation
window.location.href = `/order-confirmation/${order.orderNumber}`;
```

---

## Rules & Regulations

### General Rules

1. **Authentication & Authorization**
   - `POST /api/orders` (create) requires **any authenticated user**
   - `GET /api/orders` (list) requires **any authenticated user** — users see only their own orders
   - `GET /api/orders/{id}` (detail) requires **any authenticated user** — users can only view their own orders
   - `PATCH /api/orders/{id}/status` requires **Admin** role only
   - The `UserController` uses `JwtAuthGuard` at the class level for all endpoints

2. **Cart Dependency**
   - An order can **only** be created from the user's existing cart
   - If the cart is empty or does not exist, the API returns `404 Not Found` with message "Cart is empty"
   - After successful order creation, **all cart items are deleted** — the cart is cleared automatically
   - This is a one-way operation — cart items cannot be recovered after order creation

3. **Address Validation**
   - The `addressId` must reference an address that belongs to the authenticated user
   - The address must not be soft-deleted (`deletedAt: null`)
   - If the address is not found or does not belong to the user, returns `404 Not Found`

4. **Price Calculation**
   - `subtotal` = sum of `(bookPrice × quantity)` for all cart items
   - `bookPrice` uses `discountPrice` if available, otherwise falls back to `price`
   - `total` = `subtotal - discount + shipping`
   - `discount` and `shipping` default to `0` if not provided
   - All calculations use `Number()` to convert Prisma `Decimal` values

5. **Order Number Generation**
   - `orderNumber` is auto-generated in format: `ORD-{timestamp}-{random}`
   - Example: `ORD-1710000000000-456`
   - `orderNumber` is unique and indexed in the database
   - This number is used for customer-facing order tracking

6. **Order Status Lifecycle**
   - `PENDING` — Order placed, awaiting confirmation
   - `CONFIRMED` — Order confirmed by admin
   - `PROCESSING` — Order is being prepared
   - `SHIPPED` — Order has been shipped
   - `DELIVERED` — Order has been delivered
   - `CANCELLED` — Order has been cancelled
   - `RETURNED` — Order has been returned
   - Only admins can change the order status

7. **Payment Status**
   - `PENDING` — Payment not yet received/confirmed
   - `COMPLETED` — Payment successfully received
   - `FAILED` — Payment failed
   - `REFUNDED` — Payment has been refunded
   - `paymentStatus` is separate from `status` — an order can be `DELIVERED` with `PENDING` payment (e.g., Cash on Delivery)

8. **Order Item Snapshot**
   - `OrderItem` stores `bookTitle` and `bookPrice` at the time of purchase
   - This preserves historical data even if the book is later updated, renamed, or deleted
   - `subtotal` on each item = `bookPrice × quantity`
   - Order items are created in a single nested write operation with the order

9. **Soft Delete Pattern**
   - Orders use soft delete via the `deletedAt` field
   - Deleted orders are excluded from list and detail queries
   - Admins can still see soft-deleted orders if the query is adjusted

10. **Input Validation**
    - `addressId` is required and validated as a non-empty string
    - `discount` and `shipping` are validated as numbers if provided
    - `paymentMethod` is validated against the `PaymentMethod` enum
    - The global `ValidationPipe` handles DTO validation automatically

11. **What NOT to Do**
    - **Do NOT** allow users to create orders with an empty cart
    - **Do NOT** allow users to use addresses that do not belong to them
    - **Do NOT** allow non-admin users to update order status
    - **Do NOT** modify `orderNumber` after creation — it is a permanent identifier
    - **Do NOT** recalculate prices from the book catalog at query time — use the snapshot values in `OrderItem`
    - **Do NOT** delete cart items before the order is successfully created — if order creation fails, the cart should remain intact
    - **Do NOT** expose raw Prisma errors to the client — use NestJS exception types

12. **Testing Considerations**
    - Test order creation with an empty cart — should return `404 Not Found`
    - Test order creation with an invalid `addressId` — should return `404 Not Found`
    - Test order creation with another user's address — should return `404 Not Found`
    - Test that cart is cleared after successful order creation
    - Test that regular users can only see their own orders
    - Test that admins can see all orders
    - Test that regular users cannot update order status
    - Test price calculation with discount and shipping
