export type ContestStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Contest {
  id: string;
  title: string;
  description: string;
  subjectId?: string;
  startTime: Date | string;
  endTime: Date | string;
  status: ContestStatus;
  maxParticipants?: number;
  currentParticipants: number;
  prizeDescription?: string;
  isPrivate: boolean;
  joinCode?: string;
  questions?: ContestQuestion[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ContestQuestion {
  id: string;
  contestId: string;
  text: string;
  type: string;
  points: number;
  options?: any;
  orderIndex: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}
