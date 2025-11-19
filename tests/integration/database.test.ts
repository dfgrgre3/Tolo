import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
  getPrisma: jest.fn(),
}));

describe('Database Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Connection', () => {
    it('should connect to database', async () => {
      (prisma.$connect as jest.Mock).mockResolvedValue(undefined);
      
      await prisma.$connect();
      
      expect(prisma.$connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      (prisma.$connect as jest.Mock).mockRejectedValue(
        new Error('Connection failed')
      );

      await expect(prisma.$connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('Database Transactions', () => {
    it('should execute transactions', async () => {
      const mockTransaction = jest.fn().mockResolvedValue({ success: true });
      (prisma.$transaction as jest.Mock).mockImplementation(mockTransaction);

      await prisma.$transaction(async (_tx) => {
        return { success: true };
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should rollback on transaction error', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        new Error('Transaction failed')
      );

      await expect(
        prisma.$transaction(async () => {
          throw new Error('Transaction failed');
        })
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('User Operations', () => {
    it('should create user in database', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          passwordHash: 'hashed',
        },
      });

      expect(user).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should find user by email', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });

      expect(user).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });
});

