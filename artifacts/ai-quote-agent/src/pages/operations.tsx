import { useMemo, useState, type ComponentType } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'wouter';
import {
  AiReviewActionAction,
  getGetRfqQueryKey,
  getListAiReviewsQueryKey,
  Priority,
  RequestType,
  RfqSource,
  RfqStatus,
  useGetDashboard,
  useGetRfq,
  useListAiReviews,
  useListEmails,
  useListRfqs,
  useReviewAi,
} from '@workspace/api-client-react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ExternalLink,
  Inbox,
  Mail,
  MoreHorizontal,
  PackageOpen,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { ConfidenceBar, LoadingRows, MiniArrow, PageHeading, QueryState, SearchField, SectionTitle, StatusBadge, ToneDot, PendingAction } from '@/components/ops-primitives';

function formatMetric(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}
function percent(value: number) {
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}
function readable(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function DashboardPage() {
  const dashboard = useGetDashboard();
  if (dashboard.isLoading) return <><PageHeading eyebrow="Operations / overview" title="Good afternoon, Alex" description="Your operational picture for the current shift." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><LoadingRows count={4} /></div></>;
  if (dashboard.isError || !dashboard.data) return <><PageHeading eyebrow="Operations / overview" title="Operations dashboard" /><QueryState error onRetry={() => dashboard.refetch()} /></>;
  const data = dashboard.data;
  return <div className="fade-up">
    <PageHeading eyebrow="Operations / overview" title="Good afternoon, Alex" description="Your operational picture for the current shift." action={<Link href="/rfq-inbox" data-testid="link-view-queue" className="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2.5 text-[11px] font-extrabold text-[hsl(var(--primary-foreground))] shadow-sm transition-transform hover:-translate-y-0.5">Open RFQ queue <ArrowRight size={14} /></Link>} />
    <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {data.metrics.map((metric, index) => <div key={`${metric.label}-${index}`} data-testid={`card-metric-${index}`} className={`fade-up fade-up-delay-${Math.min(index + 1, 3)} group relative overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_1px_hsl(var(--primary)/.03)]`}>
        <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-[hsl(var(--accent)/.08)] transition-transform group-hover:scale-150" />
        <div className="relative flex items-start justify-between"><span className="eyebrow">{metric.label}</span><TrendingUp size={15} className="text-[hsl(var(--chart-3))]" /></div>
        <div className="relative mt-4 flex items-end justify-between"><div className="mono text-[29px] font-medium tracking-[-.08em]">{formatMetric(metric.value)}</div><span className={`mono rounded px-1.5 py-1 text-[9px] font-medium ${metric.trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{metric.trend >= 0 ? '+' : ''}{metric.trend}%</span></div>
      </div>)}
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
      <section>
        <SectionTitle title="Recent RFQs" meta={`${data.recentRfqs.length} latest`} action={<Link href="/rfq-inbox" data-testid="link-all-rfqs" className="flex items-center gap-1 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">View all <ArrowRight size={13} /></Link>} />
        <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <RfqTable rfqs={data.recentRfqs.slice(0, 6)} compact />
        </div>
      </section>
      <section>
        <SectionTitle title="Workflow pulse" meta="live" />
        <div className="space-y-3">
          {data.workflows.map((workflow) => <div key={workflow.name} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><ToneDot tone={workflow.tone} /><span className="text-[12px] font-bold">{workflow.name}</span></div><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{workflow.active} active</span></div><div className="flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--accent))]" style={{ width: `${workflow.progress}%` }} /></div><span className="mono w-8 text-right text-[10px] font-medium">{workflow.progress}%</span></div><div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">{workflow.total} total requests in flight</div></div>)}
        </div>
      </section>
    </div>
    <section className="mt-8">
      <SectionTitle title="Recent activity" meta="shift log" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.activities.slice(0, 4).map((activity) => <div key={activity.id} data-testid={`activity-${activity.id}`} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"><div className="mb-3 flex items-center justify-between"><ToneDot tone={activity.tone} /><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">{activity.time}</span></div><div className="text-[12px] font-bold">{activity.title}</div><p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{activity.description}</p></div>)}
      </div>
    </section>
  </div>;
}

function RfqTable({ rfqs, compact = false }: { rfqs: Array<{ id: number; rfqNumber: string; customer: string; customerCompany: string; partNumber: string; source: string; requestType: string; confidence: number; priority: string; status: string; createdAt: string; age: string }>; compact?: boolean }) {
  const [, setLocation] = useLocation();
  if (!rfqs.length) return <QueryState empty label="No RFQs match this view" />;
  return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-[hsl(var(--border))] text-[9px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]"><th className="px-4 py-3 font-bold">Request</th><th className="px-4 py-3 font-bold">Customer</th><th className="px-4 py-3 font-bold">Classification</th><th className="px-4 py-3 font-bold">Confidence</th><th className="px-4 py-3 font-bold">Priority</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3" /></tr></thead><tbody>{rfqs.map((rfq) => <tr key={rfq.id} data-testid={`row-rfq-${rfq.id}`} onClick={() => setLocation(`/rfqs/${rfq.id}`)} className="cursor-pointer border-b border-[hsl(var(--border)/.7)] last:border-0 hover:bg-[hsl(var(--muted)/.45)]"><td className="px-4 py-3.5"><div className="mono text-[11px] font-medium text-[hsl(var(--primary))]">{rfq.rfqNumber}</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{rfq.partNumber} · {rfq.age}</div></td><td className="px-4 py-3.5"><div className="text-[11px] font-bold">{rfq.customer}</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{rfq.customerCompany}</div></td><td className="px-4 py-3.5"><div className="text-[10px] font-semibold">{readable(rfq.requestType)}</div><div className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">{rfq.source}</div></td><td className="px-4 py-3.5"><ConfidenceBar value={rfq.confidence} /></td><td className="px-4 py-3.5"><span className={`text-[10px] font-bold uppercase ${rfq.priority === 'URGENT' ? 'text-red-600' : rfq.priority === 'HIGH' ? 'text-amber-600' : 'text-[hsl(var(--muted-foreground))]'}`}>{rfq.priority}</span></td><td className="px-4 py-3.5"><StatusBadge value={rfq.status} /></td><td className="px-4 py-3.5"><MiniArrow /></td></tr>)}</tbody></table>{compact && <div className="border-t border-[hsl(var(--border))] px-4 py-3 text-center text-[10px] text-[hsl(var(--muted-foreground))]">Click a request to open the full operational record</div>}</div>;
}

export function RfqInboxPage() {
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [requestType, setRequestType] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const params = useMemo(() => ({ search: search || undefined, source: source ? source as typeof RfqSource[keyof typeof RfqSource] : undefined, requestType: requestType ? requestType as typeof RequestType[keyof typeof RequestType] : undefined, priority: priority ? priority as typeof Priority[keyof typeof Priority] : undefined, status: status ? status as typeof RfqStatus[keyof typeof RfqStatus] : undefined }), [search, source, requestType, priority, status]);
  const rfqs = useListRfqs(params);
  const hasFilters = Boolean(search || source || requestType || priority || status);
  return <div className="fade-up"><PageHeading eyebrow="Command center / intake" title="RFQ inbox" description="Search, triage and route every request from one operational queue." action={<div className="hidden items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))] sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" /> API connected</div>} /><div className="mb-5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3"><div className="grid gap-2 lg:grid-cols-[1fr_repeat(4,150px)_auto]"><SearchField value={search} onChange={setSearch} /><FilterSelect label="Source" value={source} onChange={setSource} options={Object.values(RfqSource)} /><FilterSelect label="Request type" value={requestType} onChange={setRequestType} options={Object.values(RequestType)} /><FilterSelect label="Priority" value={priority} onChange={setPriority} options={Object.values(Priority)} /><FilterSelect label="Status" value={status} onChange={setStatus} options={Object.values(RfqStatus)} /></div>{hasFilters && <button data-testid="button-clear-filters" onClick={() => { setSearch(''); setSource(''); setRequestType(''); setPriority(''); setStatus(''); }} className="mt-3 text-[10px] font-bold text-[hsl(var(--primary))] hover:underline">Clear all filters</button>}</div><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]"><Inbox size={14} />{rfqs.data ? `${rfqs.data.length} requests` : 'Loading queue'}</div><button data-testid="button-refresh-rfq-list" onClick={() => rfqs.refetch()} className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><RefreshCw size={12} /> Refresh</button></div>{rfqs.isLoading ? <LoadingRows count={7} /> : rfqs.isError ? <QueryState error onRetry={() => rfqs.refetch()} /> : <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]"><RfqTable rfqs={rfqs.data ?? []} /></div>}</div>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="relative"><span className="sr-only">{label}</span><select data-testid={`select-filter-${label.toLowerCase().replace(/\s/g, '-')}`} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full appearance-none rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 pr-8 text-[10px] font-semibold text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))]"><option value="">{label}</option>{options.map((option) => <option key={option} value={option}>{readable(option)}</option>)}</select><SlidersHorizontal size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /></label>;
}

export function RfqDetailPage() {
  const params = useParams<{ rfqId: string }>();
  const id = Number(params.rfqId);
  const [, setLocation] = useLocation();
  const rfq = useGetRfq(id, { query: { enabled: Number.isFinite(id), queryKey: getGetRfqQueryKey(id) } });
  if (rfq.isLoading) return <><PageHeading eyebrow="RFQ record" title="Loading request" /><LoadingRows count={5} /></>;
  if (rfq.isError || !rfq.data) return <><PageHeading eyebrow="RFQ record" title="Request unavailable" /><QueryState error onRetry={() => rfq.refetch()} /></>;
  const item = rfq.data;
  return <div className="fade-up"><button data-testid="button-back-to-rfq-inbox" onClick={() => setLocation('/rfq-inbox')} className="mb-6 inline-flex items-center gap-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"><ArrowLeft size={14} /> Back to RFQ inbox</button><PageHeading eyebrow={`RFQ record / ${item.rfqNumber}`} title={item.customerCompany} description={`${item.partNumber} · received ${item.age}`} action={<StatusBadge value={item.status} />} /><div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]"><section className="space-y-5"><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="mb-5 flex items-start justify-between"><div><div className="eyebrow mb-2">Request brief</div><h2 className="text-[17px] font-extrabold">{item.emailSubject}</h2></div><ConfidenceBar value={item.confidence} /></div><p className="text-[13px] leading-7 text-[hsl(var(--muted-foreground))]">{item.description}</p><div className="mt-6 grid gap-4 border-t border-[hsl(var(--border))] pt-5 sm:grid-cols-3"><DataPoint label="Part number" value={item.partNumber} mono /><DataPoint label="Quantity" value={String(item.quantity)} mono /><DataPoint label="Aircraft" value={item.aircraft} /></div></div><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="eyebrow mb-3">Operator notes</div><p className="text-[12px] leading-6 text-[hsl(var(--muted-foreground))]">{item.notes || 'No operator notes have been added to this record.'}</p></div></section><aside className="space-y-5"><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="eyebrow mb-4">Request metadata</div><div className="space-y-4"><DataPoint label="Customer" value={item.customer} /><DataPoint label="Sender" value={item.sender} /><DataPoint label="Source" value={readable(item.source)} /><DataPoint label="Request type" value={readable(item.requestType)} /><DataPoint label="Priority" value={readable(item.priority)} /></div></div><div className="rounded-lg border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.08)] p-5"><div className="mb-2 flex items-center gap-2 text-[hsl(var(--accent-foreground))]"><Sparkles size={15} /><span className="text-[12px] font-extrabold">AI classification</span></div><p className="text-[11px] leading-5 text-[hsl(var(--primary)/.75)]">This record was classified as <strong>{readable(item.requestType)}</strong>. Review the confidence signal before routing.</p><Link href="/ai-review" data-testid="link-open-ai-review" className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-[hsl(var(--primary))]">Open AI review <ExternalLink size={12} /></Link></div></aside></div></div>;
}

function DataPoint({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><div className="eyebrow mb-1.5">{label}</div><div className={`text-[12px] font-bold ${mono ? 'mono' : ''}`}>{value}</div></div>;
}

export function EmailInboxPage() {
  const emails = useListEmails();
  const [selected, setSelected] = useState<number | null>(null);
  const [emailSearch, setEmailSearch] = useState('');
  if (emails.isLoading) return <><PageHeading eyebrow="Command center / intake" title="Email inbox" /><LoadingRows count={6} /></>;
  if (emails.isError) return <><PageHeading eyebrow="Command center / intake" title="Email inbox" /><QueryState error onRetry={() => emails.refetch()} /></>;
  const records = (emails.data ?? []).filter((email) => `${email.sender} ${email.subject} ${email.senderEmail}`.toLowerCase().includes(emailSearch.toLowerCase()));
  const active = records.find((email) => email.id === selected) ?? records[0];
  return <div className="fade-up"><PageHeading eyebrow="Command center / intake" title="Email inbox" description="Incoming customer traffic, enriched by the classification agent." action={<div className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]"><Mail size={14} className="text-[hsl(var(--accent))]" /> {records.length} messages</div>} /><div className="grid min-h-[560px] overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] lg:grid-cols-[.8fr_1.2fr]">{records.length === 0 ? <div className="lg:col-span-2"><QueryState empty label={emailSearch ? 'No messages match your search' : 'No messages in the inbox'} /></div> : <><div className="border-b border-[hsl(var(--border))] lg:border-b-0 lg:border-r"><div className="border-b border-[hsl(var(--border))] px-4 py-3"><SearchField value={emailSearch} onChange={setEmailSearch} placeholder="Search messages" /></div><div>{records.map((email) => <button key={email.id} data-testid={`button-email-${email.id}`} onClick={() => setSelected(email.id)} className={`w-full border-b border-[hsl(var(--border)/.7)] px-4 py-4 text-left transition-colors ${email.id === active?.id ? 'bg-[hsl(var(--muted)/.65)]' : 'hover:bg-[hsl(var(--muted)/.35)]'}`}><div className="mb-2 flex items-center justify-between gap-3"><span className="truncate text-[11px] font-extrabold">{email.sender}</span><span className="mono shrink-0 text-[9px] text-[hsl(var(--muted-foreground))]">{email.receivedAt}</span></div><div className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">{email.subject}</div><div className="mt-3 flex items-center gap-2"><StatusBadge value={email.aiStatus} /><span className="text-[9px] text-[hsl(var(--muted-foreground))]">{percent(email.confidence)} confidence</span></div></button>)}</div></div><div className="p-6">{active ? <><div className="mb-7 flex items-start justify-between gap-4"><div><div className="eyebrow mb-3">Inbound message</div><h2 className="text-[18px] font-extrabold tracking-[-.03em]">{active.subject}</h2><div className="mt-2 flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]"><div className="grid h-7 w-7 place-items-center rounded-full bg-[hsl(var(--muted))] text-[10px] font-bold">{active.sender.slice(0, 2).toUpperCase()}</div>{active.sender} · {active.senderEmail}</div></div><MoreHorizontal size={18} className="text-[hsl(var(--muted-foreground))]" /></div><div className="soft-grid rounded-md border border-[hsl(var(--border))] p-5"><p className="text-[12px] leading-7 text-[hsl(var(--foreground)/.82)]">Hello team,<br /><br />Please review the attached requirement and confirm availability, lead time and pricing for the requested part. We would appreciate your response at the earliest opportunity.<br /><br />Regards,<br />{active.sender}</p></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><DataPoint label="AI status" value={readable(active.aiStatus)} /><DataPoint label="Request type" value={readable(active.requestType)} /><DataPoint label="Queue status" value={readable(active.status)} /></div></> : <QueryState empty label="Select a message" />}</div></>}</div></div>;
}

export function AiReviewPage() {
  const reviews = useListAiReviews();
  const mutation = useReviewAi();
  const queryClient = useQueryClient();
  const [changingId, setChangingId] = useState<number | null>(null);
  const [classification, setClassification] = useState<typeof RequestType[keyof typeof RequestType]>(RequestType.PARTS_EXCHANGE);
  const runAction = (rfqId: number, action: typeof AiReviewActionAction[keyof typeof AiReviewActionAction], requestType?: typeof RequestType[keyof typeof RequestType]) => {
    mutation.mutate({ rfqId, data: { action, requestType } }, { onSuccess: () => { setChangingId(null); queryClient.invalidateQueries({ queryKey: getListAiReviewsQueryKey() }); } });
  };
  if (reviews.isLoading) return <><PageHeading eyebrow="Command center / intelligence" title="AI review queue" /><LoadingRows count={5} /></>;
  if (reviews.isError) return <><PageHeading eyebrow="Command center / intelligence" title="AI review queue" /><QueryState error onRetry={() => reviews.refetch()} /></>;
  const records = reviews.data ?? [];
  return <div className="fade-up"><PageHeading eyebrow="Command center / intelligence" title="AI review queue" description="Low-confidence classifications waiting for an operator decision." action={<div className="flex items-center gap-2 rounded-md border border-[hsl(var(--accent)/.4)] bg-[hsl(var(--accent)/.1)] px-3 py-2 text-[10px] font-bold text-[hsl(var(--primary))]"><Sparkles size={14} /> Human-in-the-loop</div>} />{mutation.isError && <div role="alert" data-testid="status-ai-review-error" className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[11px] font-semibold text-red-700">The AI decision could not be applied. Review the record and try again.</div>}<div className="mb-5 grid gap-3 sm:grid-cols-3"><ReviewStat label="Needs review" value={String(records.filter((r) => r.status === 'NEEDS_REVIEW').length)} /><ReviewStat label="Avg. confidence" value={records.length ? percent(records.reduce((sum, record) => sum + record.confidence, 0) / records.length) : '—'} /><ReviewStat label="Decisions today" value={String(records.filter((r) => r.status !== 'NEEDS_REVIEW').length)} /></div>{records.length === 0 ? <QueryState empty label="The AI review queue is clear" /> : <div className="space-y-3">{records.map((review) => <div key={review.id} data-testid={`card-ai-review-${review.id}`} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="flex flex-col gap-5 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="mb-2 flex items-center gap-3"><span className="mono text-[11px] font-medium text-[hsl(var(--primary))]">{review.rfqNumber}</span><StatusBadge value={review.status} /></div><div className="text-[14px] font-extrabold">{review.customer}</div><p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{review.reason}</p></div><div className="flex shrink-0 items-center gap-5"><div><div className="eyebrow mb-2">Classification</div><div className="text-[11px] font-bold">{readable(review.classification)}</div></div><div><div className="eyebrow mb-2">Confidence</div><ConfidenceBar value={review.confidence} /></div></div><div className="flex shrink-0 flex-wrap gap-2 lg:w-[290px] lg:justify-end">{changingId === review.id ? <><select data-testid={`select-classification-${review.id}`} value={classification} onChange={(event) => setClassification(event.target.value as typeof RequestType[keyof typeof RequestType])} className="h-8 rounded border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2 text-[10px]"><option value={RequestType.PARTS_EXCHANGE}>Parts exchange</option><option value={RequestType.NEW_PART_PURCHASE}>New parts purchase</option><option value={RequestType.REPAIR}>Repair</option><option value={RequestType.OVERHAUL}>Overhaul</option><option value={RequestType.INSPECTION}>Inspection</option></select><button data-testid={`button-save-classification-${review.id}`} disabled={mutation.isPending} onClick={() => runAction(review.rfqId, AiReviewActionAction.CHANGE_CLASSIFICATION, classification)} className="inline-flex h-8 items-center gap-1 rounded bg-[hsl(var(--primary))] px-3 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">{mutation.isPending && changingId === review.id ? <PendingAction /> : <Check size={13} />} Save</button></> : <><button data-testid={`button-review-${review.id}`} disabled={mutation.isPending} onClick={() => runAction(review.rfqId, AiReviewActionAction.REVIEW)} className="inline-flex h-8 items-center gap-1.5 rounded border border-[hsl(var(--border))] px-3 text-[10px] font-bold hover:bg-[hsl(var(--muted))]">Review</button><button data-testid={`button-approve-${review.id}`} disabled={mutation.isPending} onClick={() => runAction(review.rfqId, AiReviewActionAction.APPROVE)} className="inline-flex h-8 items-center gap-1.5 rounded bg-[hsl(var(--primary))] px-3 text-[10px] font-bold text-[hsl(var(--primary-foreground))]"><Check size={13} /> Approve</button><button data-testid={`button-change-classification-${review.id}`} disabled={mutation.isPending} onClick={() => { setChangingId(review.id); setClassification(review.classification); }} className="inline-flex h-8 items-center gap-1.5 rounded border border-[hsl(var(--border))] px-3 text-[10px] font-bold hover:bg-[hsl(var(--muted))]">Change</button></>}</div></div></div>)}</div>}</div>;
}

function ReviewStat({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"><div className="eyebrow mb-3">{label}</div><div className="mono text-[22px] font-medium tracking-[-.06em]">{value}</div></div>; }

const placeholders: Record<string, { eyebrow: string; title: string; description: string; icon: ComponentType<{ size?: number }> }> = {
  '/parts-exchange': { eyebrow: 'Workflow / 01', title: 'Parts exchange', description: 'Coordinate exchange requests, core returns and replacement part routing from one queue.', icon: PackageOpen },
  '/new-parts-purchase': { eyebrow: 'Workflow / 02', title: 'New parts purchase', description: 'Track purchase requirements and supplier handoffs as this workflow comes online.', icon: ShoppingCartIcon },
  '/repair-overhaul': { eyebrow: 'Workflow / 03', title: 'Repair & overhaul', description: 'A dedicated workspace for repair, overhaul and inspection requests is being prepared.', icon: SettingsIcon },
  '/compliance': { eyebrow: 'Operations module', title: 'Compliance', description: 'Certification, traceability and release controls will live here.', icon: ShieldIcon },
  '/inventory': { eyebrow: 'Operations module', title: 'Inventory', description: 'Stock position, locations and allocation controls will live here.', icon: BoxesIcon },
  '/pricing': { eyebrow: 'Operations module', title: 'Pricing', description: 'Pricing intelligence and approval controls will live here.', icon: ChartIcon },
  '/quotes': { eyebrow: 'Operations module', title: 'Quotes', description: 'Quote preparation and customer response tracking will live here.', icon: ReceiptIcon },
  '/orders': { eyebrow: 'Operations module', title: 'Orders', description: 'Order conversion and handoff tracking will live here.', icon: ClipboardIcon },
  '/fulfillment': { eyebrow: 'Operations module', title: 'Fulfillment', description: 'Fulfillment status and operational exceptions will live here.', icon: PackageOpen },
  '/shipping': { eyebrow: 'Operations module', title: 'Shipping', description: 'Dispatch, carrier and delivery milestones will live here.', icon: TruckIcon },
  '/email-configuration': { eyebrow: 'Administration', title: 'Email configuration', description: 'Configure monitored mailboxes and ingestion rules when the administration module is enabled.', icon: MailIcon },
  '/users': { eyebrow: 'Administration', title: 'Users', description: 'Manage roles, access and operator coverage when the administration module is enabled.', icon: UserIcon },
  '/settings': { eyebrow: 'Administration', title: 'Settings', description: 'Workspace preferences and platform controls will live here.', icon: SettingsIcon },
};
function PlaceholderPage({ path }: { path: string }) { const item = placeholders[path]; const Icon = item.icon; return <div className="fade-up"><PageHeading eyebrow={item.eyebrow} title={item.title} description={item.description} /><div className="soft-grid flex min-h-[440px] flex-col items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 text-center"><div className="mb-5 grid h-14 w-14 place-items-center rounded-xl border border-[hsl(var(--accent)/.4)] bg-[hsl(var(--accent)/.12)] text-[hsl(var(--accent-foreground))]"><Icon size={25} /></div><div className="eyebrow mb-3">Module status / staging</div><h2 className="text-[18px] font-extrabold tracking-[-.03em]">Operational workspace in preparation</h2><p className="mt-2 max-w-md text-[12px] leading-6 text-[hsl(var(--muted-foreground))]">This module is reserved in the operating picture. RFQ intake and AI review are ready to use while the workflow surface is being connected.</p><Link href="/" data-testid="link-return-overview" className="mt-6 inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-[11px] font-bold hover:bg-[hsl(var(--muted))]">Return to overview <ArrowRight size={13} /></Link></div></div>; }
function ShoppingCartIcon() { return <PackageOpen size={25} />; }
function SettingsIcon() { return <SlidersHorizontal size={25} />; }
function ShieldIcon() { return <Check size={25} />; }
function BoxesIcon() { return <PackageOpen size={25} />; }
function ChartIcon() { return <BarChart3 size={25} />; }
function ReceiptIcon() { return <Mail size={25} />; }
function ClipboardIcon() { return <Check size={25} />; }
function TruckIcon() { return <ArrowRight size={25} />; }
function MailIcon() { return <Mail size={25} />; }
function UserIcon() { return <UserRound size={25} />; }

export { PlaceholderPage, placeholders };