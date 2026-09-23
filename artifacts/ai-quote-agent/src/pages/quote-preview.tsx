import { useParams, useLocation } from "wouter";
import { useGetQuote, useUpdateQuoteStatus, useSendQuote, useGetRfq, useProcessQuoteResponse, getGetQuoteQueryKey, getGetRfqQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowLeft, Download, Send, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateQuotePdf } from "@/lib/pdf";

export function QuotePreviewPage() {
  const params = useParams<{ quoteId: string }>();
  const id = Number(params.quoteId);
  const { data: quote, isLoading, refetch } = useGetQuote(id, { query: { enabled: Number.isFinite(id), queryKey: getGetQuoteQueryKey(id) } });
  const updateStatus = useUpdateQuoteStatus();
  const processQuoteResponse = useProcessQuoteResponse();
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simulateAction, setSimulateAction] = useState<'ACCEPT' | 'REJECT'>('ACCEPT');
  const [simulateReason, setSimulateReason] = useState('');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  const rfqId = quote?.rfqId;
  const { data: rfq } = useGetRfq(rfqId as number, { 
    query: { enabled: !!rfqId, queryKey: getGetRfqQueryKey(rfqId as number) } 
  });
  
  const sendQuote = useSendQuote();

  if (isLoading) return <div className="p-8 text-center text-[12px] text-muted-foreground">Loading quote...</div>;
  if (!quote) return <div className="p-8 text-center text-[12px] text-red-500">Quote not found.</div>;

  const handleStatusUpdate = (status: 'APPROVED' | 'REJECTED' | 'DRAFT') => {
    updateStatus.mutate(
      { quoteId: id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: `Quote marked as ${status}` });
          refetch();
        },
        onError: () => {
          toast({ title: "Failed to update quote status", variant: "destructive" });
        }
      }
    );
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await generateQuotePdf(quote);
      toast({ title: "PDF generated successfully" });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendToCustomer = async () => {
    if (!quote) return;
    try {
      const base64Pdf = await generateQuotePdf(quote, true);
      if (!base64Pdf) throw new Error("Failed to generate PDF");

      sendQuote.mutate(
        { quoteId: id, data: { pdfBase64: base64Pdf as string } },
        {
          onSuccess: () => {
            toast({ title: "Quotation sent successfully to customer." });
            setIsSendModalOpen(false);
            refetch();
          },
          onError: (error: any) => {
            console.error("Send failed:", error);
            const msg = error?.response?.data?.error || error.message || "Failed to send email";
            toast({ title: msg, variant: "destructive" });
          }
        }
      );
    } catch (error: any) {
      console.error(error);
      toast({ title: error.message || "Error generating PDF", variant: "destructive" });
    }
  };

  return (
    <div className="fade-up pb-12">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" className="text-muted-foreground" onClick={() => setLocation(`/rfqs/${quote.rfqId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to RFQ
        </Button>
        <div className="flex gap-2">
          {quote.status === 'DRAFT' && (
            <>
              <Button onClick={() => handleStatusUpdate('APPROVED')} className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Check className="mr-2 h-4 w-4" /> Approve Quote
              </Button>
              <Button variant="outline" className="text-red-600 border-red-200" onClick={() => handleStatusUpdate('REJECTED')}>
                <X className="mr-2 h-4 w-4" /> Reject Quote
              </Button>
            </>
          )}
          {quote.status === 'APPROVED' && (
            <Button onClick={() => setIsSendModalOpen(true)} className="bg-blue-600 text-white hover:bg-blue-700">
              <Send className="mr-2 h-4 w-4" /> Send to Customer
            </Button>
          )}
          {quote.status === 'SENT' && (
            <Button onClick={() => setIsSimulateModalOpen(true)} variant="outline" className="border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100">
              Simulate Customer Response
            </Button>
          )}
          <Button variant="outline" onClick={handleExportPdf} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-muted/30 p-8 border-b border-border flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-primary">M International</h1>
            <p className="text-[11px] text-muted-foreground mt-1">Global Aviation Support & Services</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Quotation</div>
            <div className="text-xl font-bold">{quote.quoteNumber}</div>
            <div className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${quote.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : quote.status === 'REJECTED' ? 'bg-red-100 text-red-800' : quote.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
              {quote.status}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="p-8 grid md:grid-cols-2 gap-8 border-b border-border">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Customer Information</div>
            <div className="font-medium">{quote.customerCompany || 'N/A'}</div>
            <div className="text-[12px] text-muted-foreground mt-1">{quote.customer || 'Unknown Contact'}</div>
          </div>
          <div className="md:text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Reference</div>
            <div className="text-[12px]">RFQ ID: #{quote.rfqId}</div>
            <div className="text-[12px] text-muted-foreground mt-1">Date: {new Date(quote.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Line Items */}
        <div className="p-8">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 font-bold">Part Number / Description</th>
                <th className="pb-3 font-bold text-center">Qty</th>
                <th className="pb-3 font-bold text-right">Unit Price</th>
                <th className="pb-3 font-bold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-4">
                  <div className="font-bold">{quote.partNumber}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{quote.description}</div>
                </td>
                <td className="py-4 text-center">{quote.quantity}</td>
                <td className="py-4 text-right">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.currency }).format(quote.unitPrice || 0)}
                </td>
                <td className="py-4 text-right font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.currency }).format(quote.subtotal || 0)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-8 flex justify-end">
            <div className="w-64 space-y-3 text-[12px]">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.currency }).format(quote.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.currency }).format(quote.tax || 0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.currency }).format(quote.shippingCost || 0)}</span>
              </div>
              {(quote.discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.currency }).format(quote.discount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3 text-[14px] font-bold">
                <span>Total</span>
                <span className="text-primary">{new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.currency }).format(quote.totalAmount || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="bg-muted/30 p-8 border-t border-border grid sm:grid-cols-2 md:grid-cols-4 gap-6 text-[11px]">
          <div>
            <div className="font-bold text-muted-foreground uppercase tracking-wider mb-1 text-[9px]">Availability</div>
            <div>{quote.availability}</div>
          </div>
          <div>
            <div className="font-bold text-muted-foreground uppercase tracking-wider mb-1 text-[9px]">Lead Time</div>
            <div>{quote.leadTime}</div>
          </div>
          <div>
            <div className="font-bold text-muted-foreground uppercase tracking-wider mb-1 text-[9px]">Warranty</div>
            <div>{quote.warranty}</div>
          </div>
          <div>
            <div className="font-bold text-muted-foreground uppercase tracking-wider mb-1 text-[9px]">Validity</div>
            <div>{quote.validity}</div>
          </div>
        </div>
      </div>

      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Send Quote to Customer
            </DialogTitle>
            <DialogDescription>
              Review the email details before sending the quotation.
            </DialogDescription>
          </DialogHeader>

          {(!rfq || !(rfq as any).customerEmail) ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <X className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-amber-900">Missing Email Address</h3>
              <p className="text-sm text-amber-700">Customer email address is not available for this quote. Please update the customer record first.</p>
              <div className="mt-6 flex justify-center">
                <Button onClick={() => setIsSendModalOpen(false)} variant="outline">Close</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2 text-[12px]">
                <div className="font-medium text-muted-foreground">To:</div>
                <div className="font-medium">{quote.customer} &lt;{(rfq as any).customerEmail}&gt;</div>
                
                <div className="font-medium text-muted-foreground">Company:</div>
                <div>{quote.customerCompany}</div>

                <div className="font-medium text-muted-foreground">Subject:</div>
                <div className="rounded-md border bg-muted/30 px-3 py-2 font-medium">
                  Quotation {quote.quoteNumber} - M International
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[12px] font-medium text-muted-foreground">Message:</div>
                <div className="rounded-md border bg-muted/10 p-4 text-[12px] whitespace-pre-wrap font-mono leading-relaxed">
Dear {quote.customer},

Please find attached our quotation {quote.quoteNumber} for your requested aircraft component.

Quotation Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.currency || 'USD' }).format(quote.totalAmount || 0)}

