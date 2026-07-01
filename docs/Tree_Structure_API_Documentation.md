# Tree Structure API Documentation

## Overview
This document provides a complete guide for implementing the tree structure API in the admin panel. The tree structure follows: `publications > subjects > books`.

## Database Schema Changes

### Publication Model
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String (UUID) | Yes | - | Primary key |
| `name` | String | Yes | - | Publication name |
| `slug` | String | Yes | - | Unique slug |
| `description` | String | No | null | Description |
| `logo` | String | No | null | Logo URL |
| `status` | BookStatus | No | PUBLISHED | Status for soft delete |
| `isActive` | Boolean | No | true | Toggle visibility |
| `createdAt` | DateTime | Yes | now() | Creation timestamp |
| `updatedAt` | DateTime | Yes | - | Update timestamp |
| `deletedAt` | DateTime | No | null | Soft delete timestamp |

### Subject Model
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String (UUID) | Yes | - | Primary key |
| `name` | String | Yes | - | Subject name |
| `slug` | String | Yes | - | Unique slug |
| `description` | String | No | null | Description |
| `publicationId` | String | No | null | Optional link to publication |
| `isActive` | Boolean | No | true | Toggle visibility |
| `createdAt` | DateTime | Yes | now() | Creation timestamp |
| `updatedAt` | DateTime | Yes | - | Update timestamp |
| `deletedAt` | DateTime | No | null | Soft delete timestamp |

### Book Model
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String (UUID) | Yes | - | Primary key |
| `title` | String | Yes | - | Book title |
| `slug` | String | Yes | - | Unique slug |
| `publicationId` | String | **Yes** | - | **Now mandatory** - links to publication |
| `subjectId` | String | **Yes** | - | **Now mandatory** - links to subject |
| `status` | BookStatus | No | DRAFT | Book status |
| `price` | Decimal | Yes | - | Book price |
| `thumbnail` | String | No | null | Thumbnail URL |

## API Endpoints

### 1. Publications API

#### GET /publications
**Description:** Get all publications
**Access:** Public (returns only active) / Admin (returns all)

