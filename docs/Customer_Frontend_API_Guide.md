# 📱 Customer Frontend API Implementation Guide

## 📋 Overview

This document provides a complete guide for updating the **customer-facing frontend** to work with the new backend API structure. The backend has been migrated from a single-`Book` pricing model to a **parent-child model** where:

- **`Book`** contains shared information (title, description, publication, subject, thumbnail, etc.)
- **`BookPaper`** contains variant-specific pricing, inventory, and attributes (Paper A, MCQ Paper, English Version, etc.)

The frontend must be updated to reflect these changes across all user-facing flows: product listing, product detail, cart, and checkout.

---

## 🔴 Critical Concept: Papers are Variants

A single book (e.g., "Physics for Class 11") can now have multiple **papers** (e.g., "Paper A", "Paper B", "MCQ Paper"). Each paper has its own:

- Price and discount
- Stock quantity
- ISBN and page count
- Thumbnail (optional, overrides book thumbnail)

**The customer must select a specific paper before adding to cart.**

---

## 1️⃣ Product Listing Page (`GET /books` and `GET /books/tree`)

### What Changed

| Field | Status | Notes |
|-------|--------|-------|
| `price` | ❌ **REMOVED** | No longer on Book model |
| `discountPrice` | ❌ **REMOVED** | No longer on Book model |
| `stock` | ❌ **REMOVED** | No longer on Book model |
| `papers` | ✅ **NEW** | Array of `BookPaper` objects |
| `priceRange` | ✅ **NEW** | `{ min, max, display }` — use this for listing |

### Response Changes

**Before:**
```json
{
  "id": "uuid",
  "title": "Physics for Class 11",
  "price": 300,
  "discountPrice": 250,
  "stock": 100,
  "thumbnail": "https://..."
}
```

**After:**
```json
{
  "id": "uuid",
  "title": "Physics for Class 11",
  "thumbnail": "https://...",
  "priceRange": {
    "min": 250,
    "max": 400,
    "display": "From ৳250"
  },
  "papers": [
    {
      "id": "uuid",
      "code": "A",
      "name": "Paper A",
      "price": 300,
      "effectivePrice": 250,
      "isInStock": true
    }
  ]
}
```

### Frontend Changes Needed

1. **Replace `price` display with `priceRange.display`**
   - If `priceRange` is `null`: show "Price not available"
   - If `priceRange.display` is `"৳300"`: show single price
   - If `priceRange.display` is `"From ৳250"`: show range with "From" prefix

2. **Remove stock indicator from listing** — stock is now per-paper, not per-book

3. **Add paper count badge** (optional): show number of available papers

4. **Clicking a book should navigate to the paper selection page** (see Product Detail below)

---

## 2️⃣ Product Detail Page (`GET /books/:id`)

### What Changed

The book detail response now includes a `papers` array. The customer must select a paper before purchasing.

### Response Example

```json
{
  "data": {
    "id": "uuid",
    "title": "Physics for Class 11",
    "description": "...",
    "thumbnail": "https://...",
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
        "pageCount": 300,
        "thumbnail": "https://...",
        "sortOrder": 0,
        "isDefault": true,
        "status": "PUBLISHED",
        "effectivePrice": 250,
        "isInStock": true
      },
      {
        "id": "uuid",
        "code": "B",
        "name": "Paper B",
        "price": 350,
        "discountPrice": null,
        "stock": 50,
        "isDefault": false,
        "status": "PUBLISHED",
        "effectivePrice": 350,
        "isInStock": true
      }
    ]
  }
}
```

### Frontend Changes Needed

1. **Show paper selection UI** (required before adding to cart):
   - List all published papers with their names, prices, and stock status
   - Highlight the `isDefault` paper (pre-select it)
   - Show "Out of Stock" badge for papers where `isInStock: false`
   - Show discount price and countdown if discount is active

2. **Price display logic:**
   - Use `effectivePrice` for the selected paper
   - If `discountPrice` is active (within date range), show strikethrough original price
   - Show discount percentage: `Math.round((1 - effectivePrice / price) * 100)%`

3. **Stock display:**
   - Show "In Stock" / "Only X left" / "Out of Stock" based on `isInStock` and `stock`
   - Disable "Add to Cart" button if selected paper is out of stock

4. **Thumbnail:**
   - Use paper's `thumbnail` if available, otherwise fall back to book's `thumbnail`

5. **Add to Cart button:**
   - Must include the selected `paperId` in the request
   - Disable if no paper is selected

---

## 3️⃣ Cart API (`POST /cart/add`, `GET /cart`)

### What Changed

| Field | Status | Notes |
|-------|--------|-------|
| `paperId` | ✅ **NEW** | Optional paper selection when adding to cart |
| `paper` | ✅ **NEW** | Full paper object included in cart items |

### Add to Cart Request

**Before:**
```json
{
  "bookId": "uuid",
  "quantity": 1
}
```

**After:**
```json
{
  "bookId": "uuid",
  "paperId": "uuid",
  "quantity": 1
}
```

**Note:** `paperId` is optional for backward compatibility, but the frontend should always send it when a paper is selected.

### Cart Response

