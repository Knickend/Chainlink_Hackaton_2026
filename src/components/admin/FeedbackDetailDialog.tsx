import { useState, useEffect } from 'react';
import { Feedback, FeedbackStatus, FeedbackPriority } from '@/lib/feedback.types';
import { Bug, Lightbulb, Calendar, User, X, ZoomIn } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useFeedback } from '@/hooks/useFeedback';

interface FeedbackDetailDialogProps {
  feedback: Feedback | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: { status?: FeedbackStatus; admin_notes?: string; priority?: FeedbackPriority }) => Promise<void>;
  isUpdating?: boolean;
}

const priorityConfig = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', className: 'bg-primary/20 text-primary' },
  high: { label: 'High', className: 'bg-warning/20 text-warning' },
  critical: { label: 'Critical', className: 'bg-destructive/20 text-destructive' },
};

export function FeedbackDetailDialog({
  feedback,
  open,
  onOpenChange,
  onUpdate,
  isUpdating,
}: FeedbackDetailDialogProps) {
  const [status, setStatus] = useState<FeedbackStatus | undefined>();
  const [priority, setPriority] = useState<FeedbackPriority | undefined>();
  const [adminNotes, setAdminNotes] = useState('');
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { getAttachmentUrl } = useFeedback(undefined, true);

  // Load attachment URLs when feedback changes
  useEffect(() => {
    const loadAttachments = async () => {
      if (!feedback?.attachments?.length) {
        setAttachmentUrls([]);
        return;
      }

      try {
        const urls = await Promise.all(
          feedback.attachments.map(path => getAttachmentUrl(path))
        );
        setAttachmentUrls(urls);
      } catch (error) {
        console.error('Error loading attachments:', error);
        setAttachmentUrls([]);
      }
    };

    if (open && feedback) {
      loadAttachments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback?.id, open]);

  // Reset form when feedback changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && feedback) {
      setStatus(feedback.status);
      setPriority(feedback.priority);
      setAdminNotes(feedback.admin_notes || '');
    }
    if (!isOpen) {
      setLightboxImage(null);
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!feedback) return;

    const updates: { status?: FeedbackStatus; admin_notes?: string; priority?: FeedbackPriority } = {};
    
    if (status !== feedback.status) updates.status = status;
    if (adminNotes !== (feedback.admin_notes || '')) updates.admin_notes = adminNotes;
    if (priority !== feedback.priority) updates.priority = priority;

    if (Object.keys(updates).length > 0) {
      await onUpdate(feedback.id, updates);
    }
    
    onOpenChange(false);
  };

  if (!feedback) return null;

  const priorityInfo = priorityConfig[feedback.priority];

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {feedback.type === 'bug' ? (
                <Bug className="w-5 h-5 text-destructive" />
              ) : (
                <Lightbulb className="w-5 h-5 text-warning" />
              )}
              {feedback.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(feedback.created_at), 'MMM d, yyyy h:mm a')}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {feedback.user_id.slice(0, 8)}...
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Description */}
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3">
                {feedback.description}
              </p>
            </div>

            {/* Attachments */}
            {attachmentUrls.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Attachments ({attachmentUrls.length})</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {attachmentUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative group cursor-pointer"
                      onClick={() => setLightboxImage(url)}
                    >
                      <img
                        src={url}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md border"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Priority (for bugs) */}
            {feedback.type === 'bug' && (
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as FeedbackPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as FeedbackStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Admin Notes */}
            <div className="space-y-2">
              <Label htmlFor="admin-notes">Internal Notes</Label>
              <Textarea
                id="admin-notes"
                placeholder="Add internal notes about this feedback..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Dialog */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 bg-black/90">
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Full size attachment"
              className="w-full h-full object-contain max-h-[85vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
