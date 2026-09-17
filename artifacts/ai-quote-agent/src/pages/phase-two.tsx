import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toArray } from '@/lib/utils';
import { Link, useLocation, useParams } from 'wouter';
import {
  AiReviewStatus,
  Priority,
  RequestType,
  getGetAiReviewQueryKey,
  getGetEmailQueryKey,
  getGetMicrosoftConnectQueryKey,
  getGetMicrosoftStatusQueryKey,
  getGetRfqQueryKey,
  getListAiReviewsQueryKey,
  getListEmailsQueryKey,
  getListRfqsQueryKey,
  useApproveAiReview,
  useDisconnectMicrosoft,
  useGetAiReview,
  useGetEmail,
  useGetMicrosoftConnect,
  useGetMicrosoftStatus,
  useGetRfq,
  useListAiReviews,
  useListEmails,
  useProcessEmail,
  useRejectAiReview,
  useReclassifyAiReview,
  useSyncEmails,
  useUpdateAiReview,
} from '@workspace/api-client-react';
import type { EmailDetail } from '@workspace/api-client-react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Link2,
  Paperclip,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  Sparkles,
  Unplug,
  X,
  XCircle,
} from 'lucide-react';
import { ConfidenceBar, LoadingRows, PageHeading, QueryState, SearchField, SectionTitle, StatusBadge } from '@/components/ops-primitives';

function readable(value: string | null | undefined) {
  return (value ?? '—').replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
function pct(value: number | null | undefined) {
  const number = Number(value ?? 0);
  return `${Math.round(number <= 1 ? number * 100 : number)}%`;
}
function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-[10px] font-extrabold transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;
}

