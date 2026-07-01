# Tree Structure Implementation Plan

## Overview
This plan outlines the changes needed to implement a tree structure for books: `publications > subjects > books` with mandatory publication/subject for books and optional publication selection when creating subjects.

## Changes Required

### 1. Database Schema Changes (`prisma/schema.prisma`)

#### Publication Model
- Add `isActive` boolean field (default: `true`)
- Keep `status` field for soft delete filtering

#### Subject Model
- Add `publicationId` field (optional) - to link subject to publication
- Add `isActive` boolean field (default: `true`)
- Add relation to Publication

#### Book Model
- Make `publicationId` mandatory (remove `?`)
- Make `subjectId` mandatory (remove `?`)
- Add validation to ensure subject belongs to the selected publication

### 2. DTO Updates

#### `src/publication/dto/create-publication.dto.ts`
- Add `isActive` optional boolean field

#### `src/publication/dto/update-publication.dto.ts`
- Add `isActive` optional boolean field

#### `src/subject/dto/create-subject.dto.ts`
- Add `publicationId` optional string field
- Add `isActive` optional boolean field

#### `src/subject/dto/update-subject.dto.ts`
- Add `publicationId` optional string field
- Add `isActive` optional boolean field

#### `src/book/dto/create-book.dto.ts`
- Remove `@IsOptional()` from `publicationId`
- Remove `@IsOptional()` from `subjectId`
- Add validation to ensure subject belongs to publication

#### `src/book/dto/update-book.dto.ts`
- Remove `@IsOptional()` from `publicationId`
- Remove `@IsOptional()` from `subjectId`

### 3. Service Updates

#### `src/publication/publication.service.ts`
- Update `create()` to handle `isActive` field
- Update `update()` to handle `isActive` field
- Update `findAll()` to filter by `isActive` for public access

#### `src/subject/subject.service.ts`
- Update `create()` to handle `publicationId` and `isActive` fields
- Update `update()` to handle `publicationId` and `isActive` fields
- Update `findAll()` to filter by `isActive` and optionally by `publicationId`
- Add validation to ensure publication exists when linking

#### `src/book/book.service.ts`
- Update `create()` to validate subject belongs to publication
- Update `update()` to validate subject belongs to publication
- Add `getTree()` method to return hierarchical data

### 4. Controller Updates

#### `src/publication/publication.controller.ts`
- Add endpoint to get subjects by publication: `GET /publications/:id/subjects`

#### `src/subject/subject.controller.ts`
- Update `create()` and `update()` to pass `publicationId` and `isActive`

#### `src/book/book.controller.ts`
- Add `GET /books/tree` endpoint for tree structure

### 5. Seed Data Updates (`prisma/seed.ts`)
- Add `isActive: true` to publication and subject creation

## API Endpoints

### New Endpoints

#### `GET /books/tree`
Returns books in tree structure:
```json
[
  {
    "publication": {
      "id": "uuid",
      "name": "Publication Name",
      "slug": "publication-slug",
      "isActive": true
    },
    "subjects": [
      {
        "subject": {
          "id": "uuid",
          "name": "Subject Name",
          "slug": "subject-slug",
          "isActive": true
        },
        "books": [
          {
            "id": "uuid",
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

#### `GET /publications/:id/subjects`
Returns all subjects for a specific publication.

## Implementation Order

1. **Update Prisma Schema** - Add new fields and relations
2. **Create Migration** - Run `prisma migrate dev`
3. **Update DTOs** - Add new fields
4. **Update Services** - Implement business logic
5. **Update Controllers** - Add new endpoints
6. **Update Seed** - Add sample data with new fields
7. **Test** - Verify all endpoints work correctly

## Notes

- `isActive` field allows toggling visibility without soft delete
- Subject can be linked to a publication optionally
- When creating a book, both publication and subject are required
- Validation ensures subject belongs to the selected publication
- Tree endpoint is public (returns only active, published books)