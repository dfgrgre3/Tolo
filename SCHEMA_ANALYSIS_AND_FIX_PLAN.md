# Schema Analysis and Fix Plan

## Current Status
The Prisma migration is running but there are 201 TypeScript errors because the schema is missing fields and relations that the application code expects.

## Issues Found

### 1. Event Model - Missing Fields
**Location:** `prisma/schema.prisma` lines 942-957
**Missing:**
- `imageUrl: String?`
- `organizerId: String`
- `category: String`
- `isPublic: Boolean @default(true)`
- `tags: Json @default("[]")`
- Relation to User as organizer

### 2. Exam Model - Missing Fields
**Location:** `prisma/schema.prisma` lines 216-228
**Missing:**
- `type: String?` (for exam type)
- `createdAt: DateTime @default(now())`

### 3. UserGrade Model - Missing Field
**Location:** `prisma/schema.prisma` lines 1013-1028
**Missing:**
- `date: DateTime?` (currently has `examDate` but code expects `date`)

### 4. Schedule Model - Missing Fields
**Location:** `prisma/schema.prisma` lines 993-1010
**Missing:**
- `name: String?`
- `active: Boolean @default(true)`
- `planJson: String?`
- `version: Int @default(0)`
- Unique constraint on `userId_active`

### 5. OfflineLesson Model - Missing Field
**Location:** `prisma/schema.prisma` lines 1031-1048
**Missing:**
- `userId: String` (relation to User)

### 6. ForumCategory Model - Missing Field
**Location:** `prisma/schema.prisma` lines 892-903
**Missing:**
- `icon: String?`

### 7. ForumPost Model - Missing Relation
**Location:** `prisma/schema.prisma` lines 905-924
**Missing:**
- Relation to User as author
- `views: Int @default(0)` (currently has `viewCount`)

### 8. ForumReply Model - Missing Relation
**Location:** `prisma/schema.prisma` lines 926-939
**Missing:**
- Relation to User as author

### 9. BlogCategory Model - Missing Field
**Location:** `prisma/schema.prisma` lines 856-867
**Missing:**
- `icon: String?`

### 10. BlogPost Model - Missing Relation
**Location:** `prisma/schema.prisma` lines 869-889
**Missing:**
- Relation to User as author

### 11. Subject Model - Missing Field
**Location:** `prisma/schema.prisma` lines 759-771
**Missing:**
- `type: String?`
- `isActive: Boolean @default(true)`

### 12. User Model - Missing Relation
**Location:** `prisma/schema.prisma` lines 10-84
**Missing:**
- `subjectEnrollments` relation (already exists but may need Teacher relation)

### 13. Announcement Model - Missing Field
**Location:** `prisma/schema.prisma` lines 841-853
**Missing:**
- `authorId: String?` (relation to User)

### 14. AiGeneratedExam Model - Missing Field
**Location:** `prisma/schema.prisma` lines 1051-1067
**Missing:**
- `year: Int?`

### 15. AiQuestion Model - Type Issue
**Location:** `prisma/schema.prisma` lines 1069-1084
**Issue:**
- `options: Json` should handle null properly in TypeScript

### 16. Reminder Model - Missing Field
**Location:** `prisma/schema.prisma` lines 143-156
**Issue:**
- Missing `id` auto-generation default

## Fix Strategy

### Phase 1: Update Schema (PRIORITY)
1. Add all missing fields to models
2. Add all missing relations
3. Add proper indexes for new fields
4. Ensure all defaults are set correctly

### Phase 2: Generate Migration
1. Run `npx prisma migrate dev --name add_missing_fields_and_relations`
2. This will update the database schema

### Phase 3: Regenerate Prisma Client
1. Run `npx prisma generate`
2. This will update TypeScript types

### Phase 4: Fix Remaining TypeScript Errors
1. Fix import errors (missing modules)
2. Fix type mismatches
3. Fix test files

## Implementation Order

1. ✅ Event model (highest priority - many errors)
2. ✅ Forum models (ForumPost, ForumReply, ForumCategory)
3. ✅ Blog models (BlogPost, BlogCategory)
4. ✅ Schedule model
5. ✅ Exam and UserGrade models
6. ✅ Subject model
7. ✅ OfflineLesson model
8. ✅ AiGeneratedExam and AiQuestion models
9. ✅ Announcement model
10. ✅ Reminder model

## Next Steps

1. Update `prisma/schema.prisma` with all missing fields
2. Run migration
3. Fix remaining TypeScript errors
4. Test the application