export function EmailInboxPageV2() {
  const emails = useListEmails();
  const sync = useSyncEmails();
  const statusQuery = useGetMicrosoftStatus();
  const demoModeEnabled = statusQuery.data?.demoModeEnabled;
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'all' | 'review' | 'processed' | 'new'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      await fetch('/api/emails/demo/seed', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey() });
    } finally {
      setSeeding(false);
    }
  };

  const records = useMemo(() => {
    const all = toArray<typeof emails.data extends Array<infer U> ? U : any>(emails.data);
    return all.filter((email) => {
      const textMatch = `${email.sender} ${email.subject} ${email.senderEmail}`.toLowerCase().includes(search.toLowerCase());
      const tabMatch = tab === 'all' || (tab === 'review' ? email.status === 'PENDING_REVIEW' : tab === 'processed' ? email.status === 'RFQ_CREATED' : email.aiStatus === 'PROCESSING');
      return textMatch && tabMatch;
    });
  }, [emails.data, search, tab]);
  const active = records.find((email) => email.id === selected) ?? records[0];
  const doSync = () => sync.mutate(undefined, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey() }) });
  if (emails.isLoading) return <><PageHeading eyebrow="Command center / intake" title="Email inbox" /><LoadingRows count={7} /></>;
  if (emails.isError) return <><PageHeading eyebrow="Command center / intake" title="Email inbox" /><QueryState error onRetry={() => emails.refetch()} /></>;
  return <div className="fade-up">
    <PageHeading eyebrow="Command center / intake" title="Email inbox" description="Customer traffic, staged for classification and RFQ creation." action={<div className="flex items-center gap-2">
      {demoModeEnabled && (
        <>
          <div className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-indigo-700">Demo Mode</div>
          <Button data-testid="button-seed-demo" onClick={seedDemo} disabled={seeding} className="border border-indigo-200 bg-indigo-50 text-indigo-700">
            {seeding ? 'Loading...' : 'Load Demo Emails'}
          </Button>
        </>
      )}
      <Button data-testid="button-sync-emails" onClick={doSync} disabled={sync.isPending} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><RefreshCw size={13} className={sync.isPending ? 'animate-spin' : ''} /> {sync.isPending ? 'Syncing' : 'Sync inbox'}</Button>
    </div>} />
    {sync.data && <div data-testid="status-email-sync" className="mb-5 flex items-center gap-2 rounded-md border border-[hsl(var(--chart-3)/.28)] bg-[hsl(var(--chart-3)/.08)] px-3 py-2 text-[11px] text-[hsl(var(--foreground)/.78)]"><CheckCircle2 size={14} className="text-[hsl(var(--chart-3))]" /> {sync.data.message} <span className="mono ml-auto text-[9px]">{sync.data.mode === 'DEVELOPMENT' ? 'DEVELOPMENT MODE' : `${sync.data.synced} synced`}</span></div>}
    {sync.isError && <div role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">Inbox sync could not complete. Try again when the connection is available.</div>}
    <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-3 md:flex-row md:items-center"><div className="flex gap-1 overflow-x-auto">{(['all', 'review', 'processed', 'new'] as const).map((item) => <button key={item} data-testid={`tab-email-${item}`} onClick={() => setTab(item)} className={`whitespace-nowrap rounded px-3 py-2 text-[10px] font-extrabold uppercase tracking-[.08em] ${tab === item ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`}>{item === 'review' ? 'Needs review' : readable(item)}</button>)}</div><div className="md:ml-auto md:w-72"><SearchField value={search} onChange={setSearch} placeholder="Search sender or subject" /></div></div>
      <div className="grid min-h-[600px] lg:grid-cols-[minmax(270px,.72fr)_minmax(0,1.28fr)]">
        <div className="border-b border-[hsl(var(--border))] lg:border-b-0 lg:border-r"><div className="border-b border-[hsl(var(--border))] px-4 py-3 text-[10px] text-[hsl(var(--muted-foreground))]">{records.length} messages in view</div>{records.length === 0 ? <QueryState empty label="No messages in this view" /> : records.map((email) => <button key={email.id} data-testid={`button-email-row-${email.id}`} onClick={() => setSelected(email.id)} className={`w-full border-b border-[hsl(var(--border)/.7)] px-4 py-4 text-left ${active?.id === email.id ? 'bg-[hsl(var(--muted)/.7)]' : 'hover:bg-[hsl(var(--muted)/.35)]'}`}><div className="flex items-center justify-between gap-3"><span className="truncate text-[11px] font-extrabold">{email.sender}</span><span className="mono shrink-0 text-[9px] text-[hsl(var(--muted-foreground))]">{email.receivedAt}</span></div><div className="mt-1 truncate text-[11px] text-[hsl(var(--muted-foreground))]">{email.subject}</div><div className="mt-3 flex items-center gap-2"><StatusBadge value={email.aiStatus} /><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">{pct(email.confidence)}</span></div></button>)}</div>
        <div className="p-5 md:p-7">{active ? <EmailPreview email={active} onOpen={() => setLocation(`/emails/${active.id}`)} /> : <QueryState empty label="Select an inbound message" />}</div>
      </div>
    </div>
  </div>;
}

function EmailPreview({ email, onOpen }: { email: { id: number; sender: string; senderEmail: string; subject: string; receivedAt: string; aiStatus: string; requestType: string; confidence: number; status: string }; onOpen: () => void }) {
  return <div data-testid={`panel-email-preview-${email.id}`}><div className="mb-6 flex items-start justify-between gap-4"><div><div className="eyebrow mb-3">Inbound message / {formatDate(email.receivedAt)}</div><h2 className="text-[18px] font-extrabold tracking-[-.03em]">{email.subject}</h2><div className="mt-2 flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[hsl(var(--primary))] text-[10px] font-bold text-[hsl(var(--primary-foreground))]">{email.sender.slice(0, 2).toUpperCase()}</span>{email.sender} · {email.senderEmail}</div></div><StatusBadge value={email.status} /></div><div className="soft-grid rounded-md border border-[hsl(var(--border))] p-5"><p className="text-[12px] leading-7 text-[hsl(var(--foreground)/.82)]">Hello team,<br /><br />Please review the attached requirement and confirm availability, lead time and pricing for the requested part. We would appreciate your response at the earliest opportunity.<br /><br />Regards,<br />{email.sender}</p></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><div><div className="eyebrow mb-2">AI status</div><StatusBadge value={email.aiStatus} /></div><div><div className="eyebrow mb-2">Classification</div><div className="text-[12px] font-bold">{readable(email.requestType)}</div></div><div><div className="eyebrow mb-2">Confidence</div><ConfidenceBar value={email.confidence} /></div></div><Button data-testid={`button-open-email-${email.id}`} onClick={onOpen} className="mt-7 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--primary))]">Open source email <ArrowRight size={13} /></Button></div>;
}

export function EmailDetailPage() {
  const params = useParams<{ emailId: string }>();
  const id = Number(params.emailId);
  const email = useGetEmail(id, { query: { enabled: Number.isFinite(id), queryKey: getGetEmailQueryKey(id) } });
  const process = useProcessEmail();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const detail = email.data;
  const onProcess = () => process.mutate({ emailId: id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetEmailQueryKey(id) }); queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey() }); queryClient.invalidateQueries({ queryKey: getListRfqsQueryKey() }); } });
  if (email.isLoading) return <><PageHeading eyebrow="Source email" title="Loading message" /><LoadingRows count={6} /></>;
  if (email.isError || !detail) return <><PageHeading eyebrow="Source email" title="Message unavailable" /><QueryState error onRetry={() => email.refetch()} /></>;
  return <div className="fade-up"><button data-testid="button-back-email-inbox" onClick={() => setLocation('/email-inbox')} className="mb-6 inline-flex items-center gap-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"><ArrowLeft size={14} /> Back to email inbox</button><PageHeading eyebrow={`Source email / ${detail.id}`} title={detail.subject} description={`${detail.sender} · received ${formatDate(detail.receivedAt)}`} action={<div className="flex items-center gap-2"><StatusBadge value={detail.processingStatus} /><Button data-testid="button-process-email" onClick={onProcess} disabled={process.isPending || detail.processingStatus === 'PROCESSING'} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Sparkles size={13} /> {process.isPending ? 'Processing' : 'Process email'}</Button></div>} />{process.data && <div data-testid="status-email-processed" className="mb-5 rounded-md border border-[hsl(var(--chart-3)/.3)] bg-[hsl(var(--chart-3)/.08)] px-4 py-3 text-[11px] font-semibold">{process.data.message}</div>}{detail.analysis?.developmentMode && <DevModeBanner label="AI classification is running in development mode. No external provider call was made." />}{process.isError && <div role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[11px] font-semibold text-red-700">Processing failed. Review the connection status and retry.</div>}<div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><section className="space-y-5"><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="eyebrow">Message body</div><div className="mono text-[9px] text-[hsl(var(--muted-foreground))]">{detail.senderEmail}</div></div><div className="whitespace-pre-wrap text-[12px] leading-7 text-[hsl(var(--foreground)/.84)]">{detail.bodyText || 'No plain-text body was captured for this message.'}</div></div><div><SectionTitle title="Attachments" meta={`${detail.attachments?.length ?? 0} files`} />{detail.attachments?.length ? <div className="space-y-2">{detail.attachments.map((attachment) => <div key={attachment.id} data-testid={`card-attachment-${attachment.id}`} className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3"><div className="grid h-9 w-9 place-items-center rounded bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><Paperclip size={15} /></div><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-bold">{attachment.fileName}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">{attachment.contentType} · {Math.ceil(attachment.fileSize / 1024)} KB</div></div><StatusBadge value={attachment.processingStatus} /></div>)}</div> : <QueryState empty label="No attachments on this message" />}</div></section><aside className="space-y-5"><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="eyebrow mb-4">Routing context</div><div className="space-y-4"><Info label="From" value={detail.senderEmail} /><Info label="To" value={detail.recipient} /><Info label="CC" value={detail.cc || 'None'} /><Info label="Classification" value={readable(detail.emailClassification)} /><Info label="Queue status" value={readable(detail.status)} /></div></div>{detail.linkedRfq && <div className="rounded-lg border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.08)] p-5"><div className="eyebrow mb-2">Linked RFQ</div><div className="mono text-[13px] font-bold">{detail.linkedRfq.rfqNumber}</div><Link data-testid={`link-linked-rfq-${detail.linkedRfq.id}`} href={`/rfqs/${detail.linkedRfq.id}`} className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[hsl(var(--primary))]">Open RFQ <ChevronRight size={13} /></Link></div>}{detail.analysis && <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="mb-3 flex items-center gap-2"><Sparkles size={14} className="text-[hsl(var(--accent-foreground))]" /><span className="text-[12px] font-extrabold">Analysis signal</span></div><ConfidenceBar value={detail.analysis.confidenceScore} /><p className="mt-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{detail.analysis.reasoningSummary}</p></div>}</aside></div></div>;
}