**Response:**
```json
{
  "message": "Publications retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Publication Name",
      "slug": "publication-slug",
      "description": "Description",
      "logo": "url",
      "status": "PUBLISHED",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /publications
**Description:** Create a new publication
**Access:** Admin only

**Request Body:**
```json
{
  "name": "Publication Name",
  "slug": "publication-slug",
  "description": "Description",
  "logo": "url",
  "status": "PUBLISHED",
  "isActive": true
}
```

#### PATCH /publications/:id
**Description:** Update a publication
**Access:** Admin only

**Request Body:**
```json
{
  "name": "Updated Name",
  "slug": "updated-slug",
  "description": "Updated Description",
  "logo": "url",
  "status": "PUBLISHED",
  "isActive": false
}
```

### 2. Subjects API

#### GET /subjects
**Description:** Get all subjects
**Access:** Public (returns only active) / Admin (returns all)

**Query Parameters:**
- `publicationId` (optional): Filter subjects by publication

**Response:**
```json
{
  "message": "Subjects retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Subject Name",
      "slug": "subject-slug",
      "description": "Description",
      "publicationId": "publication-uuid",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /subjects
**Description:** Create a new subject
**Access:** Admin only

**Request Body:**
```json
{
  "name": "Subject Name",
  "slug": "subject-slug",
  "description": "Description",
  "publicationId": "publication-uuid",  // Optional - link to publication
  "isActive": true
}
```

#### PATCH /subjects/:id
**Description:** Update a subject
**Access:** Admin only

**Request Body:**
```json
{
  "name": "Updated Name",
  "slug": "updated-slug",
  "description": "Updated Description",
  "publicationId": "publication-uuid",  // Optional - can change publication
  "isActive": false
}
```

### 3. Books API

#### GET /books
**Description:** Get all books
**Access:** Public (returns only published) / Admin (returns all)

**Response:**
```json
{
  "message": "Books retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "title": "Book Title",
      "slug": "book-slug",
      "publicationId": "publication-uuid",  // Now mandatory
      "subjectId": "subject-uuid",          // Now mandatory
      "status": "PUBLISHED",
      "price": 29.99,
      "thumbnail": "url"
    }
  ]
}
```

#### GET /books/tree
**Description:** Get books in tree structure: publications > subjects > books
**Access:** Public (returns only active, published books)

**Response:**
```json
[
  {
    "publication": {
      "id": "publication-uuid",
      "name": "Publication Name",
      "slug": "publication-slug",
      "isActive": true
    },
    "subjects": [
      {
        "subject": {
          "id": "subject-uuid",
          "name": "Subject Name",
          "slug": "subject-slug",
          "isActive": true
        },
        "books": [
          {
            "id": "book-uuid",
            "title": "Book Title",
            "slug": "book-slug",
            "price": 29.99,
            "thumbnail": "url"
          }
        ]
      }
    ]
  }
]
```

#### POST /books
**Description:** Create a new book
**Access:** Admin only

**Request Body:**
```json
{
  "title": "Book Title",
  "slug": "book-slug",
  "shortDescription": "Short description",
  "description": "Full description",
  "isbn": "978-0-123456-78-9",
  "price": 29.99,
  "discountPrice": 24.99,
  "publicationDate": "2024-01-01",
  "edition": "1st Edition",
  "language": "English",
  "stock": true,
  "stockAmount": 100,
  "status": "PUBLISHED",
  "thumbnail": "url",
  "publicationId": "publication-uuid",  // REQUIRED
  "subjectId": "subject-uuid"           // REQUIRED
}
```

**Validation:**
- `publicationId` must reference an existing publication
- `subjectId` must reference an existing subject
- If subject has a `publicationId`, it must match the book's `publicationId`

#### PATCH /books/:id
**Description:** Update a book
**Access:** Admin only

**Request Body:**
```json
{
  "title": "Updated Title",
  "slug": "updated-slug",
  "price": 39.99,
  "publicationId": "new-publication-uuid",  // Can change
  "subjectId": "new-subject-uuid"           // Can change
}
```

## Admin Panel Implementation Guide

### 1. Publications Management

#### Create Publication Form
- Fields: `name`, `slug`, `description`, `logo`, `isActive` (toggle switch)
- `isActive` defaults to `true`

#### Publications List
- Display: `name`, `slug`, `isActive` (badge), `status`
- Actions: Edit, Delete, Toggle Active Status

### 2. Subjects Management

#### Create Subject Form
- Fields: `name`, `slug`, `description`, `publicationId` (dropdown), `isActive` (toggle switch)
- `publicationId` dropdown: Populated from active publications
- `isActive` defaults to `true`

#### Subjects List
- Display: `name`, `slug`, `publication` (name), `isActive` (badge)
- Actions: Edit, Delete, Toggle Active Status

### 3. Books Management

#### Create Book Form
- Fields: `title`, `slug`, `isbn`, `price`, `discountPrice`, `publicationDate`, `edition`, `language`, `stock`, `stockAmount`, `status`, `thumbnail`
- **Required Dropdowns:**
  - `publicationId` (required) - Populated from active publications
  - `subjectId` (required) - Populated from active subjects (filtered by selected publication)

#### Books List
- Display: `title`, `slug`, `publication` (name), `subject` (name), `status`, `price`
- Actions: Edit, Delete

### 4. Tree View Component

#### API Integration
```javascript
// Fetch tree data
const response = await fetch('/api/books/tree');
const treeData = await response.json();

// Render tree structure
treeData.forEach(publication => {
  // Create publication node
  publication.subjects.forEach(subject => {
    // Create subject node under publication
    subject.books.forEach(book => {
      // Create book node under subject
    });
  });
});
```

#### UI Structure
```
Publications
├── Publication 1
│   ├── Subject 1
│   │   ├── Book 1
│   │   └── Book 2
│   └── Subject 2
│       └── Book 3
└── Publication 2
    └── Subject 3
        └── Book 4
```

## Migration Notes

### Breaking Changes
1. **Book Creation:** `publicationId` and `subjectId` are now **required** fields
2. **Existing Books:** Must be updated to have valid `publicationId` and `subjectId`

### Data Migration
Run the following to update existing data:
```bash
npx prisma migrate dev
npx prisma db seed
```

## Testing Checklist

- [ ] Create publication with `isActive: true`
- [ ] Create subject with `publicationId` and `isActive: true`
- [ ] Create book with mandatory `publicationId` and `subjectId`
- [ ] Verify validation: book cannot be created with non-existent publication
- [ ] Verify validation: book cannot be created with subject from different publication
- [ ] Test `GET /books/tree` returns correct structure
- [ ] Test `isActive: false` hides items from public endpoints
- [ ] Test admin endpoints return all items regardless of `isActive`

## Troubleshooting

### 404 Error on `/api/books/tree`
**Cause:** Route order issue in NestJS - `@Get(':id')` was catching `/tree` as a parameter.

**Solution:** The `@Get('tree')` route must be defined BEFORE `@Get(':id')` in the controller. This has been fixed in [`src/book/book.controller.ts`](src/book/book.controller.ts).

**Action Required:**
1. Restart the NestJS server after code changes
2. Verify the server is running on port 5000
3. Check server logs for any startup errors

### "Book not found" Error
**Cause:** The endpoint was being routed to `findOne` method instead of `getTree` due to route ordering.

**Solution:** After fixing the route order, restart the server and test again.