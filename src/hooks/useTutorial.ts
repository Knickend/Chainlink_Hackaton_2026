import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { tutorialSteps } from '@/components/Tutorial/tutorialSteps';

export interface TutorialState {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  hasCompletedTutorial: boolean;
  isLoading: boolean;
}

export function useTutorial() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(true); // Default to true to prevent flash
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tutorial completion status from database
  useEffect(() => {
    async function fetchTutorialStatus() {
      if (!user) {
        setIsLoading(false);
        setHasCompletedTutorial(true); // Don't show for non-logged in users
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_completed_tutorial')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching tutorial status:', error);
          setHasCompletedTutorial(true);
        } else if (data) {
          setHasCompletedTutorial(data.has_completed_tutorial ?? false);
          // Auto-start tutorial for new users
          if (!data.has_completed_tutorial) {
            setIsActive(true);
          }
        } else {
          // No profile found, consider tutorial not completed
          setHasCompletedTutorial(false);
          setIsActive(true);
        }
      } catch (err) {
        console.error('Error fetching tutorial status:', err);
        setHasCompletedTutorial(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTutorialStatus();
  }, [user]);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTutorial = useCallback(async (completed: boolean = true) => {
    setIsActive(false);
    setCurrentStep(0);

    if (user && completed) {
      try {
        await supabase
          .from('profiles')
          .update({ has_completed_tutorial: true })
          .eq('user_id', user.id);
        setHasCompletedTutorial(true);
      } catch (err) {
        console.error('Error updating tutorial status:', err);
      }
    }
  }, [user]);

  const nextStep = useCallback(() => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTutorial(true);
    }
  }, [currentStep, endTutorial]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    endTutorial(true);
  }, [endTutorial]);

  return {
    isActive,
    currentStep,
    totalSteps: tutorialSteps.length,
    hasCompletedTutorial,
    isLoading,
    currentStepData: tutorialSteps[currentStep],
    startTutorial,
    endTutorial,
    nextStep,
    prevStep,
    skipTutorial,
  };
}