export function AiReviewPageV2() {
  const reviews = useListAiReviews();
  const approve = useApproveAiReview();
  const reject = useRejectAiReview();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const pending = approve.isPending || reject.isPending;
  const act = (rfqId: number, action: 'approve' | 'reject') => {
    const mutation = action === 'approve' ? approve : reject;
    mutation.mutate({ rfqId }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAiReviewsQueryKey() }); queryClient.invalidateQueries({ queryKey: getListRfqsQueryKey() }); } });
  };
  if (reviews.isLoading) return <><PageHeading eyebrow="Command center / intelligence" title="AI review queue" /><LoadingRows count={5} /></>;
  if (reviews.isError) return <><PageHeading eyebrow="Command center / intelligence" title="AI review queue" /><QueryState error onRetry={() => reviews.refetch()} /></>;
  const rows = toArray<typeof reviews.data extends Array<infer U> ? U : any>(reviews.data);
  return <div className="fade-up"><PageHeading eyebrow="Command center / intelligence" title="AI review queue" description="Low-confidence classifications waiting for an operator decision." action={<div className="flex items-center gap-2 rounded-md border border-[hsl(var(--accent)/.4)] bg-[hsl(var(--accent)/.1)] px-3 py-2 text-[10px] font-bold text-[hsl(var(--primary))]"><Sparkles size={14} /> Human-in-the-loop</div>} /><div className="mb-5 grid gap-3 sm:grid-cols-3"><ReviewStat label="Needs review" value={String(rows.filter((row) => row.status === AiReviewStatus.NEEDS_REVIEW).length)} /><ReviewStat label="Average confidence" value={rows.length ? pct(rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length) : '—'} /><ReviewStat label="Decisions today" value={String(rows.filter((row) => row.status !== AiReviewStatus.NEEDS_REVIEW).length)} /></div>{rows.length === 0 ? <QueryState empty label="The AI review queue is clear" /> : <div className="space-y-3">{rows.map((review) => <div key={review.id} data-testid={`card-review-queue-${review.id}`} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="flex flex-col gap-5 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><div className="mb-2 flex items-center gap-3"><span className="mono text-[11px] font-medium text-[hsl(var(--primary))]">{review.rfqNumber}</span><StatusBadge value={review.status} /></div><div className="text-[14px] font-extrabold">{review.customer}</div><p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{review.reason}</p></div><div className="flex shrink-0 items-center gap-6"><div><div className="eyebrow mb-2">Classification</div><div className="text-[11px] font-bold">{readable(review.classification)}</div></div><div><div className="eyebrow mb-2">Confidence</div><ConfidenceBar value={review.confidence} /></div></div><div className="flex shrink-0 flex-wrap gap-2 xl:w-[310px] xl:justify-end"><Button data-testid={`button-open-review-${review.id}`} onClick={() => setLocation(`/ai-review/${review.rfqId}`)} className="border border-[hsl(var(--border))] text-[hsl(var(--primary))]">Open detail <ArrowRight size={13} /></Button><Button data-testid={`button-approve-review-${review.id}`} disabled={pending} onClick={() => act(review.rfqId, 'approve')} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Check size={13} /> Approve</Button><Button data-testid={`button-reject-review-${review.id}`} disabled={pending} onClick={() => act(review.rfqId, 'reject')} className="border border-red-200 bg-red-50 text-red-700"><X size={13} /> Reject</Button></div></div></div>)}</div>}</div>;
}

function ReviewStat({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"><div className="eyebrow mb-3">{label}</div><div className="mono text-[22px] font-medium tracking-[-.06em]">{value}</div></div>; }
function Info({ label, value }: { label: string; value: string | null | undefined }) { return <div><div className="eyebrow mb-1.5">{label}</div><div className="break-words text-[11px] font-bold">{value || '—'}</div></div>; }
function DevModeBanner({ label }: { label: string }) { return <div data-testid="status-development-ai" className="mb-5 flex items-center gap-2 rounded-md border border-[hsl(var(--accent)/.4)] bg-[hsl(var(--accent)/.1)] px-4 py-3 text-[11px] font-semibold text-[hsl(var(--primary))]"><Server size={14} /> {label}</div>; }

export function AiReviewDetailPage() {
  const params = useParams<{ rfqId: string }>();
  const id = Number(params.rfqId);
  const review = useGetAiReview(id, { query: { enabled: Number.isFinite(id), queryKey: getGetAiReviewQueryKey(id) } });
  const approve = useApproveAiReview();
  const reject = useRejectAiReview();
  const reclassify = useReclassifyAiReview();
  const update = useUpdateAiReview();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  type ReviewForm = { customer: string; partNumber: string; description: string; quantity: string; condition: string; requestType: typeof RequestType[keyof typeof RequestType]; priority: typeof Priority[keyof typeof Priority]; notes: string };
  const [form, setForm] = useState<ReviewForm>({ customer: '', partNumber: '', description: '', quantity: '', condition: '', requestType: RequestType.UNKNOWN, priority: Priority.MEDIUM, notes: '' });
  useEffect(() => {
    const detail = review.data;
    if (!detail) return;
    const extracted = detail.analysis?.extractedData ?? {};
    setForm({ customer: String(extracted.customer ?? detail.customer ?? ''), partNumber: String(extracted.partNumber ?? ''), description: String(extracted.description ?? ''), quantity: String(extracted.quantity ?? ''), condition: String(extracted.condition ?? ''), requestType: detail.analysis?.requestType ?? detail.classification, priority: (extracted.priority as typeof Priority[keyof typeof Priority]) ?? Priority.MEDIUM, notes: String(extracted.notes ?? '') });
  }, [review.data]);
  const setField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const invalidate = () => { queryClient.invalidateQueries({ queryKey: getGetAiReviewQueryKey(id) }); queryClient.invalidateQueries({ queryKey: getListAiReviewsQueryKey() }); queryClient.invalidateQueries({ queryKey: getListRfqsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetRfqQueryKey(id) }); };
  const run = (kind: 'approve' | 'reject' | 'reclassify' | 'update') => {
    if (kind === 'approve') approve.mutate({ rfqId: id }, { onSuccess: invalidate });
    if (kind === 'reject') reject.mutate({ rfqId: id }, { onSuccess: invalidate });
    if (kind === 'reclassify') reclassify.mutate({ rfqId: id, data: { requestType: form.requestType, notes: form.notes } }, { onSuccess: invalidate });
    if (kind === 'update') update.mutate({ rfqId: id, data: { customer: form.customer, partNumber: form.partNumber, description: form.description, quantity: Number(form.quantity) || undefined, condition: form.condition, requestType: form.requestType, priority: form.priority, notes: form.notes } }, { onSuccess: invalidate });
  };
  if (review.isLoading) return <><PageHeading eyebrow="AI review record" title="Loading review" /><LoadingRows count={7} /></>;
  if (review.isError || !review.data) return <><PageHeading eyebrow="AI review record" title="Review unavailable" /><QueryState error onRetry={() => review.refetch()} /></>;
  const detail = review.data;
  const busy = approve.isPending || reject.isPending || reclassify.isPending || update.isPending;
  return <div className="fade-up"><button data-testid="button-back-review-queue" onClick={() => setLocation('/ai-review')} className="mb-6 inline-flex items-center gap-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"><ArrowLeft size={14} /> Back to review queue</button><PageHeading eyebrow={`AI review / ${detail.rfqNumber}`} title={detail.emailSubject} description={`${detail.customer} · created ${formatDate(detail.createdAt)}`} action={<StatusBadge value={detail.status} />} />{detail.analysis.developmentMode && <DevModeBanner label="Development AI active — confidence and reasoning are simulated for this environment." />}<div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><section className="space-y-5"><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="eyebrow mb-3">Original email</div><div className="mb-4 text-[14px] font-extrabold">{detail.originalEmail.subject}</div><div className="mb-5 text-[10px] text-[hsl(var(--muted-foreground))]">{detail.originalEmail.sender} · {detail.originalEmail.senderEmail}</div><div className="max-h-[320px] overflow-auto whitespace-pre-wrap text-[11px] leading-6 text-[hsl(var(--foreground)/.78)]">{detail.originalEmail.bodyText || 'Original message text unavailable.'}</div><Link data-testid="link-open-source-email" href={`/emails/${detail.originalEmail.id}`} className="mt-5 inline-flex items-center gap-1 text-[10px] font-bold text-[hsl(var(--primary))]">Open full source email <ChevronRight size={13} /></Link></div><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="mb-4 flex items-center justify-between"><div className="eyebrow">Reasoning summary</div><ConfidenceBar value={detail.analysis.confidenceScore} /></div><p className="text-[12px] leading-6 text-[hsl(var(--muted-foreground))]">{detail.analysis.reasoningSummary}</p><div className="mt-5 flex flex-wrap gap-2"><StatusBadge value={detail.analysis.emailClassification} /><StatusBadge value={detail.analysis.requestType} /><span className="rounded border border-[hsl(var(--border))] px-2 py-1 text-[9px] font-bold uppercase">{detail.analysis.requiresHumanReview ? 'Human review required' : 'Auto eligible'}</span></div></div></section><section className="space-y-5"><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="mb-5 flex items-center justify-between"><div><div className="eyebrow mb-2">Extracted RFQ fields</div><div className="text-[11px] text-[hsl(var(--muted-foreground))]">Edit before approving this record.</div></div><Button data-testid="button-save-review-fields" disabled={busy} onClick={() => run('update')} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Save size={13} /> Save fields</Button></div><div className="grid gap-4 sm:grid-cols-2">{([['customer', 'Customer'], ['partNumber', 'Part number'], ['quantity', 'Quantity'], ['condition', 'Condition']] as const).map(([key, label]) => <label key={key} className="block"><span className="eyebrow mb-2 block">{label}</span><input data-testid={`input-review-${key}`} value={form[key]} onChange={(event) => setField(key, event.target.value)} className="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-[11px] outline-none focus:border-[hsl(var(--accent))]" /></label>)}<label className="block"><span className="eyebrow mb-2 block">Request type</span><select data-testid="select-review-request-type" value={form.requestType} onChange={(event) => setField('requestType', event.target.value)} className="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-[11px]">{Object.values(RequestType).map((value) => <option key={value} value={value}>{readable(value)}</option>)}</select></label><label className="block"><span className="eyebrow mb-2 block">Priority</span><select data-testid="select-review-priority" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as typeof Priority[keyof typeof Priority] }))} className="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-[11px]">{Object.values(Priority).map((value) => <option key={value} value={value}>{readable(value)}</option>)}</select></label><label className="block sm:col-span-2"><span className="eyebrow mb-2 block">Description</span><textarea data-testid="input-review-description" value={form.description} onChange={(event) => setField('description', event.target.value)} rows={3} className="w-full resize-y rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-[11px] outline-none focus:border-[hsl(var(--accent))]" /></label><label className="block sm:col-span-2"><span className="eyebrow mb-2 block">Operator notes</span><textarea data-testid="input-review-notes" value={form.notes} onChange={(event) => setField('notes', event.target.value)} rows={2} className="w-full resize-y rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-[11px] outline-none focus:border-[hsl(var(--accent))]" /></label></div></div><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="eyebrow mb-4">Decision</div><div className="flex flex-wrap gap-2"><Button data-testid="button-approve-review-detail" disabled={busy} onClick={() => run('approve')} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Check size={13} /> Approve RFQ</Button><Button data-testid="button-reclassify-review-detail" disabled={busy} onClick={() => run('reclassify')} className="border border-[hsl(var(--border))] text-[hsl(var(--primary))]"><RefreshCw size={13} /> Reclassify</Button><Button data-testid="button-reject-review-detail" disabled={busy} onClick={() => run('reject')} className="border border-red-200 bg-red-50 text-red-700"><XCircle size={13} /> Reject as non-RFQ</Button></div>{busy && <div className="mt-3 text-[10px] text-[hsl(var(--muted-foreground))]">Saving operator decision…</div>}</div><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="eyebrow mb-4">Review history</div>{detail.reviewHistory.length ? <div className="space-y-3">{detail.reviewHistory.map((entry) => <div key={entry.id} className="flex gap-3 border-l-2 border-[hsl(var(--accent))] pl-3"><div><div className="text-[11px] font-bold">{readable(entry.action)}</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{formatDate(entry.createdAt)} · {readable(entry.previousClassification)} → {readable(entry.newClassification)}</div>{entry.notes && <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{entry.notes}</div>}</div></div>)}</div> : <QueryState empty label="No operator decisions recorded yet" />}</div></section></div></div>;
}

