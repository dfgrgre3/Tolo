'use client';

/**
 * Advanced Device Fingerprinting Service
 * يوفر تتبع وتحليل الأجهزة بطريقة آمنة ومتقدمة
 */

import { 
  generateDeviceFingerprint, 
  DeviceFingerprint, 
  DeviceInfo,
  compareFingerprints,
  calculateDeviceTrustLevel
} from './device-fingerprint-shared';

export type { DeviceFingerprint, DeviceInfo };
export { generateDeviceFingerprint, compareFingerprints, calculateDeviceTrustLevel };

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

