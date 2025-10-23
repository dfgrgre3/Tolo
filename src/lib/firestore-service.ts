import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  where,
  Unsubscribe
} from 'firebase/firestore';

const firebaseConfig = {
  // These should be moved to environment variables
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "demo-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export interface FirestoreUserProgress {
  userId: string;
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number;
  tasksCompleted: number;
  examsPassed: number;
  achievements: string[];
  lastUpdated: Date;
}

export interface FirestoreLeaderboardEntry {
  userId: string;
  username: string;
  totalXP: number;
  level: number;
  rank: number;
  avatar?: string;
  lastSeen: Date;
}

export class FirestoreService {
  private static instance: FirestoreService;
  private listeners: Map<string, Unsubscribe> = new Map();

  static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  // Real-time user progress tracking
  async subscribeToUserProgress(
    userId: string,
    callback: (progress: FirestoreUserProgress) => void
  ): Promise<Unsubscribe> {
    const docRef = doc(db, 'userProgress', userId);

    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          userId: data.userId,
          totalXP: data.totalXP || 0,
          level: data.level || 1,
          currentStreak: data.currentStreak || 0,
          longestStreak: data.longestStreak || 0,
          totalStudyTime: data.totalStudyTime || 0,
          tasksCompleted: data.tasksCompleted || 0,
          examsPassed: data.examsPassed || 0,
          achievements: data.achievements || [],
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        });
      } else {
        // Document doesn't exist, create it with default values
        this.initializeUserProgress(userId);
      }
    });

    this.listeners.set(`userProgress:${userId}`, unsubscribe);
    return unsubscribe;
  }

  // Real-time leaderboard updates
  async subscribeToLeaderboard(
    type: 'global' | 'friends' = 'global',
    limit: number = 50,
    callback: (leaderboard: FirestoreLeaderboardEntry[]) => void
  ): Promise<Unsubscribe> {
    const collectionRef = collection(db, 'leaderboard');
    const q = query(
      collectionRef,
      orderBy('totalXP', 'desc'),
      limit(limit)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const leaderboard: FirestoreLeaderboardEntry[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        leaderboard.push({
          userId: data.userId,
          username: data.username || 'مستخدم مجهول',
          totalXP: data.totalXP || 0,
          level: data.level || 1,
          rank: data.rank || 0,
          avatar: data.avatar,
          lastSeen: data.lastSeen?.toDate() || new Date()
        });
      });
      callback(leaderboard);
    });

    this.listeners.set(`leaderboard:${type}:${limit}`, unsubscribe);
    return unsubscribe;
  }

  // Update user progress in Firestore
  async updateUserProgress(userId: string, updates: Partial<FirestoreUserProgress>): Promise<void> {
    const docRef = doc(db, 'userProgress', userId);
    const updateData = {
      ...updates,
      lastUpdated: new Date()
    };

    await setDoc(docRef, updateData, { merge: true });

    // Also update leaderboard entry
    await this.updateLeaderboardEntry(userId, updates);
  }

  // Update leaderboard entry
  private async updateLeaderboardEntry(userId: string, updates: Partial<FirestoreUserProgress>): Promise<void> {
    const leaderboardRef = doc(db, 'leaderboard', userId);

    // Get current user data to include username and avatar
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.exists() ? userDoc.data() : {};

    await setDoc(leaderboardRef, {
      userId,
      username: userData.username || 'مستخدم مجهول',
      totalXP: updates.totalXP || 0,
      level: updates.level || 1,
      avatar: userData.avatar,
      lastSeen: new Date()
    }, { merge: true });
  }

  // Initialize user progress document
  private async initializeUserProgress(userId: string): Promise<void> {
    const initialProgress: FirestoreUserProgress = {
      userId,
      totalXP: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      totalStudyTime: 0,
      tasksCompleted: 0,
      examsPassed: 0,
      achievements: [],
      lastUpdated: new Date()
    };

    await this.updateUserProgress(userId, initialProgress);
  }

  // Achievement notifications in real-time
  async subscribeToAchievementNotifications(
    userId: string,
    callback: (achievement: { key: string; title: string; description: string; icon: string; xpReward: number }) => void
  ): Promise<Unsubscribe> {
    const notificationsRef = collection(db, 'achievementNotifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'achievement_unlocked') {
          callback({
            key: data.achievementKey,
            title: data.title,
            description: data.description,
            icon: data.icon,
            xpReward: data.xpReward
          });
        }
      });
    });

    this.listeners.set(`notifications:${userId}`, unsubscribe);
    return unsubscribe;
  }

  // Send achievement notification
  async sendAchievementNotification(
    userId: string,
    achievement: { key: string; title: string; description: string; icon: string; xpReward: number }
  ): Promise<void> {
    const notificationRef = doc(collection(db, 'achievementNotifications'));
    await setDoc(notificationRef, {
      userId,
      type: 'achievement_unlocked',
      achievementKey: achievement.key,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      xpReward: achievement.xpReward,
      timestamp: new Date(),
      read: false
    });
  }

  // Clean up all listeners for a user (memory optimization)
  cleanupUserListeners(userId: string): void {
    const listenerKeys = [
      `userProgress:${userId}`,
      `notifications:${userId}`
    ];

    listenerKeys.forEach(key => {
      const unsubscribe = this.listeners.get(key);
      if (unsubscribe) {
        unsubscribe();
        this.listeners.delete(key);
      }
    });
  }

  // Clean up specific listener
  cleanupListener(listenerKey: string): void {
    const unsubscribe = this.listeners.get(listenerKey);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(listenerKey);
    }
  }

  // Clean up all listeners (for app shutdown)
  cleanupAllListeners(): void {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }

  // Get current listener count (for debugging)
  getActiveListenerCount(): number {
    return this.listeners.size;
  }

  // Get all active listener keys (for debugging)
  getActiveListeners(): string[] {
    return Array.from(this.listeners.keys());
  }
}

export const firestoreService = FirestoreService.getInstance();
