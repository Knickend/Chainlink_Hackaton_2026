import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTutorialContext } from './TutorialProvider';

export function CompletionModal() {
  const { isActive, currentStepData, endTutorial } = useTutorialContext();

  // Only show for completion step (no target)
  if (!isActive || currentStepData?.target !== null || currentStepData?.id !== 'completion') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-card border border-border shadow-2xl"
        >
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', damping: 15 }}
              className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"
            >
              <PartyPopper className="w-8 h-8 text-primary" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold mb-2">{currentStepData?.title}</h2>
              <p className="text-muted-foreground mb-6">{currentStepData?.content}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full"
            >
              <Button
                className="w-full gap-2"
                onClick={() => endTutorial(true)}
              >
                <Rocket className="w-4 h-4" />
                Get Started
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
