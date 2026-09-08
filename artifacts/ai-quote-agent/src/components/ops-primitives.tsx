import { AlertTriangle, Check, ChevronRight, LoaderCircle, RefreshCw, Search, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="eyebrow mb-3">{eyebrow}</div><h1 className="text-[26px] font-extrabold tracking-[-.04em] text-[hsl(var(--foreground))] md:text-[30px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>}</div>{action}</div>;
}

export function SectionTitle({ title, meta, action }: { title: string; meta?: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><h2 className="text-[14px] font-extrabold tracking-[-.01em]">{title}</h2>{meta && <span className="mono rounded bg-[hsl(var(--muted))] px-2 py-1 text-[9px] text-[hsl(var(--muted-foreground))]">{meta}</span>}</div>{action}</div>;
}

export function SearchField({ value, onChange, placeholder = 'Search by RFQ, customer or part number' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input data-testid="input-search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] pl-9 pr-3 text-[12px] outline-none transition-shadow placeholder:text-[hsl(var(--muted-foreground)/.7)] focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.17)]" /></div>;
}

export function ToneDot({ tone = 'blue' }: { tone?: string }) {
  const toneClass: Record<string, string> = { blue: 'bg-sky-500', amber: 'bg-amber-500', violet: 'bg-violet-500', orange: 'bg-orange-500', green: 'bg-emerald-500', teal: 'bg-teal-500', slate: 'bg-slate-400' };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${toneClass[tone] ?? toneClass.blue}`} />;
}

export function StatusBadge({ value, tone }: { value: string; tone?: string }) {
  const key = tone ?? value.toLowerCase();
  const styles: Record<string, string> = { new: 'bg-sky-50 text-sky-700 border-sky-200', analyzing: 'bg-violet-50 text-violet-700 border-violet-200', under_review: 'bg-amber-50 text-amber-700 border-amber-200', needs_human_review: 'bg-amber-50 text-amber-700 border-amber-200', processing: 'bg-teal-50 text-teal-700 border-teal-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', closed: 'bg-slate-100 text-slate-600 border-slate-200', approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', changed: 'bg-violet-50 text-violet-700 border-violet-200', failed: 'bg-red-50 text-red-700 border-red-200', analyzed: 'bg-teal-50 text-teal-700 border-teal-200', pending_review: 'bg-amber-50 text-amber-700 border-amber-200', rfq_created: 'bg-sky-50 text-sky-700 border-sky-200', ignored: 'bg-slate-100 text-slate-600 border-slate-200' };
  return <span data-testid={`status-${value.toLowerCase()}`} className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-[.06em] ${styles[key] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}><ToneDot tone={key.includes('review') ? 'amber' : key.includes('complete') || key === 'approved' ? 'green' : key.includes('process') ? 'teal' : key.includes('analy') ? 'violet' : 'slate'} />{value.replaceAll('_', ' ')}</span>;
}

export function LoadingRows({ count = 5 }: { count?: number }) {
  return <div className="space-y-2">{Array.from({ length: count }).map((_, index) => <div key={index} className="flex animate-pulse items-center gap-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-4"><div className="h-3 w-20 rounded bg-[hsl(var(--muted))]" /><div className="h-3 flex-1 rounded bg-[hsl(var(--muted))]" /><div className="h-3 w-24 rounded bg-[hsl(var(--muted))]" /></div>)}</div>;
}

export function QueryState({ error, onRetry, empty = false, label = 'No records in this queue' }: { error?: boolean; onRetry?: () => void; empty?: boolean; label?: string }) {
  if (error) return <div className="flex min-h-[210px] flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/60 px-6 text-center"><XCircle size={22} className="mb-3 text-red-500" /><h3 className="text-[13px] font-bold text-red-800">Unable to load operations data</h3><p className="mt-1 text-[11px] text-red-700/75">The service did not respond. Retry when the connection is stable.</p><button data-testid="button-retry-query" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-md border border-red-200 bg-[hsl(var(--card))] px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100"><RefreshCw size={13} /> Retry</button></div>;
  if (empty) return <div className="flex min-h-[210px] flex-col items-center justify-center rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] px-6 text-center"><div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"><AlertTriangle size={18} /></div><h3 className="text-[13px] font-bold">{label}</h3><p className="mt-1 max-w-xs text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Try adjusting the filters or check back as new requests arrive.</p></div>;
  return null;
}

export function ConfidenceBar({ value }: { value: number }) {
  const percent = Math.round(value <= 1 ? value * 100 : value);
  const color = percent >= 85 ? 'bg-emerald-500' : percent >= 70 ? 'bg-amber-500' : 'bg-orange-500';
  return <div className="flex items-center gap-2"><div className="h-1.5 w-14 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} /></div><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{percent}%</span></div>;
}

export function MiniArrow() { return <ChevronRight size={14} className="text-[hsl(var(--muted-foreground)/.65)]" />; }
export function PendingAction() { return <LoaderCircle size={14} className="animate-spin" />; }
export function CheckIcon() { return <Check size={14} />; }