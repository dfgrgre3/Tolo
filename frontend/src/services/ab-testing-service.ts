/**
 * AB Testing Service
 *
 * Provides AB testing management via the backend API.
 */

import { Experiment, CreateExperimentData } from "@/types/ab-testing";
import { adminFetch } from "@/lib/api/admin-api";
import { apiRoutes } from "@/lib/api/routes";

interface BackendABExperiment {
  id: string;
  name: string;
  description: string;
  status: string;
  variants: string;
  trafficPct: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusMap: Record<string, Experiment["status"]> = {
  DRAFT: "draft",
  RUNNING: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
};

const reverseStatusMap: Record<Experiment["status"], string> = {
  draft: "DRAFT",
  active: "RUNNING",
  paused: "PAUSED",
  completed: "COMPLETED",
};

function mapBackendToFrontend(item: BackendABExperiment): Experiment {
  let variants: { name: string; views: number; completionRate: number }[] = [];
  try {
    variants = item.variants ? JSON.parse(item.variants) : [];
  } catch {
    variants = [];
  }

  return {
    id: item.id,
    title: item.name,
    description: item.description || "",
    status: statusMap[item.status] || "draft",
    variantA: variants[0] || { name: "A", views: 0, completionRate: 0 },
    variantB: variants[1] || { name: "B", views: 0, completionRate: 0 },
    startDate: item.startDate || item.createdAt,
    endDate: item.endDate || undefined,
    createdBy: "Admin",
    sampleSize: item.trafficPct,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

const getAllExperiments = async (): Promise<Experiment[]> => {
  const response = await adminFetch(apiRoutes.admin.abTesting);
  if (!response.ok) throw new Error("Failed to fetch AB experiments");
  const json = await response.json();
  const items: BackendABExperiment[] = json.data?.experiments || json.experiments || [];
  return items.map(mapBackendToFrontend);
};

const createExperiment = async (data: CreateExperimentData): Promise<Experiment> => {
  const variants = JSON.stringify([
    { name: data.variantAName, views: 0, completionRate: 0 },
    { name: data.variantBName, views: 0, completionRate: 0 },
  ]);

  const response = await adminFetch(apiRoutes.admin.abTesting, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.title,
      description: data.description,
      status: "DRAFT",
      variants,
      trafficPct: 100,
    }),
  });

  if (!response.ok) throw new Error("Failed to create experiment");
  const json = await response.json();
  const item: BackendABExperiment = json.data?.experiment || json.experiment || json;
  return mapBackendToFrontend(item);
};

const updateExperimentStatus = async (
  id: string,
  newStatus: "active" | "paused" | "completed"
): Promise<Experiment> => {
  const backendStatus = reverseStatusMap[newStatus];
  const response = await adminFetch(`${apiRoutes.admin.abTesting}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: backendStatus,
      ...(newStatus === "completed" ? { endDate: new Date().toISOString() } : {}),
    }),
  });

  if (!response.ok) throw new Error("Failed to update experiment status");
  const json = await response.json();
  const item: BackendABExperiment = json.data?.experiment || json.experiment || json;
  return mapBackendToFrontend(item);
};

const declareWinner = async (id: string, winner: "A" | "B"): Promise<Experiment> => {
  const response = await adminFetch(`${apiRoutes.admin.abTesting}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "COMPLETED",
      endDate: new Date().toISOString(),
      winner,
    }),
  });

  if (!response.ok) throw new Error("Failed to declare winner");
  const json = await response.json();
  const item: BackendABExperiment = json.data?.experiment || json.experiment || json;
  return mapBackendToFrontend(item);
};

const deleteExperiment = async (id: string): Promise<void> => {
  const response = await adminFetch(`${apiRoutes.admin.abTesting}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete experiment");
};

const getExperimentVariant = async (experimentId: string, userId: string): Promise<string> => {
  const hash = (experimentId + userId).split("").reduce((a, b) => {
    a = Math.trunc((a << 5) - a + b.charCodeAt(0));
    return a;
  }, 0);
  return hash % 2 === 0 ? "A" : "B";
};

const trackExperimentEvent = async (
  experimentId: string,
  userId: string,
  event: string
): Promise<void> => {
  await adminFetch(`${apiRoutes.admin.abTesting}/${experimentId}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, event }),
  });
};

const abTestingService = {
  getAllExperiments,
  createExperiment,
  updateExperimentStatus,
  declareWinner,
  deleteExperiment,
  getExperimentVariant,
  trackExperimentEvent,
};

export { abTestingService };
export default abTestingService;
