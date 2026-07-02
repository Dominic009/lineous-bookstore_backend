# 📚 Book Parts/Variants Implementation Plan

## 📋 Overview
Complete migration from single-`Book` pricing to parent-child model where `Book` contains shared info and `BookPaper` contains variant-specific pricing, inventory, and attributes.

---

## 🔴 CRITICAL: Migration Order

**DO THIS IN EXACT ORDER OR BREAK PRODUCTION:**

1. **Schema changes** → Run migration
2. **Update DTOs** (remove price fields from Book)
3. **Update BookService** (remove pricing logic, add price ranges)
4. **Rename book-part → book-paper** (folders and files)
5. **Update CartService** (add paper handling)
6. **Update OrderService** (use paper pricing)
7. **Run migration script** (convert existing books to papers)
8. **Update admin panel** (create book + papers in one flow)
9. **Update frontend** (show papers on detail page)
10. **Test all endpoints** before deployment

---

## 1️⃣ PRISMA SCHEMA CHANGES (`prisma/schema.prisma`)

### BookPaper Model (ADD/REPLACE BookPart)
Replace the existing `BookPart` model with this enhanced `BookPaper` model:

```prisma
model BookPaper {
  id              String    @id @default(uuid())
  bookId          String
  
  code            String?   // "A", "MCQ", "ENG" - Short code for the paper
  name            String    // "Paper A", "MCQ Paper", "English Version" - Full display name
  
  price           Decimal   @db.Decimal(10, 2)     // REQUIRED: Base price
  discountPrice   Decimal?  @db.Decimal(10, 2)     // Optional: Discounted price
  discountStartDate DateTime?                         // Optional: Discount start date
  discountEndDate   DateTime?                         // Optional: Discount end date
  
  stock           Int       @default(0)             // REQUIRED: Stock quantity (0 = out of stock)
  
  isbn            String?   @unique                 // Optional: Unique ISBN per paper
  pageCount       Int?      // Optional: Number of pages
  
  thumbnail       String?   // Optional: Paper-specific thumbnail (overrides Book thumbnail)
  
  sortOrder       Int       @default(0)             // For ordering papers in UI
  isDefault       Boolean   @default(false)         // Only ONE paper can be default per book
  
  status          BookStatus @default(PUBLISHED)    // Paper-level status control
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  // Relations
  book            Book      @relation(fields: [bookId], references: [id])
  cartItems       CartItem[]
  orderItems      OrderItem[]

  @@index([bookId])
  @@index([isbn])
}
```

### Book Model Changes (MODIFY)

**REMOVE these fields:**
- `isbn String? @unique` - Moved to BookPaper
- `price Decimal @db.Decimal(10, 2)` - Moved to BookPaper
- `discountPrice Decimal? @db.Decimal(10, 2)` - Moved to BookPaper
- `stock Boolean @default(false)` - Replaced by stock on BookPaper
- `stockAmount Int?` - Replaced by stock on BookPaper
- `parts BookPart[]` - Replace with `papers BookPaper[]`

**KEEP these fields on Book:**
- `edition String?` - Same for all papers typically
- `language String?` - Same for all papers
- `publicationDate DateTime?` - Same for all papers
- `thumbnail String?` - Default thumbnail (fallback if paper has no thumbnail)
- `title, slug, shortDescription, description, status, publicationId, subjectId` - Core fields

**ADD this relation to Book:**
```prisma
papers BookPaper[]
```

### CartItem Model Changes (MODIFY)
```prisma
model CartItem {
  id       String @id @default(uuid())
  cartId   String
  bookId   String
  paperId  String?  // ADD: Selected paper (optional for backward compatibility)
  quantity Int    @default(1)

  cart Cart @relation(fields: [cartId], references: [id])
  book Book @relation(fields: [bookId], references: [id])
  paper BookPaper? @relation(fields: [paperId], references: [id])  // ADD

  @@index([cartId])
  @@index([bookId])
  @@index([paperId])
}
```

