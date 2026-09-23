import { Link, useLocation, useParams } from 'wouter';
import { 
  useListInvoices, 
  useGetInvoice, 
  useIssueInvoice, 
  useProcessInvoicePayment 
} from '@workspace/api-client-react';
import { PageHeading, LoadingRows, QueryState, StatusBadge, SectionTitle } from '@/components/ops-primitives';
import { ArrowLeft, FileText, CheckCircle, CreditCard } from 'lucide-react';
import React from 'react';
import { generateInvoicePdf } from '@/lib/pdf';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      <div className="break-words text-[11px] font-bold">{value || 'N/A'}</div>
    </div>
  );
}

export function InvoicesPage() {
  const { data: invoices, isLoading, isError, refetch } = useListInvoices();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Finance" title="Invoices" />
        <LoadingRows count={10} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Finance" title="Invoices" />
        <QueryState error onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="fade-up pb-12">
      <PageHeading eyebrow="Finance" title="Invoices" description="View and manage generated invoices for customer orders." />
      
      {!invoices || (invoices as any[]).length === 0 ? (
        <QueryState empty label="No invoices found." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)]">
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Invoice Number</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Customer</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Order Ref</th>
                <th className="px-5 py-3.5 text-right font-bold text-[hsl(var(--muted-foreground))]">Amount</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Status</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Payment</th>
                <th className="px-5 py-3.5 text-right font-bold text-[hsl(var(--muted-foreground))]">Created</th>
              </tr>
            </thead>
            <tbody>
              {(invoices as any[]).map((invoice: any) => (
                <tr 
                  key={invoice.id} 
                  onClick={() => setLocation('/invoices/' + invoice.id)}
                  className="group cursor-pointer border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/.5)]"
                >
                  <td className="px-5 py-4 font-mono font-bold text-[hsl(var(--primary))] group-hover:underline">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold">{invoice.customer || 'Unknown'}</div>
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))]">{invoice.customerCompany || 'Unknown Company'}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px] font-bold text-[hsl(var(--foreground)/.8))]">
                    {invoice.orderId ? 'ORD-' + invoice.orderId : 'N/A'}
                  </td>
                  <td className="px-5 py-4 text-right font-mono font-bold">
                    $
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={invoice.status} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={invoice.paymentStatus} />
                  </td>
                  <td className="px-5 py-4 text-right text-[11px] text-[hsl(var(--muted-foreground))]">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const { data, isLoading, isError, refetch } = useGetInvoice(Number(invoiceId));
  const { mutate: issueInvoice, isPending: isIssuing } = useIssueInvoice();
  const { mutate: processPayment, isPending: isPaying } = useProcessInvoicePayment();
  const { toast } = useToast();
  const invoice = data as any;
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Finance" title="Loading..." />
        <LoadingRows count={6} />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Finance" title="Invoice unavailable" />
        <QueryState error onRetry={() => refetch()} />
      </div>
    );
  }

  const handleExportPdf = async () => {
    try {
      await generateInvoicePdf(invoice);
      toast({ title: "PDF generated successfully" });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    }
  };

  const handleIssue = () => {
    issueInvoice({ invoiceId: invoice.id }, {
      onSuccess: () => {
        toast({ title: "Invoice Issued Successfully!" });
        refetch();
      },
      onError: (err: any) => {
        toast({ title: "Failed to issue invoice", description: err.message, variant: "destructive" });
      }
    });
  };

  const handlePayment = () => {
    processPayment({ invoiceId: invoice.id, data: { action: "PAID" } }, {
      onSuccess: () => {
        toast({ title: "Payment Processed Successfully!" });
        refetch();
      },
      onError: (err: any) => {
        toast({ title: "Failed to process payment", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="fade-up pb-12">
      <button 
        onClick={() => setLocation('/invoices')}
        className="mb-6 inline-flex items-center gap-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
      >
        <ArrowLeft size={14} /> Back to invoices
      </button>

      <div className="mb-8 flex items-center justify-between">
        <PageHeading 
          eyebrow="Finance / Invoice Detail" 
          title={invoice.invoiceNumber} 
          action={
            <div className="flex gap-2">
              <StatusBadge value={invoice.status} />
              <StatusBadge value={invoice.paymentStatus} />
            </div>
          }
        />
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportPdf}>
            <FileText className="mr-2 h-4 w-4" /> Export PDF
          </Button>

          {invoice.status === 'DRAFT' && (
            <Button onClick={handleIssue} disabled={isIssuing}>
              {isIssuing ? "Issuing..." : "Issue Invoice"}
            </Button>
          )}

          {invoice.status === 'ISSUED' && invoice.paymentStatus !== 'PAID' && (
            <Button onClick={handlePayment} disabled={isPaying} className="bg-emerald-600 hover:bg-emerald-700">
              <CreditCard className="mr-2 h-4 w-4" /> {isPaying ? "Processing..." : "Simulate Payment"}
            </Button>
          )}

          {invoice.paymentStatus === 'PAID' && (
            <div className="flex items-center text-emerald-600 font-bold text-sm">
              <CheckCircle className="mr-2 h-5 w-5" /> PAID
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_.5fr]">
        <div className="space-y-6">
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-900" />
            <div className="flex justify-between items-start mb-8 mt-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">M INTERNATIONAL</h1>
                <p className="text-slate-500 mt-1">INVOICE</p>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl font-bold text-slate-900">{invoice.invoiceNumber}</div>
                <div className="text-slate-500 mt-1">Date: {new Date(invoice.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 py-6 border-y border-slate-100 mb-8">
              <div>
                <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Bill To</div>
                <div className="font-bold text-slate-900">{invoice.customer || 'Unknown'}</div>
                {invoice.customerCompany && <div className="text-slate-600">{invoice.customerCompany}</div>}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Reference</div>
                <div className="text-slate-600">Order: {invoice.orderId}</div>
                {invoice.quoteId && <div className="text-slate-600">Quote: {invoice.quoteId}</div>}
                {invoice.rfqId && <div className="text-slate-600">RFQ: {invoice.rfqId}</div>}
              </div>
            </div>

            <table className="w-full text-left mb-8">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-3 font-bold text-slate-900">Description</th>
                  <th className="py-3 text-right font-bold text-slate-900">Qty</th>
                  <th className="py-3 text-right font-bold text-slate-900">Unit Price</th>
                  <th className="py-3 text-right font-bold text-slate-900">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-4 font-mono font-medium text-slate-900">{invoice.partNumber}</td>
                  <td className="py-4 text-right font-mono text-slate-600">{invoice.quantity}</td>
                  <td className="py-4 text-right font-mono text-slate-600">
                    $
                  </td>
                  <td className="py-4 text-right font-mono font-bold text-slate-900">$</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-mono text-slate-900">$</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Tax</span>
                  <span className="font-mono text-slate-900">$0.00</span>
                </div>
                <div className="flex justify-between py-4">
                  <span className="font-bold text-slate-900 text-lg">Total USD</span>
                  <span className="font-mono font-bold text-slate-900 text-lg">$</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <SectionTitle title="Status Summary" />
            <div className="mt-4 space-y-4">
              <Info label="Invoice Status" value={invoice.status} />
              <Info label="Payment Status" value={invoice.paymentStatus} />
              <Info label="Created On" value={new Date(invoice.createdAt).toLocaleDateString()} />
              <Info label="Last Updated" value={new Date(invoice.updatedAt).toLocaleDateString()} />
            </div>
          </div>
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 mt-6">
            <SectionTitle title="Fulfillment" />
            <div className="mt-4">
              <Button 
                className="w-full mt-2" 
                variant="outline" 
                onClick={() => setLocation('/orders/' + invoice.orderId)}
              >
                Manage Fulfillment in Order
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
