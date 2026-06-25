# Admin Implementation Guide

This document provides comprehensive API documentation for the Bookstore CMS Admin Panel. All endpoints use the global `/api` prefix.

## Base URL
```
http://localhost:5000/api
```

## Authentication

### Signup
**Endpoint:** `POST /api/auth/signup`  
**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Admin Login
**Endpoint:** `POST /api/auth/admin/login`

**Request Body:**
```json
{
  "email": "admin@bookstore.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "accessToken": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "admin@bookstore.com",
    "role": "ADMIN"
  }
}
```

### User Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response:**
```json
{
  "accessToken": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER"
  }
}
```

**Headers for authenticated requests:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Users

### Create User
**Endpoint:** `POST /api/users`  
**Access:** Admin only

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "password": "password123",
  "role": "USER",
  "status": "ACTIVE"
}
```

### Get All Users
**Endpoint:** `GET /api/users`  
**Access:** Admin only

**Response:**
```json
{
  "message": "Users retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "role": "USER",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get User by ID
**Endpoint:** `GET /api/users/:id`  
**Access:** Admin only

### Update User
**Endpoint:** `PATCH /api/users/:id`  
**Access:** Admin only

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "firstName": "Updated",
  "status": "ACTIVE"
}
```

### Delete User
**Endpoint:** `DELETE /api/users/:id`  
**Access:** Admin only

---

## Publications

### Create Publication
**Endpoint:** `POST /api/publications`  
**Access:** Admin only

**Request Body:**
```json
{
  "name": "Penguin Random House",
  "slug": "penguin-random-house",
  "description": "World's largest trade book publisher",
  "status": "PUBLISHED"
}
```

### Get All Publications
**Endpoint:** `GET /api/publications`  
**Access:** Public

### Get Publication by ID
**Endpoint:** `GET /api/publications/:id`  
**Access:** Public

### Update Publication
**Endpoint:** `PATCH /api/publications/:id`  
**Access:** Admin only

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### Delete Publication
**Endpoint:** `DELETE /api/publications/:id`  
**Access:** Admin only

---

## Subjects

### Create Subject
**Endpoint:** `POST /api/subjects`  
**Access:** Admin only

**Request Body:**
```json
{
  "name": "Fiction",
  "slug": "fiction",
  "description": "Fiction books and novels"
}
```

### Get All Subjects
**Endpoint:** `GET /api/subjects`  
**Access:** Public

### Get Subject by ID
**Endpoint:** `GET /api/subjects/:id`  
**Access:** Public

### Update Subject
**Endpoint:** `PATCH /api/subjects/:id`  
**Access:** Admin only

### Delete Subject
**Endpoint:** `DELETE /api/subjects/:id`  
**Access:** Admin only

---

## Books

### Create Book
**Endpoint:** `POST /api/books`  
**Access:** Admin only  
**Content-Type:** `multipart/form-data`

**Form Fields:**
- `title` (string, required)
- `slug` (string, required, unique)
- `shortDescription` (string, optional)
- `description` (string, optional)
- `isbn` (string, optional, unique)
- `price` (number, required)
- `discountPrice` (number, optional)
- `publicationDate` (string, optional, ISO date)
- `edition` (string, optional)
- `language` (string, optional)
- `stock` (number, optional, default: 0)
- `status` (string, optional, default: DRAFT)
- `publicationId` (string, optional)
- `subjectId` (string, optional)
- `thumbnail` (file, optional) — Book cover image
- `attachments` (files, optional) — Additional book images

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Response includes:** Book data with `thumbnail` URL and `attachments` array (each containing `url`, `publicId`, `type`).

### Get All Books
**Endpoint:** `GET /api/books`  
**Access:** Public

**Response includes:** Each book contains `thumbnail` URL and `attachments` array.

### Get Book by ID
**Endpoint:** `GET /api/books/:id`  
**Access:** Public

**Response includes:** Full book details with `thumbnail` URL and all `attachments` (images, PDFs, banners).

### Update Book
**Endpoint:** `PATCH /api/books/:id`  
**Access:** Admin only

### Delete Book
**Endpoint:** `DELETE /api/books/:id`  
**Access:** Admin only

---

## Book Parts

### Create Book Part
**Endpoint:** `POST /api/book-parts`  
**Access:** Admin only

**Request Body:**
```json
{
  "bookId": "uuid",
  "title": "Part 1: Introduction",
  "partNumber": 1,
  "description": "Introduction to the book",
  "price": 9.99
}
```

### Get All Book Parts
**Endpoint:** `GET /api/book-parts?bookId=uuid`  
**Access:** Public

### Get Book Part by ID
**Endpoint:** `GET /api/book-parts/:id`  
**Access:** Public

### Update Book Part
**Endpoint:** `PATCH /api/book-parts/:id`  
**Access:** Admin only

### Delete Book Part
**Endpoint:** `DELETE /api/book-parts/:id`  
**Access:** Admin only

---

## Book Attachments

### Create Book Attachment
**Endpoint:** `POST /api/book-attachments`  
**Access:** Admin only

**Request Body:**
```json
{
  "bookId": "uuid",
  "url": "https://res.cloudinary.com/...",
  "publicId": "bookstore/abc123",
  "type": "IMAGE",
  "sortOrder": 1
}
```

**Attachment Types:** `IMAGE`, `PDF`, `BANNER`, `THUMBNAIL`

### Get All Book Attachments
**Endpoint:** `GET /api/book-attachments?bookId=uuid`  
**Access:** Public

### Get Book Attachment by ID
**Endpoint:** `GET /api/book-attachments/:id`  
**Access:** Public

### Update Book Attachment
**Endpoint:** `PATCH /api/book-attachments/:id`  
**Access:** Admin only

**Request Body:**
```json
{
  "url": "https://res.cloudinary.com/...",
  "publicId": "bookstore/xyz789",
  "type": "IMAGE",
  "sortOrder": 2
}
```

### Delete Book Attachment
**Endpoint:** `DELETE /api/book-attachments/:id`  
**Access:** Admin only

**Note:** Deleting an attachment also removes the file from Cloudinary storage using the stored `publicId`.

---

## Reviews

### Create Review
**Endpoint:** `POST /api/reviews`  
**Access:** Admin only

**Request Body:**
```json
{
  "bookId": "uuid",
  "reviewerName": "John Doe",
  "designation": "Book Reviewer",
  "rating": 5,
  "comment": "Great book!",
  "displayOrder": 1
}
```

**Rating:** Must be between 1 and 5

### Get All Reviews
**Endpoint:** `GET /api/reviews?bookId=uuid`  
**Access:** Public

### Get Review by ID
**Endpoint:** `GET /api/reviews/:id`  
**Access:** Public

### Update Review
**Endpoint:** `PATCH /api/reviews/:id`  
**Access:** Admin only

### Delete Review
**Endpoint:** `DELETE /api/reviews/:id`  
**Access:** Admin only

---

## Teachers

### Create Teacher
**Endpoint:** `POST /api/teachers`  
**Access:** Admin only

**Request Body:**
```json
{
  "name": "Dr. John Smith",
  "designation": "Professor",
  "bio": "Biography here",
  "photo": "https://example.com/photo.jpg",
  "facebook": "https://facebook.com/johnsmith",
  "linkedin": "https://linkedin.com/in/johnsmith",
  "website": "https://johnsmith.com",
  "displayOrder": 1,
  "featured": true
}
```

### Get All Teachers
**Endpoint:** `GET /api/teachers`  
**Access:** Public

### Get Teacher by ID
**Endpoint:** `GET /api/teachers/:id`  
**Access:** Public

### Update Teacher
**Endpoint:** `PATCH /api/teachers/:id`  
**Access:** Admin only

### Delete Teacher
**Endpoint:** `DELETE /api/teachers/:id`  
**Access:** Admin only

### Add Book to Teacher
**Endpoint:** `POST /api/teachers/:id/books`  
**Access:** Admin only

**Request Body:**
```json
{
  "bookId": "uuid"
}
```

### Remove Book from Teacher
**Endpoint:** `DELETE /api/teachers/:id/books`  
**Access:** Admin only

**Request Body:**
```json
{
  "bookId": "uuid"
}
```

---

## Categories

### Create Category
**Endpoint:** `POST /api/categories`  
**Access:** Admin only

**Request Body:**
```json
{
  "name": "Fiction",
  "slug": "fiction",
  "parentId": "uuid"
}
```

### Get All Categories
**Endpoint:** `GET /api/categories`  
**Access:** Public

### Get Category by ID
**Endpoint:** `GET /api/categories/:id`  
**Access:** Public

### Update Category
**Endpoint:** `PATCH /api/categories/:id`  
**Access:** Admin only

### Delete Category
**Endpoint:** `DELETE /api/categories/:id`  
**Access:** Admin only

---

## Banners

### Create Banner
**Endpoint:** `POST /api/banners`  
**Access:** Admin only

**Request Body:**
```json
{
  "title": "Welcome to Bookstore",
  "subtitle": "Discover amazing books",
  "image": "https://example.com/banner.jpg",
  "buttonText": "Shop Now",
  "buttonUrl": "/books",
  "displayOrder": 1
}
```

### Get All Banners
**Endpoint:** `GET /api/banners`  
**Access:** Public

### Get Banner by ID
**Endpoint:** `GET /api/banners/:id`  
**Access:** Public

### Update Banner
**Endpoint:** `PATCH /api/banners/:id`  
**Access:** Admin only

### Delete Banner
**Endpoint:** `DELETE /api/banners/:id`  
**Access:** Admin only

---

## Settings

### Get Setting by Key
**Endpoint:** `GET /api/settings/:key`  
**Access:** Public

### Get All Settings
**Endpoint:** `GET /api/settings`  
**Access:** Public

### Create/Update Setting
**Endpoint:** `POST /api/settings`  
**Access:** Admin only

**Request Body:**
```json
{
  "key": "site_name",
  "value": "Bookstore CMS"
}
```

### Update Setting
**Endpoint:** `PATCH /api/settings/:key`  
**Access:** Admin only

**Request Body:**
```json
{
  "value": "New Value"
}
```

### Delete Setting
**Endpoint:** `DELETE /api/settings/:key`  
**Access:** Admin only

---

## Orders

### Create Order
**Endpoint:** `POST /api/orders`  
**Access:** Authenticated users

**Request Body:**
```json
{
  "addressId": "uuid",
  "discount": 0,
  "shipping": 5.00,
  "paymentMethod": "COD",
  "notes": "Delivery notes"
}
```

**Payment Methods:** `COD`, `CARD`, `BANK_TRANSFER`, `MOBILE_BANKING`

### Get All Orders
**Endpoint:** `GET /api/orders`  
**Access:** Authenticated users (own orders) or Admin

### Get Order by ID
**Endpoint:** `GET /api/orders/:id`  
**Access:** Authenticated users (own order) or Admin

### Update Order Status
**Endpoint:** `PATCH /api/orders/:id/status`  
**Access:** Admin only

**Request Body:**
```json
{
  "status": "CONFIRMED"
}
```

**Order Statuses:** `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`

---

## Audit Logs

### Get All Audit Logs
**Endpoint:** `GET /api/audit-logs`  
**Access:** Admin only

### Get Audit Logs by Entity
**Endpoint:** `GET /api/audit-logs/entity?entity=Book`  
**Access:** Admin only

---

## File Upload

Files are uploaded to Cloudinary. The API returns a Cloudinary `url` and `publicId` for each uploaded file. The `publicId` is required for future deletion from Cloudinary.

### Upload Book Attachment
**Endpoint:** `POST /api/upload/book-attachment`  
**Access:** Admin only

**Form Data:**
- `file`: The file to upload (max 10MB)
- `bookId`: UUID of the book
- `type`: `IMAGE`, `PDF`, `BANNER`, or `THUMBNAIL`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "status": "success",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "bookstore/abc123"
  }
}
```

### Delete Book Attachment
**Endpoint:** `DELETE /api/upload/book-attachment/:id`  
**Access:** Admin only

**Note:** This permanently deletes the file from Cloudinary and soft-deletes the attachment record from the database.

---

## Response Format

All API responses follow this format:

**Success Response:**
```json
{
  "message": "Operation completed successfully",
  "status": "success",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": ["error message"],
  "error": "Bad Request"
}
```

## Enums Reference

### Role
- `ADMIN`
- `USER`

### BookStatus
- `DRAFT`
- `PUBLISHED`
- `ARCHIVED`

### UserStatus
- `ACTIVE`
- `INACTIVE`
- `SUSPENDED`

### OrderStatus
- `PENDING`
- `CONFIRMED`
- `PROCESSING`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`
- `RETURNED`

### PaymentStatus
- `PENDING`
- `COMPLETED`
- `FAILED`
- `REFUNDED`

### PaymentMethod
- `COD`
- `CARD`
- `BANK_TRANSFER`
- `MOBILE_BANKING`

### AttachmentType
- `IMAGE`
- `PDF`
- `BANNER`
- `THUMBNAIL`

### Provider
- `EMAIL`
- `GOOGLE`
- `FACEBOOK`
- `APPLE`
