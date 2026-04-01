CREATE INDEX IF NOT EXISTS "Book_createdAt_id_idx"
ON "Book"("createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "Subject_createdAt_id_idx"
ON "Subject"("createdAt" DESC, "id" DESC);
