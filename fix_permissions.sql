ALTER TABLE "User" ALTER COLUMN "permissions" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "permissions" TYPE jsonb USING to_jsonb("permissions");
ALTER TABLE "User" ALTER COLUMN "permissions" SET DEFAULT '[]'::jsonb;
