# 📚 Book Paper Variant API Changes — Developer Guide

## 📋 Overview

The backend has been migrated from a single-`Book` pricing model to a **parent-child model** where:
- **`Book`** contains shared information (title, description, publication, subject, etc.)
- **`BookPaper`** contains variant-specific pricing, inventory, and attributes (Paper A, MCQ Paper, English Version, etc.)

This document explains all API changes and new functionality so the **admin panel** can be updated accordingly.

---

## 🔴 Critical Concept: Two-Step Creation

**Books and Papers are now separate entities.** When creating a book in the admin panel:

1. **First**, create the `Book` (shared info only — no price, stock, or ISBN)
2. **Then**, create one or more `BookPaper` records linked to that book (each with its own price, stock, ISBN, etc.)

A book **must have at least one paper** to be sellable.

---

## 1️⃣ Book API Changes

### Base URL: `/books`

### What Changed on `Book`

| Field | Status | Notes |
|-------|--------|-------|
| `price` | ❌ **REMOVED** | Moved to `BookPaper` |
| `discountPrice` | ❌ **REMOVED** | Moved to `BookPaper` |
| `isbn` | ❌ **REMOVED** | Moved to `BookPaper` |
| `stock` | ❌ **REMOVED** | Moved to `BookPaper` |
| `stockAmount` | ❌ **REMOVED** | Moved to `BookPaper` |
| `papers` | ✅ **NEW** | Array of `BookPaper` objects included in responses |
| `priceRange` | ✅ **NEW** | Computed field `{ min, max, display }` added to list/tree responses |

### Create Book — `POST /books`

**Request Body Changes:**
```json
{
  "title": "Physics for Class 11",
  "slug": "physics-class-11",
  "shortDescription": "Comprehensive physics guide",
  "description": "Full description...",
  "publicationDate": "2025-01-01",
  "edition": "2025",
  "language": "English",
  "status": "DRAFT",
  "thumbnail": "https://...",
  "publicationId": "uuid",
  "subjectId": "uuid"
}
```

**Removed fields (no longer accepted):**
- `isbn`
- `price`
- `discountPrice`
- `stock`
- `stockAmount`

**Response:**
```json
{
  "message": "Book created successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Physics for Class 11",
    "slug": "physics-class-11",
    "papers": [],
    "priceRange": null,
    ...
  }
}
```

### Update Book — `PATCH /books/:id`

Same removals apply. Only shared book fields can be updated.

### Get All Books — `GET /books`

**New field in each book object:**
```json
{
  "id": "uuid",
  "title": "Physics for Class 11",
  "papers": [...],
  "priceRange": {
    "min": 250,
    "max": 400,
    "display": "From ৳250"
  }
}
```

If all papers have the same price: `"display": "৳300"`
If papers have different prices: `"display": "From ৳250"`

### Get Single Book — `GET /books/:id`

Now includes `papers` array:
```json
{
  "data": {
    "id": "uuid",
    "title": "Physics for Class 11",
    "papers": [
      {
        "id": "uuid",
        "code": "A",
        "name": "Paper A",
        "price": 300,
        "discountPrice": 250,
        "discountStartDate": "2025-01-01",
        "discountEndDate": "2025-12-31",
        "stock": 100,
        "isbn": "978-3-16-148410-0",
        "pageCount": 300,
        "thumbnail": "https://...",
        "sortOrder": 0,
        "isDefault": true,
        "status": "PUBLISHED"
      }
    ]
  }
}
```

### Get Tree — `GET /books/tree`

Each book in the tree now includes `priceRange`:
```json
{
  "publication": { "id": "uuid", "name": "XYZ Publications" },
  "subjects": [
    {
      "subject": { "id": "uuid", "name": "Physics" },
      "books": [
        {
          "id": "uuid",
          "title": "Physics for Class 11",
          "slug": "physics-class-11",
          "priceRange": { "min": 250, "max": 400, "display": "From ৳250" },
          "thumbnail": "https://..."
        }
      ]
    }
  ]
}
```

---

## 2️⃣ BookPaper API (NEW)

### Base URL: `/book-papers`

This is a **new module** that manages paper variants for books.

### Create Paper — `POST /book-papers`

**Content-Type:** `multipart/form-data`

