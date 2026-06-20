# UI Implementation Prompt for Bookstore CMS Admin Panel

This document provides detailed UI specifications for the main admin pages. The design should be clean, modern, and unique with a focus on usability.

## Technology Stack Recommendation
- **Framework**: Next.js with TypeScript
- **UI Library**: Tailwind CSS + Headless UI or Shadcn/ui
- **State Management**: React Query or SWR for API calls
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React or Heroicons

---

## Authentication Pages

### Login Page
**Route:** `/admin/login`

**Layout:**
- Centered card with logo at top
- Clean, minimal design with subtle shadows
- Dark mode support

**Form Fields:**
- Email input (with validation)
- Password input (with show/hide toggle)
- "Remember me" checkbox
- Submit button with loading state

**Actions:**
- Login with credentials
- Redirect to dashboard on success

### Signup Page
**Route:** `/admin/signup`

**Layout:**
- Similar to login but with more fields
- Two-column layout for larger screens

**Form Fields:**
- Email (required, valid format)
- Password (min 8 chars, uppercase, lowercase, number)
- Confirm Password
- First Name (optional)
- Last Name (optional)
- Phone (optional)

---

## Dashboard Page
**Route:** `/admin/dashboard`

**Layout:**
- Sidebar navigation (collapsible)
- Top navbar with user profile
- Main content area with stats cards

**Components:**
- Stats overview (Total Books, Users, Orders, Revenue)
- Recent orders table
- Quick action buttons
- Activity timeline

---

## Books Management

### Books List Page
**Route:** `/admin/books`

**Layout:**
- Page header with "Add New Book" button
- Search bar with filters
- Data table with pagination

**Table Columns:**
- Thumbnail (image preview)
- Title
- ISBN
- Price
- Stock
- Status (badge: Draft/Published/Archived)
- Created Date
- Actions (Edit, Delete, View)

**Filters:**
- Status filter (All/Draft/Published/Archived)
- Category filter
- Subject filter
- Search by title, ISBN

**Bulk Actions:**
- Delete selected
- Change status

### Book Create/Edit Page
**Route:** `/admin/books/new` and `/admin/books/[id]/edit`

**Layout:**
- Two-column layout
- Left: Main form
- Right: Preview panel

**Main Form Sections:**

#### 1. Basic Information
- Title (text input, required)
- Slug (text input, auto-generated from title)
- ISBN (text input)
- Edition (text input)
- Language (select dropdown)
- Publication Date (date picker)

#### 2. Pricing
- Price (number input, required)
- Discount Price (number input, optional)
- Stock Quantity (number input)

#### 3. Description
- Short Description (textarea)
- Full Description (rich text editor)

#### 4. Media
- Thumbnail Upload (image preview with remove option)
- Multiple Image Upload (gallery)

#### 5. Relations
- Publication (select with search)
- Subject (select with search)
- Categories (multi-select with checkboxes)

**Action Buttons:**
- Save Draft
- Publish
- Save and Continue Editing

### Book Details Page
**Route:** `/admin/books/[id]`

**Layout:**
- Tabbed interface:
  1. **Overview** - Basic book info
  2. **Parts** - Book parts management
  3. **Attachments** - Files management
  4. **Reviews** - Customer reviews
  5. **Orders** - Related orders

#### Parts Tab
- Table of book parts
- "Add Part" button
- Each part: Title, Part Number, Price, Actions

**Add Part Modal:**
- Title
- Part Number
- Description
- Price
- Save/Cancel buttons

#### Attachments Tab
- File type tabs: Images, PDFs, Banners
- Grid view for images
- List view for PDFs
- Upload button for each type

**Upload Attachment:**
- File picker
- Type selection
- Sort order
- Preview before upload

---

## Users Management

### Users List Page
**Route:** `/admin/users`

**Layout:**
- Similar to books list
- Advanced filters

**Table Columns:**
- Avatar/Initials
- Name (First + Last)
- Email
- Phone
- Role (badge: Admin/User)
- Status (badge: Active/Inactive/Suspended)
- Created Date
- Actions (Edit, Delete, Impersonate)

**Filters:**
- Role filter
- Status filter
- Search by name, email

### User Create/Edit Page
**Route:** `/admin/users/new` and `/admin/users/[id]/edit`

**Layout:**
- Single column form
- Profile card at top

**Form Sections:**