The quotation includes the applicable pricing, availability, lead time, warranty, and validity information.

Please review the attached quotation and let us know if you would like to proceed.

Regards,
M International
Global Aviation Support & Services
                </div>
              </div>
              
              <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Attachment: M-International-Quote-{quote.quoteNumber}.pdf will be generated and attached.
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsSendModalOpen(false)} disabled={sendQuote.isPending}>
                  Cancel
                </Button>
                <Button onClick={handleSendToCustomer} disabled={sendQuote.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
                  {sendQuote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {sendQuote.isPending ? "Sending..." : "Send Email"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Simulate Customer Response Modal */}
      <Dialog open={isSimulateModalOpen} onOpenChange={setIsSimulateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simulate Customer Response</DialogTitle>
            <DialogDescription>Select how the customer responded to this quote.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex gap-4">
              <Button
                variant={simulateAction === 'ACCEPT' ? 'default' : 'outline'}
                onClick={() => setSimulateAction('ACCEPT')}
                className={simulateAction === 'ACCEPT' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
              >
                Accept Quote
              </Button>
              <Button
                variant={simulateAction === 'REJECT' ? 'default' : 'outline'}
                onClick={() => setSimulateAction('REJECT')}
                className={simulateAction === 'REJECT' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
              >
                Reject Quote
              </Button>
            </div>
            {simulateAction === 'REJECT' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Rejection Reason</label>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter rejection reason..."
                  value={simulateReason}
                  onChange={(e) => setSimulateReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSimulateModalOpen(false)}>Cancel</Button>
            <Button 
              disabled={processQuoteResponse.isPending || (simulateAction === 'REJECT' && !simulateReason.trim())}
              onClick={() => {
                processQuoteResponse.mutate({
                  quoteId: id,
                  data: { action: simulateAction, reason: simulateAction === 'REJECT' ? simulateReason : undefined }
                }, {
                  onSuccess: () => {
                    toast({ title: `Quote marked as ${simulateAction === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'}` });
                    setIsSimulateModalOpen(false);
                    refetch();
                  },
                  onError: (error: any) => {
                    const msg = error?.response?.data?.error || "Failed to process quote response";
                    toast({ title: msg, variant: "destructive" });
                  }
                });
              }}
            >
              {processQuoteResponse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

