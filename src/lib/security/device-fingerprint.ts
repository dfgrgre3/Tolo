'use client';

/**
 * Advanced Device Fingerprinting Service
 * يوفر تتبع وتحليل الأجهزة بطريقة آمنة ومتقدمة
 */

import { v4 as uuidv4 } from 'uuid';

export interface DeviceFingerprint {
  fingerprint: string;
  browser: string;
  os: string;
  device: string;
  screen: string;
  timezone: string;
  language: string;
  platform: string;
  canvas?: string;
  webgl?: string;
}

export interface DeviceInfo {
  id: string;
  fingerprint: string;
  name: string;
  type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browser: string;
  os: string;
  trusted: boolean;
  firstSeen: Date;
  lastSeen: Date;
  location?: {
    country?: string;
    city?: string;
  };
}

/**
 * Generate device fingerprint from browser data with validation
 */
export function generateDeviceFingerprint(data: {
  userAgent: string;
  screen?: { width: number; height: number; colorDepth: number };
  timezone?: string;
  language?: string;
  platform?: string;
  canvas?: string;
  webgl?: string;
}): DeviceFingerprint {
  // Validate input
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid device fingerprint data');
  }

  if (!data.userAgent || typeof data.userAgent !== 'string' || data.userAgent.trim().length === 0) {
    throw new Error('User agent is required');
  }

  // Validate screen data if provided
  if (data.screen) {
    if (typeof data.screen.width !== 'number' || data.screen.width < 0 ||
        typeof data.screen.height !== 'number' || data.screen.height < 0 ||
        typeof data.screen.colorDepth !== 'number' || data.screen.colorDepth < 0) {
      throw new Error('Invalid screen data');
    }
  }

  // Validate and sanitize user agent (limit length to prevent DoS)
  const sanitizedUserAgent = data.userAgent.trim().slice(0, 500);
  
  const ua = parseUserAgent(sanitizedUserAgent);
  
  // Validate and sanitize components
  const components: string[] = [
    sanitizedUserAgent,
    data.screen ? `${data.screen.width}x${data.screen.height}x${data.screen.colorDepth}` : '',
    data.timezone ? data.timezone.trim().slice(0, 100) : (typeof navigator !== 'undefined' ? new Date().getTimezoneOffset().toString() : '0'),
    data.language ? data.language.trim().slice(0, 50) : (typeof navigator !== 'undefined' ? navigator.language : 'unknown'),
    data.platform ? data.platform.trim().slice(0, 100) : (typeof navigator !== 'undefined' ? navigator.platform : 'unknown'),
    data.canvas ? data.canvas.trim().slice(0, 200) : '',
    data.webgl ? data.webgl.trim().slice(0, 200) : '',
  ];

  // Generate hash
  const fingerprint = hashComponents(components);

  return {
    fingerprint,
    browser: ua.browser,
    os: ua.os,
    device: ua.device,
    screen: data.screen ? `${data.screen.width}x${data.screen.height}` : 'unknown',
    timezone: data.timezone ? data.timezone.trim() : 'unknown',
    language: data.language ? data.language.trim() : 'unknown',
    platform: data.platform ? data.platform.trim() : 'unknown',
    canvas: data.canvas ? data.canvas.trim() : undefined,
    webgl: data.webgl ? data.webgl.trim() : undefined,
  };
}

/**
 * Parse user agent string
 */
function parseUserAgent(ua: string): {
  browser: string;
  os: string;
  device: string;
} {
  // Browser detection
  let browser = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // OS detection
  let os = 'Unknown';
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10';
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (ua.includes('Windows NT 6.2')) os = 'Windows 8';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  // Device type detection
  let device = 'Desktop';
  if (ua.includes('Mobile')) device = 'Mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';

  return { browser, os, device };
}

/**
 * Simple hash function for fingerprint components with validation
 */