### OrderItem Model Changes (MODIFY)
```prisma
model OrderItem {
  id          String  @id @default(uuid())
  orderId     String
  
  // Book reference (for easy querying/reporting)
  bookId      String
  
  // Paper reference (the exact variant purchased)
  paperId     String
  
  // Snapshots (for historical accuracy after product changes)
  bookTitle   String
  paperName   String?  // "Paper A", "Paper B" - Snapshot at purchase time
  paperPrice  Decimal  @db.Decimal(10, 2)  // Effective price at purchase time

  quantity    Int
  subtotal    Decimal  @db.Decimal(10, 2)

  order       Order    @relation(fields: [orderId], references: [id])
  book        Book     @relation(fields: [bookId], references: [id])
  paper       BookPaper @relation(fields: [paperId], references: [id])

  @@index([orderId])
  @@index([bookId])
  @@index([paperId])
}
```

### ⚡ Run Migration
```bash
npx prisma migrate dev --name add-book-papers-variants
npx prisma generate
```

---

## 2️⃣ DTO CHANGES

### `src/book/dto/create-book.dto.ts`

**REMOVE these fields entirely:**
```typescript
// Remove lines 36-43 (isbn field)
@IsOptional()
@IsString()
isbn?: string;

// Remove lines 40-51 (price field)
@IsNumber()
@IsNotEmpty()
@IsNonNegative({ message: 'Price must be a non-negative number' })
price!: number;

// Remove lines 45-51 (discountPrice field)
@IsOptional()
@IsNumber()
@IsNonNegative({ message: 'Discount price must be a non-negative number' })
@IsDiscountLessThanPrice('price', {
  message: 'Discount price must be less than or equal to original price',
})
discountPrice?: number;

// Remove lines 65-72 (stock fields)
@IsOptional()
@IsBoolean()
stock?: boolean;

@IsOptional()
@IsNumber()
@IsNonNegative({ message: 'Stock amount must be a non-negative number' })
stockAmount?: number;
```

**KEEP these fields:**
- All existing fields EXCEPT the ones removed above
- `thumbnail` - This stays on Book as fallback

### `src/book/dto/update-book.dto.ts`

**REMOVE the same fields:**
```typescript
@IsOptional()
@IsString()
isbn?: string;

@IsOptional()
@IsNumber()
@IsNonNegative({ message: 'Price must be a non-negative number' })
price?: number;

@IsOptional()
@IsNumber()
@IsNonNegative({ message: 'Discount price must be a non-negative number' })
discountPrice?: number;

@IsOptional()
@IsBoolean()
stock?: boolean;

@IsOptional()
@IsNumber()
@IsNonNegative({ message: 'Stock amount must be a non-negative number' })
stockAmount?: number;
```

### `src/book-part/dto/create-book-paper.dto.ts` (RENAME from create-book-part.dto.ts)

```typescript
import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  IsDateString, 
  IsEnum 
} from 'class-validator';
import { BookStatus } from '@prisma/client';
import { IsNonNegative, IsDiscountLessThanPrice } from '../../common/validators/book.validators';

export class CreateBookPaperDto {
  @IsString()
  @IsNotEmpty()
  bookId!: string;

  @IsOptional()
  @IsString()
  code?: string;  // Short code like "A", "MCQ"

  @IsString()
  @IsNotEmpty()
  name!: string;  // Display name like "Paper A"

  @IsNumber()
  @IsNotEmpty()
  @IsNonNegative({ message: 'Price must be non-negative' })
  price!: number;

  @IsOptional()
  @IsNumber()
  @IsNonNegative({ message: 'Discount price must be non-negative' })
  @IsDiscountLessThanPrice('price', { message: 'Discount must be ≤ price' })
  discountPrice?: number;

  @IsOptional()
  @IsDateString()
  discountStartDate?: string;

  @IsOptional()
  @IsDateString()
  discountEndDate?: string;

  @IsOptional()
  @IsNumber()
  @IsNonNegative({ message: 'Stock must be non-negative' })
  stock?: number;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsNumber()
  @IsNonNegative()
  pageCount?: number;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus = BookStatus.PUBLISHED;
}
```

### `src/book-part/dto/update-book-paper.dto.ts` (RENAME from update-book-part.dto.ts)

