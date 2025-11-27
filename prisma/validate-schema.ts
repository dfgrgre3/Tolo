#!/usr/bin/env node

/**
 * Prisma Schema Validator
 * يتحقق من صحة Schema ويكتشف المشاكل المحتملة
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
    console.log('🔍 بدء التحقق من Prisma Schema...\n');

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
      this.result.errors.push('❌ ملف schema.prisma غير موجود');
      return;
    }
    this.result.info.push('✅ ملف schema.prisma موجود');
  }

  private checkSchemaFormat(): void {
    try {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

      // التحقق من وجود generator
      if (!schema.includes('generator client')) {
        this.result.warnings.push('⚠️  لا يوجد generator client في Schema');
      }

      // التحقق من وجود datasource
      if (!schema.includes('datasource db')) {
        this.result.errors.push('❌ لا يوجد datasource في Schema');
        this.result.valid = false;
      }

      // التحقق من استخدام PostgreSQL
      if (schema.includes('provider = "postgresql"')) {
        this.result.info.push('✅ قاعدة البيانات: PostgreSQL');
      } else if (schema.includes('provider = "sqlite"')) {
        this.result.warnings.push('⚠️  قاعدة البيانات: SQLite (للتطوير فقط)');
      }

      // التحقق من عدد النماذج
      const modelCount = (schema.match(/^model\s+\w+/gm) || []).length;
      this.result.info.push(`📊 عدد النماذج: ${modelCount}`);

      // التحقق من الحقول المكررة
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
            `⚠️  حقول مكررة في ${modelName}: ${duplicates.join(', ')}`
          );
        }
      });

      this.result.info.push('✅ تنسيق Schema صحيح');
    } catch (error) {
      this.result.errors.push(`❌ خطأ في قراءة Schema: ${error}`);
      this.result.valid = false;
    }
  }

  private checkMigrations(): void {
    if (!fs.existsSync(MIGRATIONS_PATH)) {
      this.result.warnings.push('⚠️  مجلد migrations غير موجود');
      return;
    }

    const migrations = fs
      .readdirSync(MIGRATIONS_PATH)
      .filter((f) => fs.statSync(path.join(MIGRATIONS_PATH, f)).isDirectory());

    this.result.info.push(`📁 عدد الـ migrations: ${migrations.length}`);

    // التحقق من ملفات SQL
    migrations.forEach((migration) => {
      const sqlFile = path.join(MIGRATIONS_PATH, migration, 'migration.sql');
      if (!fs.existsSync(sqlFile)) {
        this.result.warnings.push(
          `⚠️  ملف migration.sql مفقود في: ${migration}`
        );
        return;
      }

      const sql = fs.readFileSync(sqlFile, 'utf-8');

      // التحقق من PRAGMA (SQLite syntax)
      if (sql.includes('PRAGMA')) {
        this.result.warnings.push(
          `⚠️  استخدام PRAGMA في: ${migration} (SQLite syntax)`
        );
      }

      // التحقق من SET QUOTED_IDENTIFIER (SQL Server syntax)
      if (sql.includes('SET QUOTED_IDENTIFIER')) {
        this.result.warnings.push(
          `⚠️  استخدام SET QUOTED_IDENTIFIER في: ${migration} (SQL Server syntax)`
        );
      }

      // التحقق من UPDATE بدون WHERE
      if (sql.match(/UPDATE\s+"\w+"\s+SET\s+[^;]+;/i)) {
        const hasWhere = sql.match(/UPDATE\s+"\w+"\s+SET\s+[^;]+WHERE/i);
        if (!hasWhere) {
          this.result.warnings.push(
            `⚠️  UPDATE بدون WHERE في: ${migration} (قد يحدث مشاكل)`
          );
        }
      }
    });

    this.result.info.push('✅ تم فحص ملفات migrations');
  }

  private checkIndexes(): void {
    try {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      const indexCount = (schema.match(/@@index\(/g) || []).length;
      const uniqueCount = (schema.match(/@@unique\(/g) || []).length;

      this.result.info.push(`📇 عدد الفهارس: ${indexCount}`);
      this.result.info.push(`🔑 عدد الفهارس الفريدة: ${uniqueCount}`);

      if (indexCount < 10) {
        this.result.warnings.push(
          '⚠️  عدد الفهارس قليل - قد تحتاج لإضافة المزيد للأداء'
        );
      }

      this.result.info.push('✅ تم فحص الفهارس');
    } catch (error) {
      this.result.warnings.push(`⚠️  خطأ في فحص الفهارس: ${error}`);
    }
  }

  private checkRelations(): void {
    try {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      const relations = schema.match(/@relation\(/g) || [];

      this.result.info.push(`🔗 عدد العلاقات: ${relations.length}`);

      // التحقق من Cascade Delete
      const cascadeCount = (schema.match(/onDelete:\s*Cascade/g) || []).length;
      const restrictCount = (schema.match(/onDelete:\s*Restrict/g) || [])
        .length;

      this.result.info.push(`🗑️  Cascade Delete: ${cascadeCount}`);
      this.result.info.push(`🚫 Restrict Delete: ${restrictCount}`);

      this.result.info.push('✅ تم فحص العلاقات');
    } catch (error) {
      this.result.warnings.push(`⚠️  خطأ في فحص العلاقات: ${error}`);
    }
  }

  private checkDuplicateFields(): void {
    try {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

      // البحث عن نماذج بها حقول مشابهة
      const suspiciousPatterns = [
        { pattern: /views\s+Int.*\n.*viewCount\s+Int/g, message: 'views و viewCount' },
        { pattern: /createdAt.*\n.*created\s+/gi, message: 'createdAt و created' },
        { pattern: /updatedAt.*\n.*updated\s+/gi, message: 'updatedAt و updated' },
      ];

      suspiciousPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(schema)) {
          this.result.warnings.push(
            `⚠️  حقول مشابهة محتملة: ${message}`
          );
        }
      });

      this.result.info.push('✅ تم فحص الحقول المكررة');
    } catch (error) {
      this.result.warnings.push(`⚠️  خطأ في فحص الحقول المكررة: ${error}`);
    }
  }

  private validateWithPrisma(): void {
    try {
      console.log('\n🔧 التحقق باستخدام Prisma CLI...');
      execSync('npx prisma validate', { stdio: 'pipe' });
      this.result.info.push('✅ Schema صالح حسب Prisma CLI');
    } catch (error) {
      this.result.errors.push('❌ فشل التحقق من Prisma CLI');
      this.result.valid = false;
      if (error instanceof Error) {
        this.result.errors.push(`   التفاصيل: ${error.message}`);
      }
    }
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 نتائج التحقق من Schema');
    console.log('='.repeat(60) + '\n');

    if (this.result.info.length > 0) {
      console.log('ℹ️  معلومات:');
      this.result.info.forEach((info) => console.log(`  ${info}`));
      console.log('');
    }

    if (this.result.warnings.length > 0) {
      console.log('⚠️  تحذيرات:');
      this.result.warnings.forEach((warning) => console.log(`  ${warning}`));
      console.log('');
    }

    if (this.result.errors.length > 0) {
      console.log('❌ أخطاء:');
      this.result.errors.forEach((error) => console.log(`  ${error}`));
      console.log('');
    }

    console.log('='.repeat(60));
    if (this.result.valid) {
      console.log('✅ Schema صالح وجاهز للاستخدام!');
    } else {
      console.log('❌ Schema يحتوي على أخطاء - يرجى إصلاحها');
      process.exit(1);
    }
    console.log('='.repeat(60) + '\n');
  }
}

// تشغيل التحقق
const validator = new SchemaValidator();
validator.validate().catch((error) => {
  console.error('❌ خطأ في التحقق:', error);
  process.exit(1);
});
