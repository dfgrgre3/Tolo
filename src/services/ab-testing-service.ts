/**
 * AB Testing Service
 * 
 * Provides a client-side AB testing service backed by localStorage
 * for experiments management. In production, replace with real API calls.
 */

import { Experiment, CreateExperimentData } from "@/types/ab-testing";

const STORAGE_KEY = "ab_experiments";

function getStoredExperiments(): Experiment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveExperiments(experiments: Experiment[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(experiments));
}

const getAllExperiments = async (): Promise<Experiment[]> => {
  // In production: return (await fetch('/api/admin/ab-testing')).json();
  return getStoredExperiments();
};

const createExperiment = async (data: CreateExperimentData): Promise<Experiment> => {
  const experiments = getStoredExperiments();
  const newExp: Experiment = {
    id: `exp_${Date.now()}`,
    title: data.title,
    description: data.description,
    status: "draft",
    variantA: { name: data.variantAName, views: 0, completionRate: 0 },
    variantB: { name: data.variantBName, views: 0, completionRate: 0 },
    startDate: new Date().toISOString(),
    createdBy: "Admin",
    sampleSize: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  experiments.unshift(newExp);
  saveExperiments(experiments);
  return newExp;
};

const updateExperimentStatus = async (
  id: string,
  newStatus: "active" | "paused" | "completed"
): Promise<Experiment> => {
  const experiments = getStoredExperiments();
  const idx = experiments.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Experiment not found");

  experiments[idx] = {
    ...experiments[idx],
    status: newStatus,
    updatedAt: new Date().toISOString(),
    ...(newStatus === "completed" ? { endDate: new Date().toISOString() } : {}),
  };
  saveExperiments(experiments);
  return experiments[idx];
};

const declareWinner = async (id: string, winner: "A" | "B"): Promise<Experiment> => {
  const experiments = getStoredExperiments();
  const idx = experiments.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Experiment not found");

  experiments[idx] = {
    ...experiments[idx],
    winner,
    status: "completed",
    endDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveExperiments(experiments);
  return experiments[idx];
};

const getExperimentVariant = async (experimentId: string, userId: string): Promise<string> => {
  // Simple hash-based variant assignment
  const hash = (experimentId + userId).split("").reduce((a, b) => {
    a = ((a << 5) - a + b.charCodeAt(0)) | 0;
    return a;
  }, 0);
  return hash % 2 === 0 ? "A" : "B";
};

const trackExperimentEvent = async (
  experimentId: string,
  userId: string,
  event: string
): Promise<void> => {
  // In production: POST to backend
  console.log(`[AB] Track: ${experimentId} / ${userId} / ${event}`);
};

const abTestingService = {
  getAllExperiments,
  createExperiment,
  updateExperimentStatus,
  declareWinner,
  getExperimentVariant,
  trackExperimentEvent,
};

export { abTestingService };
export default abTestingService;