**Request Body (form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bookId` | string | ✅ | ID of the parent book |
| `code` | string | ❌ | Short code like "A", "MCQ", "ENG" |
| `name` | string | ✅ | Display name like "Paper A", "MCQ Paper" |
| `price` | number | ✅ | Base price (non-negative) |
| `discountPrice` | number | ❌ | Discounted price (must be ≤ price) |
| `discountStartDate` | string (date) | ❌ | Discount start date |
| `discountEndDate` | string (date) | ❌ | Discount end date |
| `stock` | number | ❌ | Stock quantity (default: 0) |
| `isbn` | string | ❌ | Unique ISBN per paper |
| `pageCount` | number | ❌ | Number of pages |
| `thumbnail` | **file** | ❌ | Paper-specific thumbnail image (uploaded to Cloudinary) |
| `sortOrder` | number | ❌ | Order in UI (default: 0) |
| `isDefault` | boolean | ❌ | Only ONE paper per book can be default (default: false) |
| `status` | enum | ❌ | `DRAFT` or `PUBLISHED` (default: `PUBLISHED`) |

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/book-papers \
  -H "Authorization: Bearer <admin-token>" \
  -F "bookId=uuid" \
  -F "code=A" \
  -F "name=Paper A" \
  -F "price=300" \
  -F "stock=100" \
  -F "isDefault=true" \
  -F "thumbnail=@/path/to/image.jpg"
```

**Note:** The `thumbnail` field accepts a file upload. If a file is provided, it is uploaded to Cloudinary (folder: `bookstore/thumbnails`) and the returned URL is stored. If no file is provided, the `thumbnail` URL from the DTO is used as-is (if provided as a string field in form-data).

**Response:**
```json
{
  "message": "Book paper created successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "bookId": "uuid",
    "code": "A",
    "name": "Paper A",
    "price": 300,
    "discountPrice": 250,
    "stock": 100,
    "isDefault": true,
    ...
  }
}
```

### Get Papers for a Book — `GET /book-papers/book/:bookId`

Returns all papers for a specific book, sorted by `sortOrder`:
```json
{
  "message": "Book papers retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "code": "A",
      "name": "Paper A",
      "price": 300,
      "effectivePrice": 250,
      "isInStock": true,
      ...
    }
  ]
}
```

**Note:** `effectivePrice` and `isInStock` are computed fields added by the API.

### Get Single Paper — `GET /book-papers/:id`

Returns a single paper with computed `effectivePrice` and `isInStock`.

### Update Paper — `PATCH /book-papers/:id`

**Content-Type:** `multipart/form-data`

Same fields as create, all optional. Only admins can update. The `thumbnail` field accepts a file upload — if provided, the existing thumbnail is replaced with the new Cloudinary URL.

### Delete Paper — `DELETE /book-papers/:id`

Soft deletes a paper. Only admins can delete.

---

## 3️⃣ Cart API Changes

### Base URL: `/cart`

### Add to Cart — `POST /cart/add`

**New optional field:**
```json
{
  "bookId": "uuid",
  "paperId": "uuid",
  "quantity": 1
}
```

**Behavior:**
- If `paperId` is provided: validates the paper exists, is published, and has sufficient stock
- If `paperId` is omitted: allows adding book without specific paper (backward compatibility)
- Cart items are matched by both `bookId` AND `paperId` (if provided)

### Get Cart — `GET /cart`

Cart items now include the full `paper` object:
```json
{
  "data": {
    "cartItems": [
      {
        "id": "uuid",
        "bookId": "uuid",
        "paperId": "uuid",
        "quantity": 1,
        "book": { "id": "uuid", "title": "Physics" },
        "paper": {
          "id": "uuid",
          "name": "Paper A",
          "price": 300,
          "effectivePrice": 250,
          "isInStock": true
        }
      }
    ]
  }
}
```

---

## 4️⃣ Order API Changes

### Base URL: `/orders`

### Create Order — `POST /orders`

**Pricing Logic:**
- If cart item has a `paper`: uses the paper's effective price (considers discount dates)
- If cart item has no `paper`: falls back to book price (backward compatibility)

**Order Items now include:**
```json
{
  "orderItems": [
    {
      "id": "uuid",
      "bookId": "uuid",
      "paperId": "uuid",
      "bookTitle": "Physics for Class 11",
      "paperName": "Paper A",
      "paperPrice": 250,
      "quantity": 1,
      "subtotal": 250
    }
  ]
}
```

**New fields on OrderItem:**
- `paperId` — the specific paper variant purchased
- `paperName` — snapshot of paper name at purchase time
- `paperPrice` — effective price at purchase time (for historical accuracy)

### Get Order — `GET /orders/:id`

Order items now include the full `paper` object:
```json
{
  "data": {
    "orderItems": [
      {
        "bookTitle": "Physics for Class 11",
        "paperName": "Paper A",
        "paperPrice": 250,
        "paper": {
          "id": "uuid",
          "name": "Paper A",
          "price": 300,
          "effectivePrice": 250
        }
      }
    ]
  }
}
```

---

## 5️⃣ Admin Panel Update Guide

### Creating a New Book (New Flow)

The admin panel must now follow a **two-step process**:

#### Step 1: Create the Book
```
POST /books
Headers: Authorization: Bearer <admin-token>
Body: {
  "title": "Physics for Class 11",
  "slug": "physics-class-11",
  "publicationId": "pub-uuid",
  "subjectId": "subject-uuid",
  ...
}
```

**Response gives you the `book.id`** — use this for Step 2.

#### Step 2: Create Papers for the Book
```
POST /book-papers
Headers: Authorization: Bearer <admin-token>
Body: {
  "bookId": "<book-id-from-step-1>",
  "code": "A",
  "name": "Paper A",
  "price": 300,
  "stock": 100,
  "isDefault": true,
  ...
}
```

Repeat Step 2 for each paper variant (Paper B, MCQ Paper, English Version, etc.).

### Editing a Book

1. Update book info via `PATCH /books/:id`
2. Manage papers via:
   - `GET /book-papers/book/:bookId` — list existing papers
   - `POST /book-papers` — add new paper
   - `PATCH /book-papers/:id` — update paper
   - `DELETE /book-papers/:id` — remove paper

### UI Recommendations

1. **Book Form:** Remove price, discount price, stock, and ISBN fields. Keep only shared book info.
2. **Paper Management Section:** Add a new section/tab to manage papers after creating a book:
   - List existing papers with their prices and stock
   - Form to add/edit papers with all paper-specific fields
   - Toggle for `isDefault` (only one per book)
   - `sortOrder` field for ordering papers in the UI
3. **Product Listing:** Show `priceRange` instead of a single price (e.g., "From ৳250" or "৳300")
4. **Product Detail:** Show all papers with their individual prices, discount info, and stock status
5. **Cart:** Allow paper selection before adding to cart. Show paper-specific price and stock.

---

## 6️⃣ Important Notes

### Discount Logic
Discounts are **date-range based**. A discount is only active when:
- `discountPrice` is set
- `discountStartDate` is set
- `discountEndDate` is set
- Current date is between start and end dates (inclusive)

### Stock Management
- Stock is tracked **per paper**, not per book
- Cart validates stock at the paper level
- `stock: 0` means out of stock

### ISBN
- ISBN is now **per paper**, not per book
- Each paper can have its own unique ISBN
- ISBN is optional but must be unique if provided

### Default Paper
- Only **one paper per book** can be marked as `isDefault`
- Setting a paper as default automatically unmarks the previous default

### Backward Compatibility
- `paperId` in cart is optional — books without papers can still be added to cart
- Orders without `paperId` fall back to book-level pricing (for legacy data)

---

## 7️⃣ API Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/books` | Admin | Create book (shared info only) |
| `GET` | `/books` | Public | List books with `priceRange` |
| `GET` | `/books/:id` | Public | Get book with `papers` |
| `PATCH` | `/books/:id` | Admin | Update book |
| `DELETE` | `/books/:id` | Admin | Soft delete book |
| `GET` | `/books/tree` | Public | Get tree with `priceRange` |
| `POST` | `/book-papers` | Admin | Create paper variant |
| `GET` | `/book-papers/book/:bookId` | Public | List papers for a book |
| `GET` | `/book-papers/:id` | Public | Get single paper |
| `PATCH` | `/book-papers/:id` | Admin | Update paper |
| `DELETE` | `/book-papers/:id` | Admin | Delete paper |
| `POST` | `/cart/add` | User | Add to cart (with optional `paperId`) |
| `GET` | `/cart` | User | Get cart with paper details |
| `POST` | `/orders` | User | Create order (uses paper pricing) |
| `GET` | `/orders` | User/Admin | List orders |
| `GET` | `/orders/:id` | User/Admin | Get order with paper details |

---

*Generated from backend implementation verification of `docs/Updated_Book_Service_implementation.md`*