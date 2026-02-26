import { defineConfig } from '@prisma/config';
import { config } from 'dotenv';

config(); // Load environment variables from .env file

export default defineConfig({
    datasource: {
        url: process.env.DATABASE_URL ?? '',
    },
});
