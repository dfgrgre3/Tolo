import { Experiment, CreateExperimentData } from "../types/ab-testing";
import { logger } from '@/lib/logger';

const API_BASE_URL = '/api/ab-testing';

/**
 * Service for managing A/B testing experiments
 */
export const abTestingService = {
  /**
   * Fetch all experiments
   */
  async getAllExperiments(): Promise<Experiment[]> {
    try {
      const response = await fetch(`${API_BASE_URL}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch experiments: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      logger.error('Error fetching experiments:', error);
      throw error;
    }
  },

  /**
   * Create a new experiment
   */
  async createExperiment(data: CreateExperimentData): Promise<Experiment> {
    try {
      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create experiment: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      logger.error('Error creating experiment:', error);
      throw error;
    }
  },

  /**
   * Update an experiment status
   */
  async updateExperimentStatus(id: string, status: Experiment['status']): Promise<Experiment> {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update experiment status: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      logger.error('Error updating experiment status:', error);
      throw error;
    }
  },

  /**
   * Declare a winner for an experiment
   */
  async declareWinner(id: string, winner: 'A' | 'B'): Promise<Experiment> {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}/winner`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ winner }),
      });

      if (!response.ok) {
        throw new Error(`Failed to declare winner: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      logger.error('Error declaring winner:', error);
      throw error;
    }
  },
};
