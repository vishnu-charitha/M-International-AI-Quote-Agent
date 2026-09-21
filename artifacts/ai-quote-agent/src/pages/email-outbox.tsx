import { useState } from 'react';
import { useGetEmailOutbox } from '@workspace/api-client-react';
import { PageHeading } from '@/components/ops-primitives';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { RefreshCw, Eye, X } from 'lucide-react';
import { Link } from 'wouter';

export function EmailOutboxPage() {
  const { data, isLoading, isError, refetch, isRefetching } = useGetEmailOutbox();
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECORDED':
      case 'DEVELOPMENT_MODE_LOGGED':
        return <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">RECORDED</span>;
      case 'SENT':
        return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">SENT</span>;
      case 'FAILED':
        return <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-600/20">FAILED</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-inset ring-slate-500/10">{status}</span>;
    }
  };

  return (
    <div className="fade-up">
      <PageHeading
        eyebrow="Communications"
        title="Email Outbox"
        description="Monitor outgoing emails and development mode logs."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-2"
          >
            <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
            Refresh
          </Button>
        }
      />

      <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-[12px] text-amber-800">
        <p className="font-bold mb-1">Development Mode Notice</p>
        <p>Emails listed here with status <strong>RECORDED</strong> were generated in development mode and were <strong>NOT</strong> actually sent via Microsoft Graph.</p>
      </div>

      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Created</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[120px]">RFQ</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-[12px] text-[hsl(var(--muted-foreground))]">
                  Loading outbox...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-[12px] text-red-600">
                  Failed to load email outbox. Please try again.
                </TableCell>
              </TableRow>
            ) : data?.emails && data.emails.length > 0 ? (
              data.emails.map((email) => (
                <TableRow key={email.id}>
                  <TableCell className="text-[12px] text-[hsl(var(--muted-foreground))]">
                    {format(new Date(email.createdAt), 'MMM d, yyyy h:mm a')}
                  </TableCell>
                  <TableCell className="text-[13px] font-medium">{email.recipient}</TableCell>
                  <TableCell className="text-[12px] text-[hsl(var(--muted-foreground))] truncate max-w-[300px]">
                    {email.subject}
                  </TableCell>
                  <TableCell className="text-[12px]">
                    {email.rfqId ? (
                      <Link href={`/rfqs/${email.rfqId}`} className="text-[hsl(var(--primary))] font-medium hover:underline">
                        RFQ-{email.rfqId}
                      </Link>
                    ) : (
                      <span className="text-[hsl(var(--muted-foreground))]">—</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(email.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(email)}>
                      <Eye size={14} className="mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-[13px] text-[hsl(var(--muted-foreground))]">
                  No emails have been recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-up">
          <div className="w-full max-w-2xl rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4 bg-[hsl(var(--muted)/.3)]">
              <h2 className="text-[15px] font-extrabold text-[hsl(var(--foreground))]">Email Record Details</h2>
              <button 
                onClick={() => setSelectedEmail(null)} 
                className="rounded-full p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4 mb-6 border-b border-[hsl(var(--border))] pb-6">
                <div className="grid grid-cols-4 gap-4 text-[12px]">
                  <div className="font-bold text-[hsl(var(--muted-foreground))]">To:</div>
                  <div className="col-span-3 text-[13px] font-medium">{selectedEmail.recipient}</div>
                  
                  <div className="font-bold text-[hsl(var(--muted-foreground))]">Subject:</div>
                  <div className="col-span-3 text-[13px]">{selectedEmail.subject}</div>
                  
                  <div className="font-bold text-[hsl(var(--muted-foreground))]">Created:</div>
                  <div className="col-span-3 text-[13px]">{format(new Date(selectedEmail.createdAt), 'MMM d, yyyy h:mm a')}</div>
                  
                  <div className="font-bold text-[hsl(var(--muted-foreground))]">RFQ Reference:</div>
                  <div className="col-span-3 text-[13px]">
                    {selectedEmail.rfqId ? `RFQ-${selectedEmail.rfqId}` : 'None'}
                  </div>
                  
                  <div className="font-bold text-[hsl(var(--muted-foreground))]">Status:</div>
                  <div className="col-span-3">{getStatusBadge(selectedEmail.status)}</div>
                </div>
              </div>
              
              <div>
                <div className="text-[12px] font-bold text-[hsl(var(--muted-foreground))] mb-3">Email Body:</div>
                <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.2)] p-4">
                  <pre className="whitespace-pre-wrap text-[12px] leading-relaxed font-sans text-[hsl(var(--foreground)/.9)]">
                    {selectedEmail.bodyText}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="border-t border-[hsl(var(--border))] p-4 bg-[hsl(var(--muted)/.3)] flex justify-end">
              <Button onClick={() => setSelectedEmail(null)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