```json
{
  "data": {
    "cartItems": [
      {
        "id": "uuid",
        "bookId": "uuid",
        "paperId": "uuid",
        "quantity": 1,
        "book": {
          "id": "uuid",
          "title": "Physics for Class 11",
          "thumbnail": "https://..."
        },
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

### Frontend Changes Needed

1. **Add to Cart flow:**
   - Always send `paperId` along with `bookId`
   - If user tries to add without selecting a paper, show error: "Please select a paper variant"

2. **Cart page:**
   - Show paper name and price for each cart item
   - Allow changing paper selection (remove and re-add with different paper)
   - Show paper-specific stock status
   - Use `paper.effectivePrice` for price display

3. **Cart item structure:**
   - Each cart item now represents a specific book + paper combination
   - Same book with different papers = separate cart items

---

## 4️⃣ Checkout / Order API (`POST /orders`, `GET /orders/:id`)

### What Changed

| Field | Status | Notes |
|-------|--------|-------|
| `paperId` | ✅ **NEW** | The specific paper variant purchased |
| `paperName` | ✅ **NEW** | Snapshot of paper name at purchase time |
| `paperPrice` | ✅ **NEW** | Effective price at purchase time |

### Order Items Response

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
      "subtotal": 250,
      "paper": {
        "id": "uuid",
        "name": "Paper A",
        "price": 300,
        "effectivePrice": 250
      }
    }
  ]
}
```

### Frontend Changes Needed

1. **Order confirmation page:**
   - Show `paperName` for each item
   - Show `paperPrice` (the price at time of purchase)
   - Show discount if `paperPrice` < original `paper.price`

2. **Order history / order detail:**
   - Display paper variant name alongside book title
   - Show the price the customer paid (`paperPrice`)

3. **Order summary:**
   - Items are now book + paper combinations
   - Subtotal is calculated per paper variant

---

## 5️⃣ Complete API Flow for Customer Frontend

### Flow 1: Browse Books

```
GET /books
→ Display list with priceRange.display
→ On click → navigate to book detail
```

### Flow 2: View Book Detail & Select Paper

```
GET /books/:id
→ Show book info (title, description, thumbnail)
→ Show papers list:
   - Paper A — ৳300 (৳250 with discount) — In Stock
   - Paper B — ৳350 — Only 5 left
   - MCQ Paper — Out of Stock
→ User selects a paper
→ Show selected paper price and stock
→ "Add to Cart" button enabled
```

### Flow 3: Add to Cart

```
POST /cart/add
Body: {
  "bookId": "uuid",
  "paperId": "uuid",  // selected paper
  "quantity": 1
}
→ On success → update cart count
→ On error (out of stock) → show message
```

### Flow 4: View Cart

```
GET /cart
→ For each item:
   - Book title + Paper name
   - Paper price (effectivePrice)
   - Quantity selector
   - Remove button
→ Show total
→ Proceed to checkout
```

### Flow 5: Checkout

```
POST /orders
Body: {
  "addressId": "uuid",
  "paymentMethod": "COD",
  "notes": "..."
}
→ Order created with paper-specific pricing
→ Redirect to order confirmation
→ Show paperName and paperPrice in confirmation
```

---

## 6️⃣ Important Notes for Frontend

### Price Display Logic

```javascript
function getDisplayPrice(paper) {
  const now = new Date();
  const isDiscounted = paper.discountPrice &&
    paper.discountStartDate &&
    paper.discountEndDate &&
    now >= new Date(paper.discountStartDate) &&
    now <= new Date(paper.discountEndDate);

  if (isDiscounted) {
    return {
      price: paper.effectivePrice,
      originalPrice: Number(paper.price),
      discount: Math.round((1 - paper.effectivePrice / Number(paper.price)) * 100)
    };
  }

  return {
    price: Number(paper.price),
    originalPrice: null,
    discount: 0
  };
}
```

### Stock Display Logic

```javascript
function getStockStatus(paper) {
  if (paper.stock <= 0) {
    return { text: 'Out of Stock', canAddToCart: false };
  }
  if (paper.stock <= 5) {
    return { text: `Only ${paper.stock} left`, canAddToCart: true };
  }
  return { text: 'In Stock', canAddToCart: true };
}
```

### Paper Selection State

```javascript
// In product detail page
const [selectedPaperId, setSelectedPaperId] = useState(paper.isDefault ? paper.id : null);

// Validate before add to cart
if (!selectedPaperId) {
  alert('Please select a paper variant');
  return;
}
```

---

## 7️⃣ API Endpoint Summary (Customer-Facing)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/books` | Public | List books with `priceRange` |
| `GET` | `/books/:id` | Public | Get book with `papers` array |
| `GET` | `/books/tree` | Public | Get tree structure with `priceRange` |
| `POST` | `/cart/add` | User | Add to cart (must include `paperId`) |
| `GET` | `/cart` | User | Get cart with paper details |
| `PATCH` | `/cart/item/:id` | User | Update cart item quantity |
| `DELETE` | `/cart/item/:id` | User | Remove item from cart |
| `POST` | `/orders` | User | Create order (uses paper pricing) |
| `GET` | `/orders` | User | List user's orders |
| `GET` | `/orders/:id` | User | Get order with paper details |

---

## 8️⃣ Breaking Changes Summary

| Feature | Before | After |
|---------|--------|-------|
| Product listing price | `book.price` | `book.priceRange.display` |
| Product detail price | `book.price` | Select `paper.effectivePrice` |
| Add to cart | `bookId` + `quantity` | `bookId` + `paperId` + `quantity` |
| Cart item | Book only | Book + Paper |
| Order item | `bookTitle` + `price` | `bookTitle` + `paperName` + `paperPrice` |
| Stock | Per book | Per paper |
| Discount | Per book | Per paper (date-range based) |

---

*Generated from backend implementation verification of `docs/Book_Paper_Variant_API_Changes.md` and `docs/Updated_Book_Service_implementation.md`*
