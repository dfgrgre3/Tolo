#!/usr/bin/env tsx
/**
 * OAuth Configuration Check Script
 * سكربت للتحقق من إعدادات OAuth و redirect_uri
 * 
 * Checks:
 * - Google OAuth redirect_uri configuration
 * - Environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_BASE_URL)
 * - Redirect URI format validation
 * - Consistency between code and documentation
 * 
 * Usage: npm run check:oauth
 *        tsx scripts/check-oauth-config.ts
 */

import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });
config({ path: path.join(__dirname, '..', '.env') });


interface OAuthReport {
  google: {
    clientId: string | null;
    clientSecret: string | null;
    baseUrl: string | null;
    redirectUri: string | null;
    isConfigured: boolean;
    validation: {
      valid: boolean;
      errors: string[];
      warnings: string[];
    };
  };
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

function validateRedirectUri(redirectUri: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!redirectUri || redirectUri.trim() === '') {
    errors.push('Redirect URI cannot be empty');
    return { valid: false, errors, warnings };
  }

  try {
    const url = new URL(redirectUri);
    
    // Check protocol
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      errors.push(`Invalid protocol: ${url.protocol}. Must be http:// or https://`);
    }

    // Check for trailing slash (common mistake)
    if (redirectUri.endsWith('/') && !redirectUri.endsWith('/callback/')) {
      errors.push('Redirect URI should not end with a trailing slash (except /callback/)');
    }

    // Check path format
    if (!url.pathname.startsWith('/api/auth/')) {
      errors.push('Redirect URI path must start with /api/auth/');
    }

    // Check for Google OAuth callback path
    if (!url.pathname.includes('/google/callback')) {
      warnings.push('Redirect URI does not include /google/callback path');
    }

    // Warn about localhost in production
    if (url.hostname === 'localhost' && process.env.NODE_ENV === 'production') {
      warnings.push('Using localhost in production environment is not recommended');
    }

    // Warn about http in production
    if (url.protocol === 'http:' && process.env.NODE_ENV === 'production') {
      warnings.push('Using http:// in production is not secure. Use https://');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(`Invalid redirect URI format: ${error instanceof Error ? error.message : String(error)}`);
    return { valid: false, errors, warnings };
  }
}

function getRedirectUri(): string {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').trim();
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  return `${cleanBaseUrl}/api/auth/google/callback`;
}

function checkOAuthConfig(): OAuthReport {
  const report: OAuthReport = {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || null,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || null,
      redirectUri: null,
      isConfigured: false,
      validation: {
        valid: false,
        errors: [],
        warnings: [],
      },
    },
    errors: [],
    warnings: [],
    recommendations: [],
  };

  // Check environment variables
  if (!report.google.clientId || report.google.clientId.trim() === '') {
    report.errors.push('GOOGLE_CLIENT_ID is not set');
  } else {
    report.google.clientId = report.google.clientId.substring(0, 20) + '...';
  }

  if (!report.google.clientSecret || report.google.clientSecret.trim() === '') {
    report.errors.push('GOOGLE_CLIENT_SECRET is not set');
  } else {
    report.google.clientSecret = '***';
  }

  if (!report.google.baseUrl || report.google.baseUrl.trim() === '') {
    report.warnings.push('NEXT_PUBLIC_BASE_URL is not set, using default: http://localhost:3000');
    report.google.baseUrl = 'http://localhost:3000';
  }

  // Calculate redirect URI
  report.google.redirectUri = getRedirectUri();
  report.google.isConfigured = 
    (process.env.GOOGLE_CLIENT_ID || '').trim() !== '' && 
    (process.env.GOOGLE_CLIENT_SECRET || '').trim() !== '';

  // Validate redirect URI
  if (report.google.redirectUri) {
    report.google.validation = validateRedirectUri(report.google.redirectUri);
  }

  // Generate recommendations
  if (!report.google.isConfigured) {
    report.recommendations.push('Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local');
  }

  if (!report.google.validation.valid) {
    report.recommendations.push('Fix redirect_uri format errors (see validation errors above)');
    report.recommendations.push(`Make sure redirect_uri in Google Cloud Console matches: ${report.google.redirectUri}`);
  } else {
    report.recommendations.push(`Add this redirect_uri to Google Cloud Console: ${report.google.redirectUri}`);
  }

  if (report.google.baseUrl?.startsWith('http://') && process.env.NODE_ENV === 'production') {
    report.recommendations.push('Use https:// in production for NEXT_PUBLIC_BASE_URL');
  }

  return report;
}

function formatReport(report: OAuthReport): void {
  console.log('\n' + '='.repeat(70));
  console.log('OAuth Configuration Check / فحص إعدادات OAuth');
  console.log('='.repeat(70) + '\n');

  // Google OAuth Status
  console.log('📋 Google OAuth Configuration:');
  console.log(`   Client ID: ${report.google.clientId || '❌ Not set'}`);
  console.log(`   Client Secret: ${report.google.clientSecret || '❌ Not set'}`);
  console.log(`   Base URL: ${report.google.baseUrl || '❌ Not set'}`);
  console.log(`   Redirect URI: ${report.google.redirectUri || '❌ Not calculated'}`);
  console.log(`   Configured: ${report.google.isConfigured ? '✅ Yes' : '❌ No'}`);
  console.log();

  // Validation
  if (report.google.redirectUri) {
    console.log('🔍 Redirect URI Validation:');
    if (report.google.validation.valid) {
      console.log('   ✅ Valid format');
    } else {
      console.log('   ❌ Invalid format');
      report.google.validation.errors.forEach(error => {
        console.log(`      • ${error}`);
      });
    }
    
    if (report.google.validation.warnings.length > 0) {
      report.google.validation.warnings.forEach(warning => {
        console.log(`      ⚠️  ${warning}`);
      });
    }
    console.log();
  }

  // Errors
  if (report.errors.length > 0) {
    console.log('❌ Errors:');
    report.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
    console.log();
  }

  // Warnings
  if (report.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    report.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
    console.log();
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('💡 Recommendations / التوصيات:');
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log();
  }

  // Google Cloud Console Instructions
  console.log('📝 Google Cloud Console Setup Instructions:');
  console.log('   1. Go to https://console.cloud.google.com/');
  console.log('   2. Navigate to: APIs & Services → Credentials');
  console.log('   3. Select your OAuth 2.0 Client ID');
  console.log(`   4. Add this exact redirect_uri to "Authorized redirect URIs":`);
  console.log(`      ${report.google.redirectUri || 'N/A'}`);
  console.log('   5. Make sure it matches EXACTLY (same protocol, domain, port, path)');
  console.log();

  // Summary
  console.log('='.repeat(70));
  const allValid = report.google.isConfigured && report.google.validation.valid && report.errors.length === 0;
  if (allValid) {
    console.log('✅ All checks passed! OAuth configuration looks good.');
  } else {
    console.log('❌ Configuration issues found. Please fix the errors above.');
  }
  console.log('='.repeat(70) + '\n');
}

async function main() {
  try {
    const report = checkOAuthConfig();
    formatReport(report);
    
    // Exit with error code if there are critical issues
    if (report.errors.length > 0 || !report.google.validation.valid) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error checking OAuth configuration:', error);
    process.exit(1);
  }
}

main();