function hashComponents(components: string[]): string {
  // Validate input
  if (!components || !Array.isArray(components)) {
    throw new Error('Invalid components array');
  }

  // Filter out empty components and join
  const validComponents = components.filter(c => c && typeof c === 'string' && c.length > 0);
  const str = validComponents.join('|');
  
  // Limit string length to prevent DoS
  const limitedStr = str.slice(0, 10000);
  
  let hash = 0;
  
  for (let i = 0; i < limitedStr.length; i++) {
    const char = limitedStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Ensure hash is positive and convert to hex
  const positiveHash = Math.abs(hash);
  return positiveHash.toString(16).padStart(8, '0');
}

/**
 * Client-side device fingerprint generation
 */
export async function getClientDeviceFingerprint(): Promise<DeviceFingerprint> {
  if (typeof window === 'undefined') {
    throw new Error('This function can only be called on the client side');
  }

  const screen = {
    width: window.screen.width,
    height: window.screen.height,
    colorDepth: window.screen.colorDepth,
  };

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const platform = navigator.platform;

  // Canvas fingerprinting
  const canvas = await getCanvasFingerprint();
  
  // WebGL fingerprinting
  const webgl = getWebGLFingerprint();

  return generateDeviceFingerprint({
    userAgent: navigator.userAgent,
    screen,
    timezone,
    language,
    platform,
    canvas,
    webgl,
  });
}

/**
 * Generate canvas fingerprint
 */
async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';

    canvas.width = 200;
    canvas.height = 50;

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Canvas Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Canvas Fingerprint', 4, 17);

    return canvas.toDataURL().slice(-50);
  } catch {
    return '';
  }
}

/**
 * Generate WebGL fingerprint
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    
    if (!gl) return '';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return '';

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    return `${vendor}|${renderer}`;
  } catch {
    return '';
  }
}

/**
 * Compare two fingerprints for similarity
 */
export function compareFingerprints(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
  let score = 0;
  let total = 0;

  // Exact fingerprint match
  if (fp1.fingerprint === fp2.fingerprint) return 100;

  // Browser match
  total++;
  if (fp1.browser === fp2.browser) score++;

  // OS match
  total++;
  if (fp1.os === fp2.os) score++;

  // Device match
  total++;
  if (fp1.device === fp2.device) score++;

  // Screen match
  total++;
  if (fp1.screen === fp2.screen) score++;

  // Timezone match
  total++;
  if (fp1.timezone === fp2.timezone) score++;

  // Language match
  total++;
  if (fp1.language === fp2.language) score++;

  return Math.round((score / total) * 100);
}

/**
 * Determine device trust level based on history
 */
export function calculateDeviceTrustLevel(device: DeviceInfo): {
  level: 'high' | 'medium' | 'low' | 'unknown';
  score: number;
  reasons: string[];
} {
  let score = 50; // Start with neutral score
  const reasons: string[] = [];

  // Age of device
  const daysSinceFirstSeen = Math.floor(
    (Date.now() - device.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceFirstSeen > 30) {
    score += 20;
    reasons.push('جهاز معروف منذ أكثر من شهر');
  } else if (daysSinceFirstSeen > 7) {
    score += 10;
    reasons.push('جهاز معروف منذ أكثر من أسبوع');
  } else if (daysSinceFirstSeen < 1) {
    score -= 20;
    reasons.push('جهاز جديد تماماً');
  }

  // Recent activity
  const daysSinceLastSeen = Math.floor(
    (Date.now() - device.lastSeen.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastSeen < 1) {
    score += 10;
    reasons.push('نشاط حديث');
  } else if (daysSinceLastSeen > 30) {
    score -= 10;
    reasons.push('لم يستخدم منذ فترة طويلة');
  }

  // Trusted status
  if (device.trusted) {
    score += 20;
    reasons.push('جهاز موثوق');
  }

  // Determine level
  let level: 'high' | 'medium' | 'low' | 'unknown';
  if (score >= 80) level = 'high';
  else if (score >= 60) level = 'medium';
  else if (score >= 40) level = 'low';
  else level = 'unknown';

  return { level, score, reasons };
}