```typescript
import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  IsDateString, 
  IsEnum 
} from 'class-validator';
import { BookStatus } from '@prisma/client';
import { IsNonNegative, IsDiscountLessThanPrice } from '../../common/validators/book.validators';

export class UpdateBookPaperDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @IsNonNegative({ message: 'Price must be non-negative' })
  price?: number;

  @IsOptional()
  @IsNumber()
  @IsNonNegative({ message: 'Discount price must be non-negative' })
  @IsDiscountLessThanPrice('price', { message: 'Discount must be ≤ price' })
  discountPrice?: number;

  @IsOptional()
  @IsDateString()
  discountStartDate?: string;

  @IsOptional()
  @IsDateString()
  discountEndDate?: string;

  @IsOptional()
  @IsNumber()
  @IsNonNegative()
  stock?: number;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsNumber()
  pageCount?: number;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus;
}
```

### `src/cart/dto/add-to-cart.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  bookId!: string;

  @IsOptional()
  @IsString()
  paperId?: string;  // ADD: Optional paper selection

  @IsNumber()
  @Min(1)
  quantity!: number;
}
```

---

## 3️⃣ SERVICE IMPLEMENTATION

### `src/book/book.service.ts`

#### 3.1 Remove pricing from `create` method (lines 94-120)
```typescript
// BEFORE - REMOVE these lines:
isbn: dto.isbn,
price: dto.price,
discountPrice: dto.discountPrice,
stock: dto.stock ?? false,
stockAmount: dto.stockAmount,

// AFTER - These lines should NOT exist in the create method
// Book creation only handles shared attributes now
```

#### 3.2 Remove pricing from `update` method (lines 321-348)
```typescript
// REMOVE these update conditions:
if (dto.isbn !== undefined) updateData.isbn = dto.isbn;
if (dto.price !== undefined) updateData.price = dto.price;
if (dto.discountPrice !== undefined) updateData.discountPrice = dto.discountPrice;
if (dto.stock !== undefined) updateData.stock = dto.stock;
if (dto.stockAmount !== undefined) updateData.stockAmount = dto.stockAmount;
```

#### 3.3 Update `findOne` to include papers (lines 213-222)
```typescript
const book = await this.prisma.book.findUnique({
  where,
  include: {
    publication: true,
    subject: true,
    papers: {  // Changed from parts
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' }
    },
    attachments: true,
    reviews: true,
  },
});
```

#### 3.4 Add price range calculation (NEW HELPER METHOD)
```typescript
private calculatePriceRange(papers: any[]): { min: number; max: number; display: string } | null {
  if (!papers || papers.length === 0) return null;
  
  const now = new Date();
  const effectivePrices = papers
    .map(paper => {
      const basePrice = Number(paper.price);
      if (paper.discountPrice && 
          paper.discountStartDate && 
          paper.discountEndDate && 
          now >= paper.discountStartDate && 
          now <= paper.discountEndDate) {
        return Number(paper.discountPrice);
      }
      return basePrice;
    });

  if (effectivePrices.length === 0) return null;

  const min = Math.min(...effectivePrices);
  const max = Math.max(...effectivePrices);

  return {
    min,
    max,
    display: min === max 
      ? `৳${min}` 
      : `From ৳${min}`
  };
}
```

#### 3.5 Update `findAll` to return price ranges
```typescript
// After fetching books, map them with price ranges:
return {
  message: books.length > 0 ? 'Books retrieved successfully' : 'No books found',
  status: 'success',
  data: books.map(book => ({
    ...book,
    priceRange: this.calculatePriceRange(book.papers)
  }))
};
```

### `src/book-part/book-paper.service.ts` (RENAME from book-part.service.ts)

```typescript
import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookPaperDto } from './dto/create-book-paper.dto';
import { UpdateBookPaperDto } from './dto/update-book-paper.dto';
import { BookPaper, Role, BookStatus } from '@prisma/client';

