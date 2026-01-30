import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Bug, Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFeedback } from '@/hooks/useFeedback';
import { useAuth } from '@/contexts/AuthContext';
import { FeedbackType, FeedbackPriority } from '@/lib/feedback.types';
import { useTutorialContext } from '@/components/Tutorial/TutorialProvider';

export function FeedbackButton() {
  const { user } = useAuth();
  const { isActive: isTutorialActive } = useTutorialContext();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<FeedbackPriority>('medium');
  const { submitFeedback, isSubmitting } = useFeedback();

  // Show for authenticated users OR during tutorial (to be targetable)
  if (!user && !isTutorialActive) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await submitFeedback({
      type,
      title,
      description,
      priority: type === 'bug' ? priority : undefined,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    setOpen(false);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setType('bug');
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        className="fixed bottom-6 left-6 z-50"
      >
        <Button
          onClick={() => setOpen(true)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow bg-secondary hover:bg-secondary/90"
          data-tutorial="feedback-button"
        >
          <MessageSquarePlus className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* Feedback Dialog */}
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {type === 'bug' ? (
                <Bug className="w-5 h-5 text-destructive" />
              ) : (
                <Lightbulb className="w-5 h-5 text-warning" />
              )}
              Submit Feedback
            </DialogTitle>
            <DialogDescription>
              Help us improve by reporting bugs or suggesting new features.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selection */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'bug' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setType('bug')}
              >
                <Bug className="w-4 h-4" />
                Report Bug
              </Button>
              <Button
                type="button"
                variant={type === 'feature' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setType('feature')}
              >
                <Lightbulb className="w-4 h-4" />
                Suggest Feature
              </Button>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder={type === 'bug' ? 'Brief description of the issue' : 'Feature name or summary'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder={
                  type === 'bug'
                    ? 'Steps to reproduce, expected vs actual behavior...'
                    : 'Describe the feature and how it would help you...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
            </div>

            {/* Priority (only for bugs) */}
            <AnimatePresence>
              {type === 'bug' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as FeedbackPriority)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Minor issue</SelectItem>
                      <SelectItem value="medium">Medium - Affects usage</SelectItem>
                      <SelectItem value="high">High - Major impact</SelectItem>
                      <SelectItem value="critical">Critical - Blocking</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !title || !description}>
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
