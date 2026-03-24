export interface ExperimentVariant {
  name: string;
  views: number;
  completionRate: number;
  avgScore?: number;
}

export interface Experiment {
  id: string;
  title: string;
  status: "active" | "completed" | "paused" | "draft";
  variantA: ExperimentVariant;
  variantB: ExperimentVariant;
  winner?: "A" | "B";
  startDate: string;
  endDate?: string;
  createdBy: string;
  description: string;
  sampleSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExperimentData {
  title: string;
  description: string;
  variantAName: string;
  variantBName: string;
  targetAudience: string;
}