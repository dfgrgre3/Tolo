import { z } from 'zod';

describe('Validation Utilities', () => {
  describe('Email Validation', () => {
    const emailSchema = z.string().email();

    it('should validate correct email addresses', () => {
      expect(() => emailSchema.parse('test@example.com')).not.toThrow();
      expect(() => emailSchema.parse('user.name@domain.co.uk')).not.toThrow();
    });

    it('should reject invalid email addresses', () => {
      expect(() => emailSchema.parse('invalid-email')).toThrow();
      expect(() => emailSchema.parse('@example.com')).toThrow();
      expect(() => emailSchema.parse('test@')).toThrow();
    });
  });

  describe('Password Validation', () => {
    const passwordSchema = z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain uppercase letter')
      .regex(/[a-z]/, 'Password must contain lowercase letter')
      .regex(/[0-9]/, 'Password must contain number');

    it('should validate strong passwords', () => {
      expect(() => passwordSchema.parse('SecurePass123')).not.toThrow();
      expect(() => passwordSchema.parse('MyP@ssw0rd')).not.toThrow();
    });

    it('should reject weak passwords', () => {
      expect(() => passwordSchema.parse('short')).toThrow();
      expect(() => passwordSchema.parse('nouppercase123')).toThrow();
      expect(() => passwordSchema.parse('NOLOWERCASE123')).toThrow();
      expect(() => passwordSchema.parse('NoNumbers')).toThrow();
    });
  });

  describe('Task Validation', () => {
    const taskSchema = z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
    });

    it('should validate correct task data', () => {
      const validTask = {
        title: 'Complete project',
        description: 'Finish the project by Friday',
        priority: 'HIGH',
        status: 'PENDING',
      };

      expect(() => taskSchema.parse(validTask)).not.toThrow();
    });

    it('should reject invalid task data', () => {
      expect(() =>
        taskSchema.parse({ title: '' })
      ).toThrow(); // Empty title

      expect(() =>
        taskSchema.parse({ title: 'a'.repeat(201) })
      ).toThrow(); // Title too long

      expect(() =>
        taskSchema.parse({ title: 'Test', priority: 'INVALID' })
      ).toThrow(); // Invalid priority
    });
  });
});