export function RfqDetailPageV2() {
  const params = useParams<{ rfqId: string }>();
  const id = Number(params.rfqId);
  const rfq = useGetRfq(id, { query: { enabled: Number.isFinite(id), queryKey: getGetRfqQueryKey(id) } });
  const [, setLocation] = useLocation();
  if (rfq.isLoading) return <><PageHeading eyebrow="RFQ record" title="Loading request" /><LoadingRows count={6} /></>;
  if (rfq.isError || !rfq.data) return <><PageHeading eyebrow="RFQ record" title="Request unavailable" /><QueryState error onRetry={() => rfq.refetch()} /></>;
  const item = rfq.data;
  const extended = item as typeof item & { sourceEmail?: EmailDetail | null; analysis?: { reasoningSummary?: string; confidenceScore?: number; extractedData?: Record<string, unknown> } | null; reviewHistory?: Array<{ id: number; action: string; createdAt: string; notes: string }> };
  return <div className="fade-up"><button data-testid="button-back-rfq-record" onClick={() => setLocation('/rfq-inbox')} className="mb-6 inline-flex items-center gap-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={14} /> Back to RFQ inbox</button><PageHeading eyebrow={`RFQ record / ${item.rfqNumber}`} title={item.customerCompany} description={`${item.partNumber} · received ${item.age}`} action={<StatusBadge value={item.status} />} /><div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><section className="space-y-5"><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="eyebrow mb-3">Request brief</div><h2 className="text-[17px] font-extrabold">{item.emailSubject}</h2><p className="mt-4 text-[13px] leading-7 text-[hsl(var(--muted-foreground))]">{item.description}</p><div className="mt-6 grid gap-4 border-t border-[hsl(var(--border))] pt-5 sm:grid-cols-3"><Info label="Part number" value={item.partNumber} /><Info label="Quantity" value={String(item.quantity)} /><Info label="Aircraft" value={item.aircraft} /></div></div><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="eyebrow mb-2">Operator notes</div><p className="text-[11px] leading-6 text-[hsl(var(--muted-foreground))]">{item.notes || 'No operator notes have been added to this record.'}</p></div>{extended.sourceEmail && <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="mb-3 flex items-center justify-between"><div className="eyebrow">Source email</div><Link data-testid="link-rfq-source-email" href={`/emails/${extended.sourceEmail.id}`} className="text-[10px] font-bold text-[hsl(var(--primary))]">Open message <ArrowRight size={12} className="ml-1 inline" /></Link></div><div className="text-[12px] font-bold">{extended.sourceEmail.subject}</div><div className="mt-2 line-clamp-4 whitespace-pre-wrap text-[11px] leading-6 text-[hsl(var(--muted-foreground))]">{extended.sourceEmail.bodyText}</div></div>}{extended.analysis && <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="eyebrow mb-3">AI analysis</div><ConfidenceBar value={extended.analysis.confidenceScore ?? item.confidence} /><p className="mt-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{extended.analysis.reasoningSummary || 'No reasoning summary was returned.'}</p></div>}</section><aside className="space-y-5"><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="eyebrow mb-4">Request metadata</div><div className="space-y-4"><Info label="Customer" value={item.customer} /><Info label="Sender" value={item.sender} /><Info label="Source" value={readable(item.source)} /><Info label="Request type" value={readable(item.requestType)} /><Info label="Priority" value={readable(item.priority)} /></div></div>{extended.analysis?.extractedData && <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="eyebrow mb-4">Extracted items</div><div className="space-y-3">{Object.entries(extended.analysis.extractedData).slice(0, 8).map(([key, value]) => <Info key={key} label={readable(key)} value={String(value ?? '—')} />)}</div></div>}{extended.reviewHistory && <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="eyebrow mb-4">Review history</div>{extended.reviewHistory.length ? extended.reviewHistory.map((entry) => <div key={entry.id} className="mb-3 border-l-2 border-[hsl(var(--accent))] pl-3"><div className="text-[11px] font-bold">{readable(entry.action)}</div><div className="text-[10px] text-[hsl(var(--muted-foreground))]">{formatDate(entry.createdAt)}</div></div>) : <div className="text-[11px] text-[hsl(var(--muted-foreground))]">No review history available.</div>}</div>}</aside></div></div>;
}