#### 1. Account Information
- Email (required)
- Password (optional on edit)
- Role (select: Admin/User)
- Status (select: Active/Inactive/Suspended)

#### 2. Personal Information
- First Name
- Last Name
- Phone
- Avatar URL

**Action Buttons:**
- Save
- Cancel
- Reset Password (on edit)

### User Details Page
**Route:** `/admin/users/[id]`

**Layout:**
- Tabbed interface:
  1. **Profile** - User details
  2. **Addresses** - User addresses
  3. **Orders** - User's orders
  4. **Wishlist** - User's wishlist

---

## Publications Management

### Publications List Page
**Route:** `/admin/publications`

**Table Columns:**
- Logo (image)
- Name
- Description preview
- Status
- Created Date
- Actions

### Publication Create/Edit Page
**Route:** `/admin/publications/new` and `/admin/publications/[id]/edit`

**Form Fields:**
- Name (required)
- Slug (auto-generated)
- Description (textarea)
- Logo Upload
- Status

---

## Categories Management

### Categories List Page
**Route:** `/admin/categories`

**Layout:**
- Tree view for hierarchical categories
- "Add Root Category" button

**Table/Tree Columns:**
- Name
- Slug
- Parent Category
- Created Date
- Actions

### Category Create/Edit Page
**Route:** `/admin/categories/new` and `/admin/categories/[id]/edit`

**Form Fields:**
- Name (required)
- Slug (auto-generated)
- Parent Category (select, optional)

---

## Orders Management

### Orders List Page
**Route:** `/admin/orders`

**Table Columns:**
- Order Number
- Customer Name
- Total Amount
- Status (badge with color)
- Payment Status
- Created Date
- Actions

**Status Colors:**
- PENDING: Yellow
- CONFIRMED: Blue
- PROCESSING: Indigo
- SHIPPED: Purple
- DELIVERED: Green
- CANCELLED: Red
- RETURNED: Orange

### Order Details Page
**Route:** `/admin/orders/[id]`

**Layout:**
- Two-column:
  - Left: Order items, customer info
  - Right: Order status, payment info

**Sections:**
- Order Items Table (Book, Price, Quantity, Subtotal)
- Customer Information
- Shipping Address
- Order Notes
- Status Update Form

---

## UI Design Guidelines

### Color Scheme
- Primary: Deep blue (#3B82F6)
- Secondary: Emerald green (#10B981)
- Accent: Amber (#F59E0B)
- Error: Red (#EF4444)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)

### Components Style
- Rounded corners (8px radius)
- Subtle shadows
- Smooth transitions
- Consistent spacing (4px grid)

### Responsive Design
- Mobile-first approach
- Sidebar collapses to hamburger menu
- Tables become cards on mobile
- Forms stack vertically on small screens

### Loading States
- Skeleton loaders for tables
- Spinner for buttons
- Progress bar for uploads

### Error Handling
- Toast notifications
- Inline form errors
- Error boundaries

---

## Navigation Structure

```
Dashboard
├── Books
│   ├── All Books
│   ├── Add New Book
│   └── Categories
├── Users
│   ├── All Users
│   └── Add New User
├── Orders
│   └── All Orders
├── Content
│   ├── Publications
│   ├── Subjects
│   ├── Teachers
│   ├── Banners
│   └── Reviews
├── Settings
│   └── General Settings
└── Audit Logs
```

---

## API Integration Notes

### Authentication
- Store JWT token in secure httpOnly cookie
- Include token in Authorization header for all requests
- Handle 401 errors with redirect to login

### File Uploads
- Use multipart/form-data
- Show upload progress
- Validate file types (images: jpg/png/webp, PDFs: application/pdf)
- Max file size: 10MB

### Form Validation
- Client-side validation matching backend rules
- Show validation errors inline
- Disable submit button while loading

### Data Fetching
- Use React Query for caching
- Optimistic updates for better UX
- Refetch on focus

---

## Page Actions Summary

### Books
- Create, Read, Update, Delete
- Add/remove parts
- Add/remove attachments
- Update status (draft/published/archived)

### Users
- Create, Read, Update, Delete
- Update role and status
- View user's addresses and orders

### Orders
- View all orders
- Update order status
- View order details

### All entities support:
- Search and filter
- Pagination
- Bulk actions where applicable
- Soft delete (data remains in database but marked as deleted)