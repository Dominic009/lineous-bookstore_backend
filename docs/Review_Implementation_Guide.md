# Review Implementation Guide

This document provides a complete technical guide for implementing the Review module. Reviews are user/testimonial feedback attached to books, displayed on book detail pages to build trust and provide social proof.

## Table of Contents
1. [Schema Design](#schema-design)
2. [Module Structure](#module-structure)
3. [DTOs](#dtos)
4. [Controller Implementation](#controller-implementation)
5. [Service Implementation](#service-implementation)
6. [API Flow](#api-flow)
7. [Frontend Integration](#frontend-integration)
8. [How to Create a Review for a Book](#how-to-create-a-review-for-a-book)
9. [Rules & Regulations](#rules--regulations)

---

## Schema Design

### Review Model
```prisma
model Review {
  id           String     @id @default(uuid())
  bookId       String
  reviewerName String
  designation  String?
  rating       Int
  comment      String?
  displayOrder Int        @default(0)
  status       BookStatus @default(PUBLISHED)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  deletedAt    DateTime?

  // Relations
  book Book @relation(fields: [bookId], references: [id])

  @@index([bookId])
}
```

**Key Points:**
- `bookId` is a required foreign key linking the review to a specific book
- `rating` is an integer between 1 and 5 (star rating)
- `displayOrder` controls the sort order when displaying multiple reviews for a book — lower values appear first
- `status` uses the `BookStatus` enum (`DRAFT`, `PUBLISHED`, `ARCHIVED`) — defaults to `PUBLISHED`
- `deletedAt` enables soft delete — reviews are never physically removed from the database
- `designation` is optional — used for reviewer titles like "Professor", "Senior Editor", etc.
- `comment` is optional — the full review text/testimonial

---

## Module Structure

### Review Module
```typescript
// src/review/review.module.ts
import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ReviewController],
  providers: [ReviewService, PrismaService],
  exports: [ReviewService],
})
export class ReviewModule {}
```

**Registration in AppModule:**
The `ReviewModule` must be imported in [`src/app.module.ts`](src/app.module.ts):
```typescript
import { ReviewModule } from './review/review.module';

@Module({
  imports: [
    // ... other modules
    ReviewModule,
    // ... other modules
  ],
})
export class AppModule {}
```

---

## DTOs

### CreateReviewDto
```typescript
// src/review/dto/create-review.dto.ts
import {
  IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max,
} from 'class-validator';

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  bookId!: string;

  @IsString()
  @IsNotEmpty()
  reviewerName!: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}
```

### UpdateReviewDto
```typescript
// src/review/dto/update-review.dto.ts
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateReviewDto {
  @IsOptional()
  @IsString()
  reviewerName?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}
```

**Validation Rules:**
- `bookId` and `reviewerName` are required on creation
- `rating` is required and must be between 1 and 5 (inclusive)
- `designation`, `comment`, and `displayOrder` are optional
- `displayOrder` defaults to `0` if not provided
- All string fields are validated for non-empty strings when provided

---

## Controller Implementation

### Review Controller
```typescript
// src/review/review.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  Query, UseGuards, Request,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * Create a new review
   * Access: Admins only
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateReviewDto, @Request() req: RequestWithUser) {
    return this.reviewService.create(dto, req.user.role);
  }

  /**
   * Get all reviews for a book
   * Access: Public
   */
  @Get()
  findAll(@Query('bookId') bookId: string, @Request() req: RequestWithUser) {
    return this.reviewService.findAll(bookId, req?.user?.role);
  }

  /**
   * Get a single review by ID
   * Access: Public
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.reviewService.findOne(id, req?.user?.role);
  }

  /**
   * Update a review
   * Access: Admins only
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @Request() req: RequestWithUser,
  ) {
    return this.reviewService.update(id, dto, req.user.role);
  }

  /**
   * Delete a review
   * Access: Admins only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.reviewService.remove(id, req.user.role);
  }
}
```

---

## Service Implementation

### Review Service
```typescript
// src/review/review.service.ts
import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review, Role, BookStatus } from '@prisma/client';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new review
   * Security: Admins only
   */
  async create(
    dto: CreateReviewDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Review;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can create reviews');
    }

    // Check if book exists
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId, deletedAt: null },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    const review = await this.prisma.review.create({
      data: {
        bookId: dto.bookId,
        reviewerName: dto.reviewerName,
        designation: dto.designation,
        rating: dto.rating,
        comment: dto.comment,
        displayOrder: dto.displayOrder ?? 0,
        status: BookStatus.PUBLISHED,
      },
    });

    return {
      message: 'Review created successfully',
      status: 'success',
      data: review,
    };
  }

  /**
   * Get all reviews for a book
   * Security: Public
   */
  async findAll(
    bookId: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Review[];
  }> {
    const where =
      requestingUserRole === Role.ADMIN
        ? { bookId }
        : { bookId, book: { deletedAt: null, status: BookStatus.PUBLISHED } };

    const reviews = await this.prisma.review.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });

    return {
      message:
        reviews.length > 0
          ? 'Reviews retrieved successfully'
          : 'No reviews found',
      status: 'success',
      data: reviews,
    };
  }

  /**
   * Get a single review by ID
   * Security: Public
   */
  async findOne(
    id: string,
    requestingUserRole?: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Review;
  }> {
    const where =
      requestingUserRole === Role.ADMIN
        ? { id }
        : { id, book: { deletedAt: null, status: BookStatus.PUBLISHED } };

    const review = await this.prisma.review.findUnique({
      where,
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return {
      message: 'Review retrieved successfully',
      status: 'success',
      data: review,
    };
  }

  /**
   * Update a review
   * Security: Admins only
   */
  async update(
    id: string,
    dto: UpdateReviewDto,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: Review;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can update reviews');
    }

    const existingReview = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!existingReview) {
      throw new NotFoundException('Review not found');
    }

    const review = await this.prisma.review.update({
      where: { id },
      data: {
        reviewerName: dto.reviewerName,
        designation: dto.designation,
        rating: dto.rating,
        comment: dto.comment,
        displayOrder: dto.displayOrder,
      },
    });

    return {
      message: 'Review updated successfully',
      status: 'success',
      data: review,
    };
  }

  /**
   * Delete a review (soft delete)
   * Security: Admins only
   */
  async remove(
    id: string,
    requestingUserRole: Role,
  ): Promise<{
    message: string;
    status: string;
    data: null;
  }> {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can delete reviews');
    }

    const review = await this.prisma.review.findUnique({
      where: { id, book: { deletedAt: null } },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Soft delete
    await this.prisma.review.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Review deleted successfully',
      status: 'success',
      data: null,
    };
  }
}
```

---

## API Flow

### 1. Create Review
**Endpoint:** `POST /api/reviews`  
**Authentication:** Required (Admin only)  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "bookId": "uuid-of-book",
  "reviewerName": "John Doe",
  "designation": "Professor of Mathematics",
  "rating": 5,
  "comment": "An excellent textbook for advanced mathematics.",
  "displayOrder": 1
}
```

**Rules:**
- `bookId` and `reviewerName` are required
- `rating` is required and must be between 1 and 5
- The referenced `bookId` must correspond to an existing, non-deleted book
- `status` is automatically set to `PUBLISHED` on creation
- Only users with `ADMIN` role can create reviews

**Success Response (201):**
```json
{
  "message": "Review created successfully",
  "status": "success",
  "data": {
    "id": "uuid",
    "bookId": "uuid-of-book",
    "reviewerName": "John Doe",
    "designation": "Professor of Mathematics",
    "rating": 5,
    "comment": "An excellent textbook for advanced mathematics.",
    "displayOrder": 1,
    "status": "PUBLISHED",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "deletedAt": null
  }
}
```

### 2. Get All Reviews for a Book
**Endpoint:** `GET /api/reviews?bookId={bookId}`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Requires `bookId` as a query parameter
- Admins see all reviews for the book, including soft-deleted ones
- Non-admins see only reviews where the associated book is not deleted and is `PUBLISHED`
- Results are ordered by `displayOrder` ascending (lower values appear first)

**Success Response (200):**
```json
{
  "message": "Reviews retrieved successfully",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "bookId": "uuid-of-book",
      "reviewerName": "John Doe",
      "designation": "Professor of Mathematics",
      "rating": 5,
      "comment": "An excellent textbook.",
      "displayOrder": 1,
      "status": "PUBLISHED"
    },
    {
      "id": "uuid",
      "bookId": "uuid-of-book",
      "reviewerName": "Jane Smith",
      "designation": "Senior Editor",
      "rating": 4,
      "comment": "Very good content.",
      "displayOrder": 2,
      "status": "PUBLISHED"
    }
  ]
}
```

### 3. Get Review by ID
**Endpoint:** `GET /api/reviews/{id}`  
**Authentication:** Optional (public endpoint)

**Rules:**
- Admins can view any review by ID
- Non-admins can only view reviews where the associated book is not deleted and is `PUBLISHED`
- Returns `404 Not Found` if the review does not exist or the associated book is not visible to the requester

### 4. Update Review
**Endpoint:** `PATCH /api/reviews/{id}`  
**Authentication:** Required (Admin only)  
**Content-Type:** `application/json`

**Request Body (all fields optional):**
```json
{
  "reviewerName": "John Doe Updated",
  "designation": "Associate Professor",
  "rating": 4,
  "comment": "Updated review comment.",
  "displayOrder": 0
}
```

**Rules:**
- Only admins can update reviews
- All fields are optional — only provided fields are updated
- `rating` must still be between 1 and 5 if provided
- Returns `404 Not Found` if the review does not exist

### 5. Delete Review
**Endpoint:** `DELETE /api/reviews/{id}`  
**Authentication:** Required (Admin only)

**Rules:**
- Only admins can delete reviews
- Performs soft delete — sets `deletedAt` to current timestamp
- Returns `404 Not Found` if the review does not exist or the associated book is soft-deleted
- The record remains in the database but is excluded from public queries

---

## Frontend Integration

### Fetching Reviews for a Book
```javascript
// Get all published reviews for a specific book
const bookId = 'uuid-of-book';
const response = await fetch(`/api/reviews?bookId=${bookId}`);
const { data: reviews } = await response.json();

// Calculate average rating
const averageRating = reviews.length > 0
  ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  : 0;

// Display star rating (example with 5 stars)
const fullStars = Math.floor(averageRating);
const hasHalfStar = averageRating % 1 >= 0.5;
```

### Displaying Reviews on a Book Page
```javascript
// Reviews are also included when fetching a single book
const { data: book } = await fetch(`/api/books/${bookId}`).then(r => r.json());

// Access reviews directly from the book object
const reviews = book.reviews;

// Sort by displayOrder (already sorted by backend, but can re-sort client-side if needed)
reviews.sort((a, b) => a.displayOrder - b.displayOrder);

// Render each review
reviews.forEach(review => {
  console.log(`${review.reviewerName} (${review.designation}): ${review.rating}/5`);
  console.log(review.comment);
});
```

### Creating a Review (Admin)
```javascript
const newReview = {
  bookId: 'uuid-of-book',
  reviewerName: 'John Doe',
  designation: 'Professor of Mathematics',
  rating: 5,
  comment: 'An excellent textbook for advanced mathematics.',
  displayOrder: 1,
};

const response = await fetch('/api/reviews', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify(newReview),
});

const result = await response.json();
```

### Updating a Review (Admin)
```javascript
const updatedReview = {
  rating: 4,
  comment: 'Updated review comment.',
};

const response = await fetch(`/api/reviews/${reviewId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify(updatedReview),
});
```

### Deleting a Review (Admin)
```javascript
await fetch(`/api/reviews/${reviewId}`, {
  method: 'DELETE',
  headers: {
    Authorization: `Bearer ${adminToken}`,
  },
});
```

---

## How to Create a Review for a Book

Creating a review involves two main steps: **identifying the target book** and **submitting the review data**.

### Step 1: Get the Book ID
Before creating a review, you need the `id` of the book you want to review. You can obtain this from:
- The book list API: `GET /api/books`
- The book detail API: `GET /api/books/{bookId}`
- Your frontend routing (if the book ID is in the URL)

```javascript
// Example: Get book ID from URL
const urlParams = new URLSearchParams(window.location.search);
const bookId = urlParams.get('bookId'); // e.g., ?bookId=uuid-here
```

### Step 2: Submit the Review
Use the `POST /api/reviews` endpoint with the book ID and review details.

**Complete Example:**
```javascript
async function submitReview(bookId, reviewData) {
  const payload = {
    bookId: bookId,
    reviewerName: reviewData.reviewerName,
    designation: reviewData.designation || '',
    rating: reviewData.rating,        // Must be 1-5
    comment: reviewData.comment || '',
    displayOrder: reviewData.displayOrder || 0,
  };

  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAdminToken()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create review');
  }

  return await response.json();
}

// Usage
submitReview('book-uuid-here', {
  reviewerName: 'Dr. Sarah Johnson',
  designation: 'Mathematics Professor',
  rating: 5,
  comment: 'This is the best textbook I have used in my 15 years of teaching.',
  displayOrder: 0,
}).then(result => {
  console.log('Review created:', result.data);
});
```

### Step 3: Verify the Review
After creation, verify the review appears correctly:

```javascript
// Fetch reviews for the book
const { data: reviews } = await fetch(`/api/reviews?bookId=${bookId}`)
  .then(r => r.json());

console.log('Total reviews:', reviews.length);
console.log('Latest review:', reviews[reviews.length - 1]);
```

### Important Notes for Review Creation
- **Admin Only**: In the current implementation, only administrators can create reviews. If you want to allow end-users to submit reviews, you would need to modify the service to accept `USER` role and potentially add a moderation workflow.
- **Book Must Exist**: The `bookId` must reference an existing, non-deleted book. The API returns `404 Not Found` if the book does not exist.
- **Rating Validation**: The `rating` field is strictly validated to be between 1 and 5. Values outside this range will fail validation.
- **Default Status**: All new reviews are created with `status: PUBLISHED`, meaning they are immediately visible to the public. If you need a moderation workflow, change the default to `DRAFT` and add an approval step.
- **Display Order**: Use `displayOrder` to control the sequence of reviews. Lower numbers appear first. Set important/featured reviews to `0` or `1`.

---

## Rules & Regulations

### General Rules

1. **Authentication & Authorization**
   - `GET` endpoints (list and detail) are **public** — no authentication required
   - `POST`, `PATCH`, `DELETE` endpoints require **Admin** role authentication
   - Non-admin users can only see reviews where the associated book is not soft-deleted and has `status: PUBLISHED`
   - Admins can see all reviews regardless of book status or review `deletedAt`

2. **Soft Delete Pattern**
   - Reviews use soft delete via the `deletedAt` field
   - Deleted reviews are **not** physically removed from the database
   - Soft-deleted reviews are excluded from public queries automatically
   - Admins can still see soft-deleted reviews in list views
   - A soft-deleted review cannot be deleted again — returns `404 Not Found`

3. **Rating Validation**
   - `rating` must be an integer between 1 and 5 (inclusive)
   - Validation is enforced at the DTO level using `@Min(1)` and `@Max(5)`
   - The service layer does not re-validate — trust the DTO validation pipe
   - Decimal ratings (e.g., 4.5) are **not** allowed — only whole numbers

4. **Book Existence Check**
   - Before creating a review, the service verifies the referenced book exists and is not soft-deleted
   - Returns `404 Not Found` if the book does not exist or is soft-deleted
   - This prevents orphaned reviews that reference non-existent books

5. **Display Order**
   - `displayOrder` is an optional integer that controls review sorting
   - Default value is `0` if not provided
   - Reviews are ordered by `displayOrder` ascending (lower values appear first)
   - Use this to feature important reviews at the top of the list

6. **Status Management**
   - `status` uses the `BookStatus` enum: `DRAFT`, `PUBLISHED`, `ARCHIVED`
   - Default status on creation is `PUBLISHED`
   - The current implementation does **not** allow changing status via the update endpoint — `status` is not included in `UpdateReviewDto`
   - If status management is needed, add `status` to `UpdateReviewDto` and update the service

7. **Relation Integrity**
   - Reviews are always scoped to a specific book via `bookId`
   - When a book is soft-deleted, its reviews become invisible to public users
   - When a book is hard-deleted (if ever implemented), associated reviews should also be cleaned up
   - The current soft-delete approach prevents accidental data loss

8. **Input Validation**
   - All DTOs use `class-validator` decorators
   - `bookId` and `reviewerName` are required on creation
   - `rating` is required and range-validated (1-5)
   - All other fields are optional
   - The global `ValidationPipe` handles DTO validation automatically

9. **Response Format**
   - All endpoints return a consistent response structure:
     ```json
     {
       "message": "Operation description",
       "status": "success",
       "data": { ... }
     }
     ```
   - For delete operations, `data` is always `null`

10. **Error Handling**
    - `400 Bad Request` — Invalid input data (handled by `ValidationPipe`)
    - `401 Unauthorized` — Missing or invalid JWT token (handled by `JwtAuthGuard`)
    - `403 Forbidden` — User lacks required role (handled by `RolesGuard` and service checks)
    - `404 Not Found` — Book or review does not exist, or is not visible to the requester

11. **What NOT to Do**
    - **Do NOT** use `PrismaService` directly in controllers — always go through the service layer
    - **Do NOT** expose raw Prisma errors to the client — use NestJS exception types
    - **Do NOT** perform hard deletes — always use soft delete (`deletedAt`)
    - **Do NOT** allow non-admin users to create, update, or delete reviews (unless the business logic is intentionally changed)
    - **Do NOT** skip the book existence check when creating a review
    - **Do NOT** accept ratings outside the 1-5 range
    - **Do NOT** forget to export the service from the module if other modules need to inject it
    - **Do NOT** include `status` in `UpdateReviewDto` unless you intend to support status changes

12. **Testing Considerations**
    - Test rating validation by attempting to create reviews with ratings of 0, 6, and 4.5
    - Test book existence by attempting to create a review with a non-existent `bookId`
    - Test authorization by attempting admin endpoints with a non-admin token
    - Test soft delete by verifying the review is excluded from public queries but visible to admin queries
    - Test display order by creating multiple reviews and verifying the sort order
    - Test that reviews for soft-deleted books are not visible to public users
