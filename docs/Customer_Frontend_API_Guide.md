# Customer Frontend API Implementation Guide

This document provides a complete reference for all APIs available to customer-facing frontend applications. It includes authentication, book browsing, cart management, wishlist, checkout, and user profile management.

## Table of Contents
1. [Base URL & Authentication](#base-url--authentication)
2. [Auth APIs](#auth-apis)
3. [Book APIs](#book-apis)
4. [Category APIs](#category-apis)
5. [Publication APIs](#publication-apis)
6. [Subject APIs](#subject-apis)
7. [Banner APIs](#banner-apis)
8. [Teacher APIs](#teacher-apis)
9. [Review APIs](#review-apis)
10. [Book Part APIs](#book-part-apis)
11. [Cart APIs](#cart-apis)
12. [Wishlist APIs](#wishlist-apis)
13. [Address APIs](#address-apis)
14. [Order APIs](#order-apis)
15. [Setting APIs](#setting-apis)
16. [Error Handling](#error-handling)
17. [Rules & Best Practices](#rules--best-practices)

---

## Base URL & Authentication

### Base URL
```
http://localhost:3000/api
```

### Authentication
Most customer APIs require a JWT token obtained from login or signup. Include the token in the `Authorization` header:

```
Authorization: Bearer {accessToken}
```

### Token Storage
Store the `accessToken` in `localStorage` or a secure HTTP-only cookie. The token payload contains:
```json
{
  "sub": "user-uuid",
  "role": "USER"
}
```

---

## Auth APIs

### 1. Sign Up
**Endpoint:** `POST /api/auth/signup`  
**Authentication:** Not required  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePass123"
}
```

**Validation Rules:**
- `email` must be a valid email format
- `password` must be at least 8 characters
- `password` must contain at least one uppercase letter, one lowercase letter, and one number

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "customer@example.com"
  }
}
```

**Error Responses:**
- `409 Conflict` — Email already exists

---

### 2. Login
**Endpoint:** `POST /api/auth/login`  
**Authentication:** Not required  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "customer@example.com",
    "role": "USER"
  }
}
```

**Error Responses:**
- `401 Unauthorized` — Invalid email or password

**Frontend Usage:**
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const { accessToken, user } = await response.json();
localStorage.setItem('accessToken', accessToken);
```

---

## Book APIs

### 1. Get All Books
**Endpoint:** `GET /api/books`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only `PUBLISHED` books for non-authenticated users
- Returns all books (including DRAFT, ARCHIVED) for admin users
- Results ordered by `createdAt` descending
- Does NOT include reviews in the response

**Success Response (200):**
```json
{
  "message": "Books retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "title": "Book A",
      "slug": "book-a",
      "shortDescription": "A brief description",
      "description": "Full description...",
      "isbn": "978-3-16-148410-0",
      "price": "250.00",
      "discountPrice": "200.00",
      "publicationDate": "2024-01-01",
      "edition": "1st",
      "language": "English",
      "stock": true,
      "stockAmount": 100,
      "status": "PUBLISHED",
      "thumbnail": "https://res.cloudinary.com/...",
      "publicationId": "uuid",
      "subjectId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "publication": {
        "id": "uuid",
        "name": "Pearson Education",
        "slug": "pearson-education"
      },
      "subject": {
        "id": "uuid",
        "name": "Mathematics",
        "slug": "mathematics"
      },
      "attachments": [
        {
          "id": "uuid",
          "url": "https://res.cloudinary.com/...",
          "type": "THUMBNAIL",
          "sortOrder": 0
        }
      ]
    }
  ]
}
```

---

### 2. Get Book by ID
**Endpoint:** `GET /api/books/{id}`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only `PUBLISHED` books for non-authenticated users
- Returns any book for admin users
- **Includes reviews** in the response
- Returns `404 Not Found` if book does not exist or is not published (for non-admins)

**Success Response (200):**
```json
{
  "message": "Book retrieved successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Book A",
    "slug": "book-a",
    "shortDescription": "A brief description",
    "description": "Full description...",
    "isbn": "978-3-16-148410-0",
    "price": "250.00",
    "discountPrice": "200.00",
    "publicationDate": "2024-01-01",
    "edition": "1st",
    "language": "English",
    "stock": true,
    "stockAmount": 100,
    "status": "PUBLISHED",
    "thumbnail": "https://res.cloudinary.com/...",
    "publicationId": "uuid",
    "subjectId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "publication": { ... },
    "subject": { ... },
    "parts": [
      {
        "id": "uuid",
        "title": "Chapter 1",
        "partNumber": 1,
        "description": "...",
        "price": "50.00"
      }
    ],
    "attachments": [ ... ],
    "reviews": [
      {
        "id": "uuid",
        "reviewerName": "John Doe",
        "designation": "Professor",
        "rating": 5,
        "comment": "Excellent book!",
        "displayOrder": 0,
        "status": "PUBLISHED"
      }
    ]
  }
}
```

---

## Category APIs

### 1. Get All Categories
**Endpoint:** `GET /api/categories`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only non-deleted categories for non-authenticated users
- Returns all categories for admin users
- Results ordered by `name` ascending

**Success Response (200):**
```json
{
  "message": "Categories retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Science",
      "slug": "science",
      "parentId": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Category by ID
**Endpoint:** `GET /api/categories/{id}`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only non-deleted categories for non-authenticated users
- Returns any category for admin users
- Returns `404 Not Found` if category does not exist or is soft-deleted (for non-admins)

---

## Publication APIs

### 1. Get All Publications
**Endpoint:** `GET /api/publications`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only non-deleted publications for non-authenticated users
- Returns all publications for admin users
- Results ordered by `createdAt` descending

**Success Response (200):**
```json
{
  "message": "Publications retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Pearson Education",
      "slug": "pearson-education",
      "description": "A leading publishing company",
      "logo": "https://example.com/logo.png",
      "status": "PUBLISHED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Publication by ID
**Endpoint:** `GET /api/publications/{id}`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only non-deleted publications for non-authenticated users
- Returns any publication for admin users
- Returns `404 Not Found` if publication does not exist or is soft-deleted (for non-admins)

---

## Subject APIs

### 1. Get All Subjects
**Endpoint:** `GET /api/subjects`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only non-deleted subjects for non-authenticated users
- Returns all subjects for admin users
- Results ordered by `createdAt` descending

**Success Response (200):**
```json
{
  "message": "Subjects retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Mathematics",
      "slug": "mathematics",
      "description": "All mathematics related books",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Subject by ID
**Endpoint:** `GET /api/subjects/{id}`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only non-deleted subjects for non-authenticated users
- Returns any subject for admin users
- Returns `404 Not Found` if subject does not exist or is soft-deleted (for non-admins)

---

## Banner APIs

### 1. Get All Banners
**Endpoint:** `GET /api/banners`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only `PUBLISHED` and non-deleted banners for non-authenticated users
- Returns all banners for admin users
- Results ordered by `displayOrder` ascending

**Success Response (200):**
```json
{
  "message": "Banners retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "title": "Summer Sale",
      "subtitle": "Up to 50% off",
      "image": "https://example.com/banner.jpg",
      "buttonText": "Shop Now",
      "buttonUrl": "/books",
      "displayOrder": 0,
      "status": "PUBLISHED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Banner by ID
**Endpoint:** `GET /api/banners/{id}`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only `PUBLISHED` and non-deleted banners for non-authenticated users
- Returns any banner for admin users
- Returns `404 Not Found` if banner does not exist or is not published (for non-admins)

---

## Teacher APIs

### 1. Get All Teachers
**Endpoint:** `GET /api/teachers`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only `PUBLISHED` and non-deleted teachers for non-authenticated users
- Returns all teachers for admin users
- Results ordered by `displayOrder` ascending

**Success Response (200):**
```json
{
  "message": "Teachers retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Dr. John Doe",
      "designation": "Professor of Mathematics",
      "bio": "Expert in mathematics with 20 years of experience",
      "photo": "https://example.com/photo.jpg",
      "facebook": "https://facebook.com/johndoe",
      "linkedin": "https://linkedin.com/in/johndoe",
      "website": "https://johndoe.com",
      "displayOrder": 0,
      "featured": true,
      "status": "PUBLISHED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Teacher by ID
**Endpoint:** `GET /api/teachers/{id}`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only `PUBLISHED` and non-deleted teachers for non-authenticated users
- Returns any teacher for admin users
- **Includes associated books** (`teacherBooks`) in the response
- Returns `404 Not Found` if teacher does not exist or is not published (for non-admins)

**Success Response (200):**
```json
{
  "message": "Teacher retrieved successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Dr. John Doe",
    "designation": "Professor of Mathematics",
    "bio": "...",
    "photo": "https://example.com/photo.jpg",
    "facebook": "https://facebook.com/johndoe",
    "linkedin": "https://linkedin.com/in/johndoe",
    "website": "https://johndoe.com",
    "displayOrder": 0,
    "featured": true,
    "status": "PUBLISHED",
    "teacherBooks": [
      {
        "teacherId": "uuid",
        "bookId": "uuid",
        "book": {
          "id": "uuid",
          "title": "Book A",
          "slug": "book-a",
          "thumbnail": "https://res.cloudinary.com/...",
          "price": "250.00"
        }
      }
    ]
  }
}
```

---

## Review APIs

### 1. Get All Reviews for a Book
**Endpoint:** `GET /api/reviews?bookId={bookId}`  
**Authentication:** Optional (public endpoint)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bookId` | string | Yes | UUID of the book |

**Rules:**
- Returns only reviews for `PUBLISHED` and non-deleted books for non-authenticated users
- Returns all reviews for admin users
- Results ordered by `displayOrder` ascending

**Success Response (200):**
```json
{
  "message": "Reviews retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "bookId": "uuid",
      "reviewerName": "John Doe",
      "designation": "Professor",
      "rating": 5,
      "comment": "Excellent book!",
      "displayOrder": 0,
      "status": "PUBLISHED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Review by ID
**Endpoint:** `GET /api/reviews/{id}`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only reviews for `PUBLISHED` and non-deleted books for non-authenticated users
- Returns any review for admin users
- Returns `404 Not Found` if review does not exist or the associated book is not published (for non-admins)

---

## Book Part APIs

### 1. Get All Book Parts for a Book
**Endpoint:** `GET /api/book-parts?bookId={bookId}`  
**Authentication:** Optional (public endpoint)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bookId` | string | Yes | UUID of the book |

**Rules:**
- Returns only parts for `PUBLISHED` and non-deleted books for non-authenticated users
- Returns all parts for admin users
- Results ordered by `partNumber` ascending

**Success Response (200):**
```json
{
  "message": "Book parts retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "bookId": "uuid",
      "title": "Chapter 1: Introduction",
      "partNumber": 1,
      "description": "Introduction to the subject",
      "price": "50.00",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Book Part by ID
**Endpoint:** `GET /api/book-parts/{id}`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Returns only parts for `PUBLISHED` and non-deleted books for non-authenticated users
- Returns any part for admin users
- Returns `404 Not Found` if part does not exist or the associated book is not published (for non-admins)

---

## Cart APIs

> **Note:** All cart APIs require authentication.

### 1. Get Cart
**Endpoint:** `GET /api/cart`  
**Authentication:** Required

**Rules:**
- Returns the authenticated user's cart
- If cart does not exist, a new empty cart is created automatically
- Includes cart items with full book details

**Success Response (200):**
```json
{
  "message": "Cart retrieved successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "cartItems": [
      {
        "id": "uuid",
        "cartId": "uuid",
        "bookId": "uuid",
        "quantity": 2,
        "book": {
          "id": "uuid",
          "title": "Book A",
          "slug": "book-a",
          "price": "250.00",
          "discountPrice": "200.00",
          "thumbnail": "https://res.cloudinary.com/...",
          "status": "PUBLISHED"
        }
      }
    ]
  }
}
```

---

### 2. Add to Cart
**Endpoint:** `POST /api/cart`  
**Authentication:** Required  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "bookId": "uuid",
  "quantity": 2
}
```

**Validation Rules:**
- `bookId` is required — must reference an existing, published book
- `quantity` is required and must be at least 1

**Rules:**
- If the book is already in the cart, the quantity is incremented
- If the book is not in the cart, a new cart item is created
- Returns the updated cart

**Success Response (200):**
```json
{
  "message": "Book added to cart successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "cartItems": [ ... ]
  }
}
```

**Error Responses:**
- `404 Not Found` — Book not found or not published

---

### 3. Update Cart Item Quantity
**Endpoint:** `PATCH /api/cart/items/{cartItemId}`  
**Authentication:** Required  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "quantity": 3
}
```

**Rules:**
- `cartItemId` must belong to the authenticated user's cart
- `quantity` replaces the existing quantity (does not increment)

**Success Response (200):**
```json
{
  "message": "Cart item updated successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "cartId": "uuid",
    "bookId": "uuid",
    "quantity": 3
  }
}
```

**Error Responses:**
- `404 Not Found` — Cart item not found or does not belong to user

---

### 4. Remove from Cart
**Endpoint:** `DELETE /api/cart/items/{cartItemId}`  
**Authentication:** Required

**Rules:**
- `cartItemId` must belong to the authenticated user's cart
- The item is permanently deleted from the cart

**Success Response (200):**
```json
{
  "message": "Book removed from cart successfully",
  "status": "success",
  "data": null
}
```

**Error Responses:**
- `404 Not Found` — Cart item not found or does not belong to user

---

### 5. Clear Cart
**Endpoint:** `DELETE /api/cart`  
**Authentication:** Required

**Rules:**
- Removes all items from the authenticated user's cart
- This action is irreversible

**Success Response (200):**
```json
{
  "message": "Cart cleared successfully",
  "status": "success",
  "data": null
}
```

---

## Wishlist APIs

> **Note:** All wishlist APIs require authentication.

### 1. Get Wishlist
**Endpoint:** `GET /api/wishlist`  
**Authentication:** Required

**Rules:**
- Returns the authenticated user's wishlist
- Only includes published, non-deleted books
- Results include full book details

**Success Response (200):**
```json
{
  "message": "Wishlist retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "bookId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "book": {
        "id": "uuid",
        "title": "Book A",
        "slug": "book-a",
        "price": "250.00",
        "discountPrice": "200.00",
        "thumbnail": "https://res.cloudinary.com/...",
        "status": "PUBLISHED"
      }
    }
  ]
}
```

---

### 2. Add to Wishlist
**Endpoint:** `POST /api/wishlist`  
**Authentication:** Required  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "bookId": "uuid"
}
```

**Validation Rules:**
- `bookId` is required — must reference an existing, published book

**Rules:**
- If the book is already in the wishlist, returns the existing item with message "Book already in wishlist"
- If not, creates a new wishlist item

**Success Response (200):**
```json
{
  "message": "Book added to wishlist successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "bookId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `404 Not Found` — Book not found or not published

---

### 3. Remove from Wishlist
**Endpoint:** `DELETE /api/wishlist/{bookId}`  
**Authentication:** Required

**Rules:**
- `bookId` must be in the authenticated user's wishlist
- The item is permanently deleted

**Success Response (200):**
```json
{
  "message": "Book removed from wishlist successfully",
  "status": "success",
  "data": null
}
```

**Error Responses:**
- `404 Not Found` — Book not found in wishlist

---

## Address APIs

> **Note:** All address APIs require authentication.

### 1. Get All Addresses
**Endpoint:** `GET /api/addresses`  
**Authentication:** Required

**Rules:**
- Returns only addresses belonging to the authenticated user
- Only returns non-deleted addresses
- Results ordered by `createdAt` descending

**Success Response (200):**
```json
{
  "message": "Addresses retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "John Doe",
      "phone": "+8801712345678",
      "country": "Bangladesh",
      "division": "Dhaka",
      "district": "Dhaka",
      "area": "Gulshan",
      "addressLine": "House 123, Road 456",
      "postalCode": "1212",
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Create Address
**Endpoint:** `POST /api/addresses`  
**Authentication:** Required  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+8801712345678",
  "country": "Bangladesh",
  "division": "Dhaka",
  "district": "Dhaka",
  "area": "Gulshan",
  "addressLine": "House 123, Road 456",
  "postalCode": "1212",
  "isDefault": true
}
```

**Validation Rules:**
- `name`, `phone`, `country`, `division`, `district`, `area`, `addressLine` are required
- `postalCode` and `isDefault` are optional

**Rules:**
- If `isDefault` is `true`, all other addresses for the user are set to non-default
- Address is automatically associated with the authenticated user

**Success Response (201):**
```json
{
  "message": "Address created successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "name": "John Doe",
    "phone": "+8801712345678",
    "country": "Bangladesh",
    "division": "Dhaka",
    "district": "Dhaka",
    "area": "Gulshan",
    "addressLine": "House 123, Road 456",
    "postalCode": "1212",
    "isDefault": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 3. Get Address by ID
**Endpoint:** `GET /api/addresses/{id}`  
**Authentication:** Required

**Rules:**
- Returns only if the address belongs to the authenticated user
- Returns `404 Not Found` if address does not exist or does not belong to the user

---

### 4. Update Address
**Endpoint:** `PATCH /api/addresses/{id}`  
**Authentication:** Required  
**Content-Type:** `application/json`

**Request Body (all fields optional):**
```json
{
  "name": "John Doe Updated",
  "phone": "+8801799999999",
  "country": "Bangladesh",
  "division": "Chittagong",
  "district": "Chittagong",
  "area": "Agrabad",
  "addressLine": "Office Building 789",
  "postalCode": "4100",
  "isDefault": true
}
```

**Rules:**
- Only the address owner can update
- If `isDefault` is set to `true`, all other addresses for the user are set to non-default
- Only provided fields are updated

**Success Response (200):**
```json
{
  "message": "Address updated successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "name": "John Doe Updated",
    ...
  }
}
```

---

### 5. Delete Address
**Endpoint:** `DELETE /api/addresses/{id}`  
**Authentication:** Required

**Rules:**
- Only the address owner can delete
- Performs soft delete — address is marked as deleted but remains in database
- Returns `404 Not Found` if address does not exist or does not belong to the user

**Success Response (200):**
```json
{
  "message": "Address deleted successfully",
  "status": "success",
  "data": null
}
```

---

## Order APIs

> **Note:** All order APIs require authentication.

### 1. Create Order (Checkout)
**Endpoint:** `POST /api/orders`  
**Authentication:** Required  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "addressId": "uuid",
  "discount": 50,
  "shipping": 30,
  "paymentMethod": "COD",
  "notes": "Please deliver before 5 PM"
}
```

**Validation Rules:**
- `addressId` is required — must belong to the authenticated user
- `discount` and `shipping` are optional numbers
- `paymentMethod` is optional — must be one of: `COD`, `CARD`, `BANK_TRANSFER`, `MOBILE_BANKING`
- `notes` is optional string

**Rules:**
- User must have at least one item in their cart
- Cart is automatically cleared after successful order creation
- Order number is auto-generated
- Order status defaults to `PENDING`
- Payment status defaults to `PENDING`

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

**Error Responses:**
- `404 Not Found` — Cart is empty or address not found

---

### 2. Get All Orders
**Endpoint:** `GET /api/orders`  
**Authentication:** Required

**Rules:**
- Regular users see only their own orders
- Admins see all orders
- Results ordered by `createdAt` descending

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
      "paymentMethod": "COD",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "orderItems": [ ... ]
    }
  ]
}
```

---

### 3. Get Order by ID
**Endpoint:** `GET /api/orders/{id}`  
**Authentication:** Required

**Rules:**
- Regular users can only view their own orders
- Admins can view any order
- Returns `404 Not Found` if order does not exist or does not belong to the user
- Response includes `orderItems` and `payments`

**Success Response (200):**
```json
{
  "message": "Order retrieved successfully",
  "status": "success",
  "data": {
    "id": "uuid",
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
    "orderItems": [ ... ],
    "payments": [
      {
        "id": "uuid",
        "orderId": "uuid",
        "gateway": "COD",
        "amount": "480.00",
        "currency": "BDT",
        "status": "PENDING",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## Setting APIs

### 1. Get All Settings
**Endpoint:** `GET /api/settings`  
**Authentication:** Not required (public endpoint)

**Rules:**
- Returns all key-value settings
- Useful for fetching site-wide configuration

**Success Response (200):**
```json
{
  "message": "Settings retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "key": "site_name",
      "value": "Bookstore CMS",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid",
      "key": "contact_email",
      "value": "support@bookstore.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Setting by Key
**Endpoint:** `GET /api/settings/{key}`  
**Authentication:** Not required (public endpoint)

**Rules:**
- Returns a single setting by its unique key
- Returns `null` if setting does not exist

**Success Response (200):**
```json
{
  "message": "Setting retrieved successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "key": "site_name",
    "value": "Bookstore CMS",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Error Handling

All APIs return consistent error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Only administrators can create books"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Book not found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Book with this slug already exists"
}
```

---

## Rules & Best Practices

### General Rules

1. **Authentication**
   - Include `Authorization: Bearer {token}` header for all authenticated endpoints
   - Token is obtained from `/api/auth/login` or `/api/auth/signup`
   - If token expires, redirect to login

2. **Public vs Private Data**
   - Books, categories, publications, subjects, banners, teachers, reviews, book parts, and settings are public
   - Cart, wishlist, addresses, and orders require authentication
   - Soft-deleted records are excluded from public queries

3. **Price Display**
   - Always check `discountPrice` first — if available, display it as the current price
   - Fall back to `price` if `discountPrice` is null
   - Example: `displayPrice = book.discountPrice || book.price`

4. **Stock Availability**
   - Check `stock` field — if `false`, the book is not available for purchase (print-on-demand)
   - If `stock` is `true`, check `stockAmount` for available quantity

5. **Image Handling**
   - `thumbnail` on Book is the main cover image URL
   - `attachments` array contains additional images
   - `image` on Banner and Teacher is a URL string
   - `logo` on Publication is a URL string
   - All images are hosted on Cloudinary

6. **Pagination**
   - The current API does **not** support pagination — all records are returned in a single response
   - For large datasets, consider implementing client-side pagination or request server-side pagination

7. **Search & Filter**
   - The current API does **not** have built-in search or filter endpoints
   - Filter client-side after fetching all records, or request additional filter endpoints from the backend

8. **Cart Quantity**
   - When adding a book that already exists in cart, quantity is incremented
   - Use `PATCH /api/cart/items/{id}` to set a specific quantity

9. **Order Flow**
   - User must have items in cart before checkout
   - User must have at least one saved address
   - Cart is cleared automatically after order creation
   - Order status starts as `PENDING`

10. **What NOT to Do**
    - **Do NOT** call admin-only endpoints from the customer frontend
    - **Do NOT** modify `orderNumber` — it is auto-generated and immutable
    - **Do NOT** delete cart items before order creation fails — if order creation fails, cart should remain intact
    - **Do NOT** trust client-side price calculations — always use backend-calculated prices for orders
    - **Do NOT** expose the `accessToken` in URLs or logs
    - **Do NOT** store sensitive data (like passwords) in localStorage

---

## Quick Reference: Customer-Facing Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | No | Register new user |
| POST | `/api/auth/login` | No | Login user |
| GET | `/api/books` | Optional | List all published books |
| GET | `/api/books/{id}` | Optional | Get book details (with reviews) |
| GET | `/api/categories` | Optional | List all categories |
| GET | `/api/categories/{id}` | Optional | Get category details |
| GET | `/api/publications` | Optional | List all publications |
| GET | `/api/publications/{id}` | Optional | Get publication details |
| GET | `/api/subjects` | Optional | List all subjects |
| GET | `/api/subjects/{id}` | Optional | Get subject details |
| GET | `/api/banners` | Optional | List all published banners |
| GET | `/api/banners/{id}` | Optional | Get banner details |
| GET | `/api/teachers` | Optional | List all published teachers |
| GET | `/api/teachers/{id}` | Optional | Get teacher details (with books) |
| GET | `/api/reviews?bookId={id}` | Optional | Get reviews for a book |
| GET | `/api/reviews/{id}` | Optional | Get review details |
| GET | `/api/book-parts?bookId={id}` | Optional | Get book parts for a book |
| GET | `/api/book-parts/{id}` | Optional | Get book part details |
| GET | `/api/cart` | Yes | Get user's cart |
| POST | `/api/cart` | Yes | Add book to cart |
| PATCH | `/api/cart/items/{id}` | Yes | Update cart item quantity |
| DELETE | `/api/cart/items/{id}` | Yes | Remove item from cart |
| DELETE | `/api/cart` | Yes | Clear cart |
| GET | `/api/wishlist` | Yes | Get user's wishlist |
| POST | `/api/wishlist` | Yes | Add book to wishlist |
| DELETE | `/api/wishlist/{bookId}` | Yes | Remove book from wishlist |
| GET | `/api/addresses` | Yes | Get user's addresses |
| POST | `/api/addresses` | Yes | Create new address |
| GET | `/api/addresses/{id}` | Yes | Get address details |
| PATCH | `/api/addresses/{id}` | Yes | Update address |
| DELETE | `/api/addresses/{id}` | Yes | Delete address |
| POST | `/api/orders` | Yes | Create order (checkout) |
| GET | `/api/orders` | Yes | Get user's orders |
| GET | `/api/orders/{id}` | Yes | Get order details |
| GET | `/api/settings` | No | Get all settings |
| GET | `/api/settings/{key}` | No | Get setting by key |