@Injectable()
export class BookPaperService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBookPaperDto, requestingUserRole: Role) {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can create book papers');
    }

    // Validate book exists
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId, deletedAt: null }
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Validate ISBN uniqueness if provided
    if (dto.isbn) {
      const existing = await this.prisma.bookPaper.findUnique({
        where: { isbn: dto.isbn }
      });
      if (existing) {
        throw new ConflictException('Paper with this ISBN already exists');
      }
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.bookPaper.updateMany({
        where: { bookId: dto.bookId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const paper = await this.prisma.bookPaper.create({
      data: {
        bookId: dto.bookId,
        code: dto.code,
        name: dto.name,
        price: dto.price,
        discountPrice: dto.discountPrice,
        discountStartDate: dto.discountStartDate ? new Date(dto.discountStartDate) : undefined,
        discountEndDate: dto.discountEndDate ? new Date(dto.discountEndDate) : undefined,
        stock: dto.stock ?? 0,
        isbn: dto.isbn,
        pageCount: dto.pageCount,
        thumbnail: dto.thumbnail,
        sortOrder: dto.sortOrder ?? 0,
        isDefault: dto.isDefault ?? false,
        status: dto.status || BookStatus.PUBLISHED,
      },
      include: { book: true }
    });

    return {
      message: 'Book paper created successfully',
      status: 'success',
      data: paper
    };
  }

  async findAll(bookId: string, requestingUserRole?: Role) {
    const where: any = { bookId };
    if (requestingUserRole !== Role.ADMIN) {
      where.deletedAt = null;
      where.status = BookStatus.PUBLISHED;
    }

    const papers = await this.prisma.bookPaper.findMany({
      where,
      orderBy: { sortOrder: 'asc' }
    });

    return {
      message: papers.length > 0
        ? 'Book papers retrieved successfully'
        : 'No papers found',
      status: 'success',
      data: papers.map(paper => this.calculateEffectivePrice(paper))
    };
  }

  async findOne(id: string, requestingUserRole?: Role) {
    const paper = requestingUserRole === Role.ADMIN
      ? await this.prisma.bookPaper.findUnique({ where: { id } })
      : await this.prisma.bookPaper.findFirst({
          where: { id, book: { deletedAt: null, status: BookStatus.PUBLISHED } }
        });

    if (!paper) {
      throw new NotFoundException('Book paper not found');
    }

    return {
      message: 'Book paper retrieved successfully',
      status: 'success',
      data: this.calculateEffectivePrice(paper)
    };
  }

  async update(id: string, dto: UpdateBookPaperDto, requestingUserRole: Role) {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can update book papers');
    }

    const existing = await this.prisma.bookPaper.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Book paper not found');
    }

    if (dto.isbn && dto.isbn !== existing.isbn) {
      const exists = await this.prisma.bookPaper.findUnique({ where: { isbn: dto.isbn } });
      if (exists) {
        throw new ConflictException('ISBN already in use');
      }
    }

    if (dto.isDefault) {
      await this.prisma.bookPaper.updateMany({
        where: { bookId: existing.bookId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const paper = await this.prisma.bookPaper.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        price: dto.price,
        discountPrice: dto.discountPrice,
        discountStartDate: dto.discountStartDate ? new Date(dto.discountStartDate) : undefined,
        discountEndDate: dto.discountEndDate ? new Date(dto.discountEndDate) : undefined,
        stock: dto.stock,
        isbn: dto.isbn,
        pageCount: dto.pageCount,
        thumbnail: dto.thumbnail,
        sortOrder: dto.sortOrder,
        isDefault: dto.isDefault,
        status: dto.status,
      }
    });

    return {
      message: 'Book paper updated successfully',
      status: 'success',
      data: paper
    };
  }

  async remove(id: string, requestingUserRole: Role) {
    if (requestingUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can delete book papers');
    }

    const paper = await this.prisma.bookPaper.findUnique({
      where: { id, book: { deletedAt: null } }
    });

    if (!paper) {
      throw new NotFoundException('Book paper not found');
    }

    await this.prisma.bookPaper.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return {
      message: 'Book paper deleted successfully',
      status: 'success',
      data: null
    };
  }

  private calculateEffectivePrice(paper: any) {
    const now = new Date();
    let effectivePrice = Number(paper.price);
    
    if (paper.discountPrice && 
        paper.discountStartDate && 
        paper.discountEndDate && 
        now >= paper.discountStartDate && 
        now <= paper.discountEndDate) {
      effectivePrice = Number(paper.discountPrice);
    }

    return {
      ...paper,
      effectivePrice,
      isInStock: paper.stock > 0
    };
  }
}
```

### `src/cart/cart.service.ts`

#### Update `addToCart` method:
```typescript
async addToCart(dto: AddToCartDto, userId: string) {
  // Validate book exists and is published
  const book = await this.prisma.book.findUnique({
    where: { 
      id: dto.bookId, 
      deletedAt: null, 
      status: BookStatus.PUBLISHED 
    }
  });

  if (!book) {
    throw new NotFoundException('Book not found or not available');
  }

  // Validate paper if provided
  let paper: BookPaper | null = null;
  if (dto.paperId) {
    paper = await this.prisma.bookPaper.findUnique({
      where: { 
        id: dto.paperId, 
        bookId: dto.bookId,  // Ensure paper belongs to this book
        deletedAt: null, 
        status: BookStatus.PUBLISHED 
      }
    });

    if (!paper) {
      throw new NotFoundException('Paper not found or not available');
    }

    if (paper.stock < dto.quantity) {
      throw new ConflictException('Not enough stock available');
    }
  }

  // Rest of cart logic...
  const cart = await this.getOrCreateCart(userId);
  
  const existingItem = await this.prisma.cartItem.findFirst({
    where: { 
      cartId: cart.id, 
      bookId: dto.bookId,
      ...(dto.paperId && { paperId: dto.paperId }) // Match paper if specified
    }
  });

  // ... update/create cart item with paperId
}

private async getOrCreateCart(userId: string) {
  let cart = await this.prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await this.prisma.cart.create({ data: { userId } });
  }
  return cart;
}
```

#### Update `getCart` method:
```typescript
let cart = await this.prisma.cart.findUnique({
  where: { userId },
  include: {
    cartItems: {
      include: {
        book: true,
        paper: true  // ADD: Include paper data
      }
    },
  },
});
```

### `src/order/order.service.ts`

#### Update `create` method for paper pricing:
```typescript
async create(dto: CreateOrderDto, userId: string) {
  const cart = await this.prisma.cart.findUnique({
    where: { userId },
    include: {
      cartItems: {
        include: {
          book: true,
          paper: true  // ADD: Include paper data
        }
      }
    }
  });

  if (!cart || cart.cartItems.length === 0) {
    throw new NotFoundException('Cart is empty');
  }

  // Calculate totals using paper prices
  let subtotal = 0;
  const orderItemsData = [];

  for (const item of cart.cartItems) {
    // Get effective price from paper or book
    let unitPrice: number;
    
    if (item.paper) {
      const now = new Date();
      const paper = item.paper;
      
      if (paper.discountPrice && 
          paper.discountStartDate && 
          paper.discountEndDate && 
          now >= paper.discountStartDate && 
          now <= paper.discountEndDate) {
        unitPrice = Number(paper.discountPrice);
      } else {
        unitPrice = Number(paper.price);
      }
    } else {
      // Fallback to book price (for backward compatibility)
      unitPrice = item.book.discountPrice 
        ? Number(item.book.discountPrice) 
        : Number(item.book.price);
    }

    const itemSubtotal = unitPrice * item.quantity;
    subtotal += itemSubtotal;

    orderItemsData.push({
      bookId: item.bookId,
      paperId: item.paperId,
      bookTitle: item.book.title,
      paperName: item.paper?.name,
      paperPrice: unitPrice,
      quantity: item.quantity,
      subtotal: itemSubtotal
    });
  }

  // ... create order with orderItemsData
}
```

---

## 4️⃣ API ENDPOINTS

### 4.1 Book Endpoints (UNCHANGED URLs)
```
GET    /api/books           - Returns books with priceRange
GET    /api/books/:id       - Returns book with papers array
POST   /api/books           - Creates book (shared attributes only)
PATCH  /api/books/:id       - Updates book (shared attributes only)
DELETE /api/books/:id       - Soft delete book
```

### 4.2 Book Paper Endpoints (NEW)
```
GET    /api/book-papers/book/:bookId  - Get all papers for a book
GET    /api/book-papers/:id           - Get specific paper
POST   /api/book-papers               - Create paper (parent required)
PATCH  /api/book-papers/:id           - Update paper
DELETE /api/book-papers/:id           - Soft delete paper
```

### 4.3 Cart Endpoints (MODIFIED)
```
POST /api/cart - Add to cart (now accepts optional paperId)
Body: { bookId: string, paperId?: string, quantity: number }
```

---

## 5️⃣ ADMIN PANEL CHANGES

### 5.1 Book Creation Form (UPDATED)
```
Tab 1: Book Details
├── Title
├── Slug
├── Description
├── Publication
├── Subject
├── Category
├── Teacher
├── Thumbnail (default)
└── Status

