import React, { createContext, useContext } from 'react';
import { useTutorial } from '@/hooks/useTutorial';
import { TutorialStep } from './tutorialSteps';

interface TutorialContextValue {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  hasCompletedTutorial: boolean;
  isLoading: boolean;
  currentStepData: TutorialStep | undefined;
  startTutorial: () => void;
  endTutorial: (completed?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const tutorialState = useTutorial();

  return (
    <TutorialContext.Provider value={tutorialState}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorialContext() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorialContext must be used within a TutorialProvider');
  }
  return context;
}
