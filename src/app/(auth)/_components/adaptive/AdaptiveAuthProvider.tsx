'use client';

/**
 * 🛡️ AdaptiveAuthProvider - مزود سياق المصادقة التكيفية
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { RiskAssessment, StepUpMethod, LoginContext } from '@/lib/security/adaptive/types';
import { StepUpAuthModal } from './StepUpAuthModal';
import { logger } from '@/lib/logger';

interface AdaptiveAuthContextType {
  // State
  isStepUpRequired: boolean;
  currentRiskAssessment: RiskAssessment | null;
  
  // Actions
  evaluateRisk: (context: LoginContext) => Promise<RiskAssessment>;
  requestStepUp: (
    assessment: RiskAssessment,
    methods: StepUpMethod[],
    userInfo: { email?: string; phone?: string }
  ) => Promise<boolean>;
  clearStepUp: () => void;
}

const AdaptiveAuthContext = createContext<AdaptiveAuthContextType | null>(null);

interface AdaptiveAuthProviderProps {
  children: ReactNode;
}

export function AdaptiveAuthProvider({ children }: AdaptiveAuthProviderProps) {
  const [isStepUpRequired, setIsStepUpRequired] = useState(false);
  const [currentRiskAssessment, setCurrentRiskAssessment] = useState<RiskAssessment | null>(null);
  const [stepUpMethods, setStepUpMethods] = useState<StepUpMethod[]>([]);
  const [userInfo, setUserInfo] = useState<{ email?: string; phone?: string }>({});
  const [resolveStepUp, setResolveStepUp] = useState<((value: boolean) => void) | null>(null);

  // Evaluate risk for login context
  const evaluateRisk = useCallback(async (context: LoginContext): Promise<RiskAssessment> => {
    try {
      const response = await fetch('/api/auth/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate risk');
      }

      const assessment = await response.json();
      setCurrentRiskAssessment(assessment);
      return assessment;
    } catch (error) {
      logger.error('Risk evaluation error:', error);
      // Return default low risk on error
      const defaultAssessment: RiskAssessment = {
        score: 0,
        level: 'low',
        signals: {
          geo: { isNewCountry: false, isNewCity: false, isImpossibleTravel: false },
          device: {
            isNewDevice: false,
            fingerprintChanged: false,
            isEmulator: false,
            isRooted: false,
            browserChanged: false,
            osChanged: false,
            isTrustedDevice: true,
          },
          timing: {
            isUnusualTime: false,
            rapidAttempts: false,
            attemptCount: 0,
            isOutsideNormalHours: false,
          },
          network: {
            isTorOrVPN: false,
            isDataCenter: false,
            isKnownBot: false,
            isKnownMaliciousIP: false,
            isProxy: false,
            asnRisk: 'low',
          },
          behavioral: {
            typingPatternAnomaly: false,
            mousePatternAnomaly: false,
            navigationAnomaly: false,
            sessionAnomaly: false,
          },
        },
        reasons: [],
        action: 'allow',
        sessionId: `error_${Date.now()}`,
        timestamp: new Date(),
      };
      setCurrentRiskAssessment(defaultAssessment);
      return defaultAssessment;
    }
  }, []);

  // Request step-up authentication
  const requestStepUp = useCallback((
    assessment: RiskAssessment,
    methods: StepUpMethod[],
    info: { email?: string; phone?: string }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setCurrentRiskAssessment(assessment);
      setStepUpMethods(methods);
      setUserInfo(info);
      setIsStepUpRequired(true);
      setResolveStepUp(() => resolve);
    });
  }, []);

  // Clear step-up state
  const clearStepUp = useCallback(() => {
    setIsStepUpRequired(false);
    setCurrentRiskAssessment(null);
    setStepUpMethods([]);
    setUserInfo({});
    resolveStepUp?.(false);
    setResolveStepUp(null);
  }, [resolveStepUp]);

  // Handle step-up success
  const handleStepUpSuccess = useCallback(() => {
    resolveStepUp?.(true);
    setIsStepUpRequired(false);
    setResolveStepUp(null);
  }, [resolveStepUp]);

  return (
    <AdaptiveAuthContext.Provider
      value={{
        isStepUpRequired,
        currentRiskAssessment,
        evaluateRisk,
        requestStepUp,
        clearStepUp,
      }}
    >
      {children}
      
      {/* Step-Up Modal */}
      {currentRiskAssessment && (
        <StepUpAuthModal
          isOpen={isStepUpRequired}
          onClose={clearStepUp}
          onSuccess={handleStepUpSuccess}
          riskAssessment={currentRiskAssessment}
          availableMethods={stepUpMethods}
          userEmail={userInfo.email}
          userPhone={userInfo.phone}
          sessionId={currentRiskAssessment.sessionId}
        />
      )}
    </AdaptiveAuthContext.Provider>
  );
}

// Hook to use adaptive auth
export function useAdaptiveAuth(): AdaptiveAuthContextType {
  const context = useContext(AdaptiveAuthContext);
  if (!context) {
    throw new Error('useAdaptiveAuth must be used within AdaptiveAuthProvider');
  }
  return context;
}

export default AdaptiveAuthProvider;
