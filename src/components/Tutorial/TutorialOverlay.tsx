import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTutorialContext } from './TutorialProvider';
import { cn } from '@/lib/utils';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TutorialOverlay() {
  const {
    isActive,
    currentStep,
    totalSteps,
    currentStepData,
    nextStep,
    prevStep,
    skipTutorial,
  } = useTutorialContext();

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Find and return a visible element for the tutorial target
  const findVisibleElement = useCallback((target: string): Element | null => {
    const elements = document.querySelectorAll(`[data-tutorial="${target}"]`);
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return el;
      }
    }
    return null;
  }, []);

  const updateTargetPosition = useCallback(() => {
    if (!currentStepData?.target) {
      setTargetRect(null);
      return;
    }

    const element = findVisibleElement(currentStepData.target);
    if (!element) {
      setTargetRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = 8;
    
    // Use viewport coordinates only (position: fixed)
    setTargetRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    // Calculate tooltip position using viewport coordinates
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const margin = 16;

    let top = rect.bottom + margin;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    // Adjust based on position preference
    switch (currentStepData.position) {
      case 'top':
        top = rect.top - tooltipHeight - margin;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - margin;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + margin;
        break;
      default: // bottom
        break;
    }

    // Keep tooltip within viewport (use innerWidth/innerHeight for fixed positioning)
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin));

    setTooltipPosition({ top, left });
  }, [currentStepData, findVisibleElement]);

  // Scroll element into view only when step changes (not on every scroll)
  useEffect(() => {
    if (!isActive || !currentStepData?.target) return;

    const scrollToElement = (attempt = 0) => {
      const element = findVisibleElement(currentStepData.target!);
      if (element) {
        // Check if element is already visible in viewport
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        
        if (!isVisible) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Update position immediately
        updateTargetPosition();
        
        // Update again after scroll settles
        setTimeout(updateTargetPosition, 300);
      } else if (attempt < 5) {
        // Retry with increasing delays for elements that render later
        setTimeout(() => scrollToElement(attempt + 1), 200);
      } else {
        console.warn(`Tutorial element not found: ${currentStepData.target}`);
        setTargetRect(null);
      }
    };

    // Small delay to let DOM update after step change
    const timer = setTimeout(() => scrollToElement(0), 100);
    return () => clearTimeout(timer);
  }, [isActive, currentStepData?.target, findVisibleElement, updateTargetPosition]);

  // Update position on resize and scroll (but don't trigger new scrolls)
  useEffect(() => {
    if (!isActive || !currentStepData?.target) return;

    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);

    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
    };
  }, [isActive, currentStepData?.target, updateTargetPosition]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTutorial();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, skipTutorial]);

  // Don't render for modal steps (welcome/completion handle themselves)
  if (!isActive || !currentStepData?.target) {
    return null;
  }

  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Show loading overlay while finding element
  if (!targetRect) {
    return (
      <motion.div
        key="loading-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-black/75"
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      {/* Single spotlight border that creates the dark overlay via box-shadow */}
      <motion.div
        key={`spotlight-${currentStep}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="fixed z-[91] rounded-lg border-2 border-primary pointer-events-none"
        style={{
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.75), 0 0 20px hsl(var(--primary) / 0.3)',
        }}
      />

      {/* Tooltip */}
      <motion.div
        key={`tooltip-${currentStep}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="fixed z-[92] w-80 p-4 rounded-xl bg-card border border-border shadow-2xl"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Step {currentStep + 1} of {totalSteps}</span>
            <button
              onClick={skipTutorial}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              Skip
            </button>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold mb-2">{currentStepData?.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{currentStepData?.content}</p>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevStep}
            disabled={currentStep === 0}
            className={cn("flex-1", currentStep === 0 && "opacity-50")}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            size="sm"
            onClick={nextStep}
            className="flex-1"
          >
            {currentStep === totalSteps - 2 ? 'Finish' : 'Next'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
