---
description: How to update the database schema and regenerate Prisma client
---

To apply the latest improvements to the courses (Subjects) system, follow these steps:

1. **Apply Schema Changes**:
   Run the following command to push the schema changes to your database without creating a new migration (suitable for development):
   ```bash
   npx prisma db push
   ```

2. **Regenerate Prisma Client**:
   Update your local Prisma client to recognize the new fields (`price`, `rating`, `instructorName`, etc.):
   ```bash
   npx prisma generate
   ```

3. **Verify API and UI**:
   Restart your development server and check the Courses page. It will now fetch and display real data from your database instead of using hardcoded fake courses.
