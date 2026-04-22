#!/usr/bin/env node

/**
 * Prisma Schema Validator
 * ظٹطھط­ظ‚ظ‚ ظ…ظ† طµط­ط© Schema ظˆظٹظƒطھط´ظپ ط§ظ„ظ…ط´ط§ظƒظ„ ط§ظ„ظ…ط­طھظ…ظ„ط©
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.prisma');
const MIGRATIONS_PATH = path.join(process.cwd(), 'prisma', 'migrations');

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

class SchemaValidator {
  private result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  };

  async validate(): Promise<ValidationResult> {
    console.log('ًں”چ ط¨ط¯ط، ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† Prisma Schema...\n');

    this.checkSchemaExists();
    this.checkSchemaFormat();
    this.checkMigrations();
    this.checkIndexes();
    this.checkRelations();
    this.checkDuplicateFields();
    this.validateWithPrisma();

    this.printResults();
    return this.result;
  }

  private checkSchemaExists(): void {
    if (!fs.existsSync(SCHEMA_PATH)) {
      this.result.valid = false;
      this.result.errors.push('â‌Œ ظ…ظ„ظپ schema.prisma ط؛ظٹط± ظ…ظˆط¬ظˆط¯');
      return;
    }
    this.result.info.push('âœ… ظ…ظ„ظپ schema.prisma ظ…ظˆط¬ظˆط¯');
  }

  private checkSchemaFormat(): void {
    try {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ generator
      if (!schema.includes('generator client')) {
        this.result.warnings.push('âڑ ï¸ڈ  ظ„ط§ ظٹظˆط¬ط¯ generator client ظپظٹ Schema');
      }

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ datasource
      if (!schema.includes('datasource db')) {
        this.result.errors.push('â‌Œ ظ„ط§ ظٹظˆط¬ط¯ datasource ظپظٹ Schema');
        this.result.valid = false;
      }

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ط³طھط®ط¯ط§ظ… PostgreSQL
      if (schema.includes('provider = "postgresql"')) {
        this.result.info.push('âœ… ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ: PostgreSQL');
      } else if (schema.includes('provider = "sqlite"')) {
        this.result.warnings.push('âڑ ï¸ڈ  ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ: SQLite (ظ„ظ„طھط·ظˆظٹط± ظپظ‚ط·)');
      }

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط¹ط¯ط¯ ط§ظ„ظ†ظ…ط§ط°ط¬
      const modelCount = (schema.match(/^model\s+\w+/gm) || []).length;
      this.result.info.push(`ًں“ٹ ط¹ط¯ط¯ ط§ظ„ظ†ظ…ط§ط°ط¬: ${modelCount}`);

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط­ظ‚ظˆظ„ ط§ظ„ظ…ظƒط±ط±ط©
      const modelRegex = /model\s+(\w+)\s*\{[\s\S]+?\n\}/g;
      const models = schema.match(modelRegex) || [];
      models.forEach((model) => {
        const modelName = model.match(/model\s+(\w+)/)?.[1];
        const fieldMatches = Array.from(model.matchAll(/^\s+(\w+)\s+/gm));
        const fieldNames = fieldMatches.map((match) => match[1]);
        const duplicates = fieldNames.filter(
          (name, index) => fieldNames.indexOf(name) !== index
        );

        if (duplicates.length > 0) {
          this.result.warnings.push(
            `âڑ ï¸ڈ  ط­ظ‚ظˆظ„ ظ…ظƒط±ط±ط© ظپظٹ ${modelName}: ${duplicates.join(', ')}`
          );
        }
      });

      this.result.info.push('âœ… طھظ†ط³ظٹظ‚ Schema طµط­ظٹط­');
    } catch (error) {
      this.result.errors.push(`â‌Œ ط®ط·ط£ ظپظٹ ظ‚ط±ط§ط،ط© Schema: ${error}`);
      this.result.valid = false;
    }
  }

  private checkMigrations(): void {
    if (!fs.existsSync(MIGRATIONS_PATH)) {
      this.result.warnings.push('âڑ ï¸ڈ  ظ…ط¬ظ„ط¯ migrations ط؛ظٹط± ظ…ظˆط¬ظˆط¯');
      return;
    }

    const migrations = fs
      .readdirSync(MIGRATIONS_PATH)
      .filter((f) => fs.statSync(path.join(MIGRATIONS_PATH, f)).isDirectory());

    this.result.info.push(`ًں“پ ط¹ط¯ط¯ ط§ظ„ظ€ migrations: ${migrations.length}`);

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظ…ظ„ظپط§طھ SQL
    migrations.forEach((migration) => {
      const sqlFile = path.join(MIGRATIONS_PATH, migration, 'migration.sql');
      if (!fs.existsSync(sqlFile)) {
        this.result.warnings.push(
          `âڑ ï¸ڈ  ظ…ظ„ظپ migration.sql ظ…ظپظ‚ظˆط¯ ظپظٹ: ${migration}`
        );
        return;
      }

      const sql = fs.readFileSync(sqlFile, 'utf-8');

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† PRAGMA (SQLite syntax)
      if (sql.includes('PRAGMA')) {
        this.result.warnings.push(
          `âڑ ï¸ڈ  ط§ط³طھط®ط¯ط§ظ… PRAGMA ظپظٹ: ${migration} (SQLite syntax)`
        );
      }

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† SET QUOTED_IDENTIFIER (SQL Server syntax)
      if (sql.includes('SET QUOTED_IDENTIFIER')) {
        this.result.warnings.push(
          `âڑ ï¸ڈ  ط§ط³طھط®ط¯ط§ظ… SET QUOTED_IDENTIFIER ظپظٹ: ${migration} (SQL Server syntax)`
        );
      }

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† UPDATE ط¨ط¯ظˆظ† WHERE
      if (sql.match(/UPDATE\s+"\w+"\s+SET\s+[^;]+;/i)) {
        const hasWhere = sql.match(/UPDATE\s+"\w+"\s+SET\s+[^;]+WHERE/i);
        if (!hasWhere) {
          this.result.warnings.push(
            `âڑ ï¸ڈ  UPDATE ط¨ط¯ظˆظ† WHERE ظپظٹ: ${migration} (ظ‚ط¯ ظٹط­ط¯ط« ظ…ط´ط§ظƒظ„)`
          );
        }
      }
    });

    this.result.info.push('âœ… طھظ… ظپط­طµ ظ…ظ„ظپط§طھ migrations');
  }

  private checkIndexes(): void {
    try {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      const indexCount = (schema.match(/@@index\(/g) || []).length;
      const uniqueCount = (schema.match(/@@unique\(/g) || []).length;

      this.result.info.push(`ًں“‡ ط¹ط¯ط¯ ط§ظ„ظپظ‡ط§ط±ط³: ${indexCount}`);
      this.result.info.push(`ًں”‘ ط¹ط¯ط¯ ط§ظ„ظپظ‡ط§ط±ط³ ط§ظ„ظپط±ظٹط¯ط©: ${uniqueCount}`);

      if (indexCount < 10) {
        this.result.warnings.push(
          'âڑ ï¸ڈ  ط¹ط¯ط¯ ط§ظ„ظپظ‡ط§ط±ط³ ظ‚ظ„ظٹظ„ - ظ‚ط¯ طھط­طھط§ط¬ ظ„ط¥ط¶ط§ظپط© ط§ظ„ظ…ط²ظٹط¯ ظ„ظ„ط£ط¯ط§ط،'
        );
      }

      this.result.info.push('âœ… طھظ… ظپط­طµ ط§ظ„ظپظ‡ط§ط±ط³');
    } catch (error) {
      this.result.warnings.push(`âڑ ï¸ڈ  ط®ط·ط£ ظپظٹ ظپط­طµ ط§ظ„ظپظ‡ط§ط±ط³: ${error}`);
    }
  }

  private checkRelations(): void {
    try {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      const relations = schema.match(/@relation\(/g) || [];

      this.result.info.push(`ًں”— ط¹ط¯ط¯ ط§ظ„ط¹ظ„ط§ظ‚ط§طھ: ${relations.length}`);

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† Cascade Delete
      const cascadeCount = (schema.match(/onDelete:\s*Cascade/g) || []).length;
      const restrictCount = (schema.match(/onDelete:\s*Restrict/g) || [])
        .length;

      this.result.info.push(`ًں—‘ï¸ڈ  Cascade Delete: ${cascadeCount}`);
      this.result.info.push(`ًںڑ« Restrict Delete: ${restrictCount}`);

      this.result.info.push('âœ… طھظ… ظپط­طµ ط§ظ„ط¹ظ„ط§ظ‚ط§طھ');
    } catch (error) {
      this.result.warnings.push(`âڑ ï¸ڈ  ط®ط·ط£ ظپظٹ ظپط­طµ ط§ظ„ط¹ظ„ط§ظ‚ط§طھ: ${error}`);
    }
  }

  private checkDuplicateFields(): void {
    try {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

      // ط§ظ„ط¨ط­ط« ط¹ظ† ظ†ظ…ط§ط°ط¬ ط¨ظ‡ط§ ط­ظ‚ظˆظ„ ظ…ط´ط§ط¨ظ‡ط©
      const suspiciousPatterns = [
        { pattern: /views\s+Int.*\n.*viewCount\s+Int/g, message: 'views ظˆ viewCount' },
        { pattern: /createdAt.*\n.*created\s+/gi, message: 'createdAt ظˆ created' },
        { pattern: /updatedAt.*\n.*updated\s+/gi, message: 'updatedAt ظˆ updated' },
      ];

      suspiciousPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(schema)) {
          this.result.warnings.push(
            `âڑ ï¸ڈ  ط­ظ‚ظˆظ„ ظ…ط´ط§ط¨ظ‡ط© ظ…ط­طھظ…ظ„ط©: ${message}`
          );
        }
      });

      this.result.info.push('âœ… طھظ… ظپط­طµ ط§ظ„ط­ظ‚ظˆظ„ ط§ظ„ظ…ظƒط±ط±ط©');
    } catch (error) {
      this.result.warnings.push(`âڑ ï¸ڈ  ط®ط·ط£ ظپظٹ ظپط­طµ ط§ظ„ط­ظ‚ظˆظ„ ط§ظ„ظ…ظƒط±ط±ط©: ${error}`);
    }
  }

  private validateWithPrisma(): void {
    try {
      console.log('\nًں”§ ط§ظ„طھط­ظ‚ظ‚ ط¨ط§ط³طھط®ط¯ط§ظ… Prisma CLI...');
      execSync('npx prisma validate', { stdio: 'pipe' });
      this.result.info.push('âœ… Schema طµط§ظ„ط­ ط­ط³ط¨ Prisma CLI');
    } catch (error) {
      this.result.errors.push('â‌Œ ظپط´ظ„ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† Prisma CLI');
      this.result.valid = false;
      if (error instanceof Error) {
        this.result.errors.push(`   ط§ظ„طھظپط§طµظٹظ„: ${error.message}`);
      }
    }
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('ًں“‹ ظ†طھط§ط¦ط¬ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† Schema');
    console.log('='.repeat(60) + '\n');

    if (this.result.info.length > 0) {
      console.log('â„¹ï¸ڈ  ظ…ط¹ظ„ظˆظ…ط§طھ:');
      this.result.info.forEach((info) => console.log(`  ${info}`));
      console.log('');
    }

    if (this.result.warnings.length > 0) {
      console.log('âڑ ï¸ڈ  طھط­ط°ظٹط±ط§طھ:');
      this.result.warnings.forEach((warning) => console.log(`  ${warning}`));
      console.log('');
    }

    if (this.result.errors.length > 0) {
      console.log('â‌Œ ط£ط®ط·ط§ط،:');
      this.result.errors.forEach((error) => console.log(`  ${error}`));
      console.log('');
    }

    console.log('='.repeat(60));
    if (this.result.valid) {
      console.log('âœ… Schema طµط§ظ„ط­ ظˆط¬ط§ظ‡ط² ظ„ظ„ط§ط³طھط®ط¯ط§ظ…!');
    } else {
      console.log('â‌Œ Schema ظٹط­طھظˆظٹ ط¹ظ„ظ‰ ط£ط®ط·ط§ط، - ظٹط±ط¬ظ‰ ط¥طµظ„ط§ط­ظ‡ط§');
      process.exit(1);
    }
    console.log('='.repeat(60) + '\n');
  }
}

// طھط´ط؛ظٹظ„ ط§ظ„طھط­ظ‚ظ‚
const validator = new SchemaValidator();
validator.validate().catch((error) => {
  console.error('â‌Œ ط®ط·ط£ ظپظٹ ط§ظ„طھط­ظ‚ظ‚:', error);
  process.exit(1);
});
