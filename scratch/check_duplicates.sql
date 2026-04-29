SELECT "userId", COUNT(*) FROM "UserSettings" GROUP BY "userId" HAVING COUNT(*) > 1;
