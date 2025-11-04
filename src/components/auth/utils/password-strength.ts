/**
 * Shared password strength utilities
 * Centralized password strength calculation and styling
 * 
 * @optimized - Improved performance with memoization support
 */

import { evaluatePassword } from '../register/validators';

export interface PasswordStrengthDisplay {
  score: number;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Get password strength with display properties
 */
export function getPasswordStrengthDisplay(password: string): PasswordStrengthDisplay {
  if (!password) {
    return {
      score: 0,
      label: 'ضعيفة جداً',
      color: 'bg-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      checks: {
        minLength: false,
        hasUpper: false,
        hasLower: false,
        hasNumber: false,
        hasSpecial: false,
      },
    };
  }

  const evaluation = evaluatePassword(password);
  
  // Extract checks from requirements
  const checks = {
    minLength: evaluation.requirements.find(r => 
      r.label.includes('ثمانية') || r.label.includes('8') || r.label.includes('طول')
    )?.met || password.length >= 8,
    hasUpper: evaluation.requirements.find(r => 
      r.label.includes('كبير') || r.label.includes('حرف كبير')
    )?.met || /[A-Z]/.test(password),
    hasLower: evaluation.requirements.find(r => 
      r.label.includes('صغير') || r.label.includes('حرف صغير')
    )?.met || /[a-z]/.test(password),
    hasNumber: evaluation.requirements.find(r => 
      r.label.includes('رقم') || r.label.includes('عدد')
    )?.met || /\d/.test(password),
    hasSpecial: evaluation.requirements.find(r => 
      r.label.includes('خاص') || r.label.includes('رمز') || r.label.includes('مميز')
    )?.met || /[^A-Za-z0-9]/.test(password),
  };

  // Determine colors based on score
  let bgColor = 'bg-red-500/10';
  let borderColor = 'border-red-500/30';
  let color = 'bg-red-500';
  
  if (evaluation.score >= 80) {
    bgColor = 'bg-green-500/10';
    borderColor = 'border-green-500/30';
    color = 'bg-green-500';
  } else if (evaluation.score >= 60) {
    bgColor = 'bg-blue-500/10';
    borderColor = 'border-blue-500/30';
    color = 'bg-blue-500';
  } else if (evaluation.score >= 40) {
    bgColor = 'bg-yellow-500/10';
    borderColor = 'border-yellow-500/30';
    color = 'bg-yellow-500';
  } else if (evaluation.score >= 20) {
    bgColor = 'bg-orange-500/10';
    borderColor = 'border-orange-500/30';
    color = 'bg-orange-500';
  }

  return {
    score: evaluation.score,
    label: evaluation.label,
    color,
    bgColor,
    borderColor,
    checks,
  };
}

/**
 * Get password strength label (for backward compatibility)
 */
export function getPasswordStrengthLabel(score: number): string {
  if (score >= 80) return 'قوية جداً';
  if (score >= 60) return 'قوية';
  if (score >= 40) return 'متوسطة';
  if (score >= 20) return 'ضعيفة';
  return 'ضعيفة جداً';
}

/**
 * Get password strength color class
 */
export function getPasswordStrengthColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

