import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Bug, Lightbulb, X, Paperclip, Image as ImageIcon } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface AttachmentPreview {
  file: File;
  preview: string;
}

export function FeedbackButton() {
  const { user } = useAuth();
  const { isActive: isTutorialActive } = useTutorialContext();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<FeedbackPriority>('medium');
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { submitFeedback, uploadAttachment, isSubmitting } = useFeedback();
  const { toast } = useToast();

  // Show for authenticated users OR during tutorial (to be targetable)
  if (!user && !isTutorialActive) return null;

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      toast({
        title: 'Maximum attachments reached',
        description: `You can only attach up to ${MAX_ATTACHMENTS} images.`,
        variant: 'destructive',
      });
      return;
    }

    const newFiles: AttachmentPreview[] = [];
    
    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a valid image. Only PNG, JPG, and WEBP are allowed.`,
          variant: 'destructive',
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the 5MB limit.`,
          variant: 'destructive',
        });
        continue;
      }

      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setAttachments(prev => [...prev, ...newFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsUploading(true);
      
      // Upload all attachments first
      const uploadedPaths: string[] = [];
      for (const attachment of attachments) {
        const path = await uploadAttachment(attachment.file);
        uploadedPaths.push(path);
      }

      // Submit feedback with attachment paths
      await submitFeedback({
        type,
        title,
        description,
        priority: type === 'bug' ? priority : undefined,
        attachments: uploadedPaths,
      });

      // Cleanup previews
      attachments.forEach(a => URL.revokeObjectURL(a.preview));

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setAttachments([]);
      setOpen(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setType('bug');
    attachments.forEach(a => URL.revokeObjectURL(a.preview));
    setAttachments([]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Screenshots (optional)</Label>
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageIcon className="w-8 h-8" />
                  <p className="text-sm">
                    Click or drag images here
                  </p>
                  <p className="text-xs">
                    PNG, JPG, WEBP up to 5MB ({attachments.length}/{MAX_ATTACHMENTS})
                  </p>
                </div>
              </div>

              {/* Preview Grid */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={attachment.preview}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-20 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
              <Button type="submit" disabled={isSubmitting || isUploading || !title || !description}>
                {isSubmitting || isUploading ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
