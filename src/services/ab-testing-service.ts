/**
 * Dummy AB Testing Service for Go-Backend Migration
 */

const getExperimentVariant = async (experimentId: string, userId: string): Promise<string> => {
  return 'control';
};

const trackExperimentEvent = async (experimentId: string, userId: string, event: string): Promise<void> => {
  // Dummy
};

const abTestingService = {
  getExperimentVariant,
  trackExperimentEvent
};

export { abTestingService };
export default abTestingService;