export function SettingsPage() {
  const [location, setLocation] = useLocation();
  const status = useGetMicrosoftStatus();
  const connect = useGetMicrosoftConnect({ query: { enabled: false, queryKey: getGetMicrosoftConnectQueryKey() } });
  const disconnect = useDisconnectMicrosoft();
  const queryClient = useQueryClient();
  const connected = status.data;
  const integrations = location === '/settings/integrations';
  const refresh = () => queryClient.invalidateQueries({ queryKey: getGetMicrosoftStatusQueryKey() });
  const connectMicrosoft = () => { window.location.href = '/api/integrations/microsoft/connect'; };
  const disconnectMicrosoft = () => disconnect.mutate(undefined, { onSuccess: refresh });
  
  const [seeding, setSeeding] = useState(false);
  const seedDemo = async () => {
    setSeeding(true);
    try {
      await fetch('/api/emails/demo/seed', { method: 'POST' });
      alert("Demo emails seeded successfully.");
    } catch {
      alert("Failed to seed demo emails.");
    } finally {
      setSeeding(false);
    }
  };

  return <div className="fade-up"><PageHeading eyebrow="Administration" title={integrations ? 'Integrations' : 'Settings'} description="Connection health and operator preferences for the quote agent." /><div className="mb-6 flex gap-1 border-b border-[hsl(var(--border))]"><button data-testid="tab-settings-general" onClick={() => setLocation('/settings')} className={`px-3 py-3 text-[10px] font-extrabold uppercase tracking-[.1em] ${!integrations ? 'border-b-2 border-[hsl(var(--accent))] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>Workspace</button><button data-testid="tab-settings-integrations" onClick={() => setLocation('/settings/integrations')} className={`px-3 py-3 text-[10px] font-extrabold uppercase tracking-[.1em] ${integrations ? 'border-b-2 border-[hsl(var(--accent))] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>Integrations</button></div>{integrations ? <div className="grid gap-5 lg:grid-cols-2"><IntegrationCard icon={<Cloud size={18} />} title="Microsoft 365" description="Mailbox ingestion through Microsoft Graph." connected={connected?.connected ?? false} configured={connected?.configured ?? false} development={connected?.developmentMode ?? false} detail={connected?.mailbox ? `Mailbox: ${connected.mailbox}` : connected?.message} action={connected?.connected ? <Button data-testid="button-disconnect-microsoft" disabled={disconnect.isPending} onClick={disconnectMicrosoft} className="border border-red-200 bg-red-50 text-red-700"><Unplug size={13} /> Disconnect</Button> : <Button data-testid="button-connect-microsoft" onClick={connectMicrosoft} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Link2 size={13} /> Connect Microsoft 365</Button>} /><IntegrationCard icon={<Sparkles size={18} />} title="AI classification provider" description="Classification, extraction and confidence reasoning." connected={Boolean(status.data)} configured={Boolean(status.data?.configured)} development={status.data?.developmentMode ?? true} detail={status.data?.developmentMode ? 'Development mode is active. AI output is deterministic for local operations.' : 'Provider connection is available.'} action={<Button data-testid="button-refresh-ai-status" onClick={() => status.refetch()} className="border border-[hsl(var(--border))] text-[hsl(var(--primary))]"><RefreshCw size={13} /> Refresh status</Button>} />{status.data?.demoModeEnabled && <IntegrationCard icon={<Cloud size={18} />} title="Demo Provider" description="Loads mock emails and attachments." connected={true} configured={true} development={true} detail="Demo mode is active in this workspace." action={<Button data-testid="button-seed-demo-integration" disabled={seeding} onClick={seedDemo} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><RefreshCw size={13} className={seeding ? 'animate-spin' : ''} /> {seeding ? 'Loading...' : 'Load Demo Emails'}</Button>} />}</div> : <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="eyebrow mb-3">Workspace profile</div><h2 className="text-[18px] font-extrabold">M International operations</h2><p className="mt-2 text-[12px] leading-6 text-[hsl(var(--muted-foreground))]">A focused workspace for aftermarket operators moving customer email into quotes.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><Info label="Operator role" value="Operations desk" /><Info label="Timezone" value="UTC" /><Info label="Environment" value="Development" /><Info label="Refresh cadence" value="On demand" /></div></div><IntegrationCard icon={<ShieldCheck size={18} />} title="Platform status" description="Current connection signals for this workspace." connected={status.isSuccess} configured={status.data?.configured ?? false} development={status.data?.developmentMode ?? true} detail={status.data?.message ?? 'Checking integration health…'} action={<Button data-testid="button-open-integrations" onClick={() => setLocation('/settings/integrations')} className="border border-[hsl(var(--border))] text-[hsl(var(--primary))]">Manage integrations <ArrowRight size={13} /></Button>} /></div>}</div>;
}

function IntegrationCard({ icon, title, description, connected, configured, development, detail, action }: { icon: ReactNode; title: string; description: string; connected: boolean; configured: boolean; development: boolean; detail?: string | null; action: ReactNode }) {
  return <div data-testid={`card-integration-${title.toLowerCase().replace(/\s+/g, '-')}`} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="mb-5 flex items-start justify-between gap-4"><div className="grid h-10 w-10 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--primary))]">{icon}</div><span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] font-bold uppercase ${connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{connected ? 'Connected' : 'Not connected'}</span></div><h2 className="text-[15px] font-extrabold">{title}</h2><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{description}</p><div className="mt-5 space-y-2 border-t border-[hsl(var(--border))] pt-4"><div className="flex items-center gap-2 text-[10px]"><span className={`h-1.5 w-1.5 rounded-full ${configured ? 'bg-emerald-500' : 'bg-amber-500'}`} /> Configuration {configured ? 'available' : 'required'}</div>{development && <div data-testid={`status-development-${title.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center gap-2 text-[10px] text-[hsl(var(--accent-foreground))]"><AlertCircle size={12} /> Development mode</div>}<div className="text-[10px] leading-5 text-[hsl(var(--muted-foreground))]">{detail || 'No connection message returned.'}</div></div><div className="mt-6">{action}</div></div>;
}