Tab 2: Papers (REPEATER)
├── Add Paper A
│   ├── Code: [A]
│   ├── Name: [Paper A]
│   ├── Price: [250]
│   ├── Discount Price: [200]
│   ├── Stock: [50]
│   ├── ISBN: [unique]
│   ├── Page Count: [120]
│   ├── Thumbnail: [optional override]
│   └── Is Default: [checkbox]
├── Add Paper B
│   └── ... (same structure)
└── Save All (one transaction)
```

### 5.2 Book List Page (UPDATED)
- Show `priceRange.display` instead of `price`
- Example: "From ৳250" or "৳250" (if single price)
- Add column "Papers Count" showing number of published papers

### 5.3 Book Edit Page (UPDATED)
- Two tabs: "Book Details" and "Manage Papers"
- Paper management inline with add/edit/delete capabilities

---

## 6️⃣ FRONTEND INTEGRATION

### 6.1 Book List/Collection Page
```typescript
// Display price range
{
  book.priceRange?.display || 'Price on selection'
}

// No paper selection needed
// Click "View Details" goes to single URL
```

### 6.2 Book Detail Page (CRITICAL FLOW)
```typescript
// Step 1: Fetch book with papers
const { data: book } = await fetch(`/api/books/${bookId}`);

// Step 2: Display papers selector
<PaperSelector papers={book.papers} />

