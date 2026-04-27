/**
 * Dummy AB Testing Service for Go-Backend Migration
 */

export const getExperimentVariant = async (experimentId: string, userId: string): Promise<string> => {
  return 'control';
};

export const trackExperimentEvent = async (experimentId: string, userId: string, event: string): Promise<void> => {
  // Dummy
};

const abTestingService = {
  getExperimentVariant,
  trackExperimentEvent
};

export default abTestingService;
