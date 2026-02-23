import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, FileDown, Send, Clock, MessageSquare, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { StatusBadge, SeverityBadge } from './StatusBadge';
import { PhotoGallery } from './PhotoGallery';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Separator } from '../ui/separator';
import { DamageReport, DamageStatus } from '../../types';
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  CAUSE_LABELS,
  STATUS_LABELS,
} from '../../utils/formatters';
import { useChangeStatus } from '../../hooks/useDamages';
import { addComment, sendEmailReport, downloadPDF } from '../../api/damages';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const STATUS_TRANSITIONS: Record<DamageStatus, DamageStatus[]> = {
  DRAFT: ['REPORTED'],
  REPORTED: ['UNDER_REVIEW', 'CLOSED'],
  UNDER_REVIEW: ['CUSTOMER_NOTIFIED', 'CLAIM_FILED', 'RESOLVED', 'CLOSED'],
  CUSTOMER_NOTIFIED: ['CLAIM_FILED', 'RESOLVED', 'CLOSED'],
  CLAIM_FILED: ['RESOLVED', 'WRITTEN_OFF', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  WRITTEN_OFF: ['CLOSED'],
  CLOSED: [],
};

interface DamageDetailProps {
  damage: DamageReport;
}

export function DamageDetail({ damage }: DamageDetailProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const changeStatus = useChangeStatus();
  const [comment, setComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [showStatusNoteDialog, setShowStatusNoteDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DamageStatus | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState(`Damage Report: ${damage.referenceNumber}`);
  const [emailBody, setEmailBody] = useState('');
  const [emailIncludePhotos, setEmailIncludePhotos] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setAddingComment(true);
    try {
      await addComment(damage.id, comment.trim());
      queryClient.invalidateQueries({ queryKey: ['damage', damage.id] });
      setComment('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const initiateStatusChange = (status: DamageStatus) => {
    setPendingStatus(status);
    setStatusNote('');
    setShowStatusNoteDialog(true);
  };

  const confirmStatusChange = () => {
    if (!pendingStatus) return;
    changeStatus.mutate(
      { id: damage.id, status: pendingStatus, note: statusNote || undefined },
      {
        onSuccess: () => {
          setShowStatusNoteDialog(false);
          setPendingStatus(null);
          setStatusNote('');
        },
      }
    );
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) { toast.error('Recipient email is required'); return; }
    setSendingEmail(true);
    try {
      await sendEmailReport(damage.id, {
        to: emailTo,
        subject: emailSubject,
        body: emailBody,
        includePhotos: emailIncludePhotos,
      });
      toast.success('Email sent successfully');
      setShowEmailDialog(false);
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await downloadPDF(damage.id);
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const nextStatuses = STATUS_TRANSITIONS[damage.status] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/damages')} className="gap-2 w-fit">
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-mono font-bold text-lg">{damage.referenceNumber}</h2>
            <StatusBadge status={damage.status} />
            <SeverityBadge severity={damage.severity} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reported {formatDateTime(damage.dateReported)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)} className="gap-2">
            <Mail className="h-4 w-4" />
            Email Report
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={downloadingPDF} className="gap-2">
            <FileDown className="h-4 w-4" />
            {downloadingPDF ? 'Generating...' : 'Download PDF'}
          </Button>
          {nextStatuses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-2">
                  Update Status
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Change Status To</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {nextStatuses.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => initiateStatusChange(s)}>
                    {STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Damage info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Details */}
          <Card>
            <CardHeader>
              <CardTitle>Damage Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</p>
                  <p className="mt-1 font-medium">{damage.customer?.name}</p>
                  <p className="text-sm text-muted-foreground">{damage.customer?.code}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Product</p>
                  <p className="mt-1 font-medium">{damage.product?.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {damage.product?.sku}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quantity</p>
                  <p className="mt-1 font-medium">{damage.quantity} units</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date of Damage</p>
                  <p className="mt-1 font-medium">{formatDate(damage.dateOfDamage)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cause</p>
                  <p className="mt-1 font-medium">
                    {CAUSE_LABELS[damage.cause]}
                    {damage.causeOther && <span className="text-muted-foreground text-sm block">{damage.causeOther}</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estimated Loss</p>
                  <p className="mt-1 font-medium">{formatCurrency(damage.estimatedLoss)}</p>
                </div>
                {damage.locationInWarehouse && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>
                    <p className="mt-1 font-medium">{damage.locationInWarehouse}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reported By</p>
                  <p className="mt-1 font-medium">
                    {damage.reportedBy?.firstName} {damage.reportedBy?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{damage.reportedBy?.username}</p>
                </div>
                {damage.reviewedBy && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reviewed By</p>
                    <p className="mt-1 font-medium">
                      {damage.reviewedBy.firstName} {damage.reviewedBy.lastName}
                    </p>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm leading-relaxed">{damage.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          {damage.statusHistory && damage.statusHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {damage.statusHistory.map((entry, index) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shrink-0" />
                        {index < (damage.statusHistory?.length ?? 0) - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="pb-3 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.fromStatus && (
                            <StatusBadge status={entry.fromStatus} />
                          )}
                          {entry.fromStatus && <span className="text-muted-foreground text-xs">→</span>}
                          <StatusBadge status={entry.toStatus} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {entry.changedByUser || entry.changedBy} · {formatDateTime(entry.createdAt)}
                        </p>
                        {entry.note && (
                          <p className="text-sm mt-1 text-muted-foreground italic">"{entry.note}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({damage.comments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {damage.comments && damage.comments.length > 0 ? (
                <div className="space-y-3">
                  {damage.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {comment.user?.firstName?.[0]}{comment.user?.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-medium">
                            {comment.user?.firstName} {comment.user?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</p>
                        </div>
                        <p className="text-sm mt-0.5">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              )}

              <Separator />

              <div className="flex gap-2">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="min-h-[80px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleAddComment();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleAddComment}
                disabled={addingComment || !comment.trim()}
                size="sm"
                className="gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                {addingComment ? 'Adding...' : 'Add Comment'}
              </Button>
            </CardContent>
          </Card>

          {/* Email History */}
          {damage.emailExports && damage.emailExports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Email History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {damage.emailExports.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{e.sentTo}</p>
                        <p className="text-muted-foreground text-xs">{e.subject}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDateTime(e.sentAt)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Photos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Photos ({damage.photos?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoGallery photos={damage.photos || []} damageId={damage.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Note Dialog */}
      <Dialog open={showStatusNoteDialog} onOpenChange={setShowStatusNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status to {pendingStatus ? STATUS_LABELS[pendingStatus] : ''}</DialogTitle>
            <DialogDescription>
              Optionally add a note explaining the status change.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Note (optional)</Label>
            <Textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Add a note about this status change..."
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusNoteDialog(false)}>Cancel</Button>
            <Button onClick={confirmStatusChange} disabled={changeStatus.isPending}>
              {changeStatus.isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email Damage Report</DialogTitle>
            <DialogDescription>
              Send this damage report ({damage.referenceNumber}) via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recipient Email *</Label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="customer@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Message (optional)</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Add a message to include in the email..."
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includePhotos"
                checked={emailIncludePhotos}
                onChange={(e) => setEmailIncludePhotos(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="includePhotos">Include photos</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail} className="gap-2">
              <Send className="h-4 w-4" />
              {sendingEmail ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