// Step 3: User selects paper
const selectedPaper = papers.find(p => p.id === selectedPaperId);

// Step 4: Show effective price
<div className="price">
  {selectedPaper.effectivePrice}
  {selectedPaper.discountPrice && ' (Discounted)'}
</div>

// Step 5: Add to cart
await fetch('/api/cart', {
  method: 'POST',
  body: JSON.stringify({
    bookId: book.id,
    paperId: selectedPaper.id,
    quantity: 1
  })
});
```

### 6.3 Paper Selector Component (REQUIRED)
```tsx
function PaperSelector({ papers }) {
  const [selected, setSelected] = useState(papers.find(p => p.isDefault) || papers[0]);
  
  return (
    <div className="paper-selector">
      {papers.map(paper => (
        <button
          key={paper.id}
          onClick={() => setSelected(paper)}
          className={selected?.id === paper.id ? 'selected' : ''}
        >
          <span>{paper.name || `Paper ${paper.code}`}</span>
          <span>৳{paper.effectivePrice}</span>
          <span>{paper.isInStock ? 'In Stock' : 'Out of Stock'}</span>
        </button>
      ))}
    </div>
  );
}
```

---

## 7️⃣ MIGRATION SCRIPT

### 7.1 Convert Existing Books to Papers
Create `prisma/seed-papers.ts`:

```typescript
import { PrismaClient, BookStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingBooks() {
  console.log('Starting migration...');
  
  // Get all books
  const books = await prisma.book.findMany({
    include: { parts: true }  // Check if they already have parts
  });

  for (const book of books) {
    // Skip if already has parts
    if (book.parts.length > 0) continue;

    // Create default paper from existing book data
    await prisma.bookPaper.create({
      data: {
        bookId: book.id,
        code: 'A',
        name: 'Standard Edition',
        price: book.price || 0,
        discountPrice: book.discountPrice || undefined,
        stock: book.stock && book.stockAmount ? book.stockAmount : 0,
        isbn: book.isbn,
        pageCount: undefined,  // Will need manual update if needed
        sortOrder: 0,
        isDefault: true,
        status: book.status,
      }
    });
    
    console.log(`Migrated book ${book.title} to paper`);
  }

  console.log('Migration complete!');
  await prisma.$disconnect();
}

migrateExistingBooks().catch(console.error);
```

Run: `npx ts-node prisma/seed-papers.ts`

---

## 8️⃣ BUSINESS LOGIC RULES

### 8.1 Price Resolution Logic
```
Priority 1: Paper discount price (if within date range)
Priority 2: Paper base price
Priority 3: (Fallback - not recommended) Book price
```

### 8.2 Stock Logic
```
Paper stock > 0 → In Stock
Paper stock = 0 → Out of Stock
No paper selected → Use first/default paper stock
```

### 8.3 Default Paper Selection
```
On book creation: First paper becomes default
On book view: Default paper pre-selected in UI
On cart add (no paper): Use default paper
```

### 8.4 Validation Rules
```
- Only ONE paper can be isDefault per book (enforce in service)
- ISBN must be unique across ALL papers
- Paper stock cannot be negative
- Discount price must be ≤ base price
- Paper status must align with parent book (optional constraint)
```

---

## 9️⃣ DON'TS (CRITICAL)

1. ❌ **Don't delete the `parts` field without migration** - Data loss
2. ❌ **Don't make paperId required in CartItem** - Breaks existing carts
3. ❌ **Don't remove thumbnail from Book** - Needed for fallbacks
4. ❌ **Don't allow negative stock values** - Causes incorrect availability
5. ❌ **Don't forget to unset other defaults when setting new default** - Data inconsistency
6. ❌ **Don't use paper price without validation** - Wrong book association
7. ❌ **Don't show draft papers on frontend** - Unless admin user
8. ❌ **Don't rely on paper-only queries for reporting** - Always join through book

---

## 🔟 TESTING CHECKLIST

- [ ] Create book with multiple papers
- [ ] Verify price range calculation on book list
- [ ] Verify paper selection on detail page
- [ ] Verify cart addition with paper
- [ ] Verify cart update with paper changes
- [ ] Verify order creation with paper snapshots
- [ ] Verify default paper enforcement
- [ ] Verify ISBN uniqueness
- [ ] Verify stock validation
- [ ] Verify discount date logic
- [ ] Verify admin paper management
- [ ] Verify soft delete cascades correctly

---

## 11️⃣ API RESPONSE EXAMPLES

### Book List Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "SSC Physics",
      "thumbnail": "url",
      "priceRange": {
        "min": 250,
        "max": 350,
        "display": "From ৳250"
      }
    }
  ]
}
```

### Book Detail Response:
```json
{
  "data": {
    "id": "book-uuid",
    "title": "SSC Physics",
    "thumbnail": "default-url",
    "papers": [
      {
        "id": "paper-a-uuid",
        "code": "A",
        "name": "Paper A",
        "price": 250,
        "discountPrice": 200,
        "effectivePrice": 200,
        "stock": 50,
        "isInStock": true,
        "isDefault": true
      },
      {
        "id": "paper-b-uuid",
        "code": "B",
        "name": "Paper B",
        "price": 350,
        "discountPrice": null,
        "effectivePrice": 350,
        "stock": 0,
        "isInStock": false,
        "isDefault": false
      }
    ]
  }
}
```

---

## 12️⃣ ROLLOUT STRATEGY

### Phase 1: Backend Changes
1. Schema migration (requires downtime)
2. Deploy updated services
3. Run migration script
4. Verify with admin API calls

### Phase 2: Admin Panel
1. Update book creation UI
2. Update book edit UI
3. Test paper management

### Phase 3: Frontend
1. Update product cards to show price ranges
2. Update product detail to show paper selector
3. Update cart/checkout to handle papers
4. Deploy and monitor