import { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAnalyzeRfq, useCreateRfq, RequestType, AnalyzeRfqResult } from '@workspace/api-client-react';
import { ArrowLeft, Sparkles, Check, CheckCircle2, AlertCircle, Copy, Send } from 'lucide-react';
import { PageHeading, SectionTitle, LoadingRows, QueryState, ConfidenceBar } from '@/components/ops-primitives';

export function ManualRfqIntakePage() {
  const [, setLocation] = useLocation();
  const analyzeMutation = useAnalyzeRfq();
  const createMutation = useCreateRfq();
  
  const [rawText, setRawText] = useState('');
  const [analyzedData, setAnalyzedData] = useState<AnalyzeRfqResult | null>(null);
  const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);

  const isMissingPhone = analyzedData ? !analyzedData.customer?.phone?.trim() : false;
  const missingFieldsText = isMissingPhone ? 'Phone number' : '';

  const { toast } = useToast();

  const handleAnalyze = () => {
    if (!rawText.trim()) return;
    analyzeMutation.mutate({ data: { rawText } }, {
      onSuccess: (data) => setAnalyzedData(data)
    });
  };

  const handleCreate = (status: "READY_FOR_REVIEW" | "VALIDATION_REQUIRED" = "READY_FOR_REVIEW") => {
    if (!analyzedData) return;
    createMutation.mutate({
      data: {
        customer: analyzedData.customer,
        items: analyzedData.items,
        requestType: analyzedData.requestType,
        notes: "Manually entered RFQ via Portal",
        status,
      }
    }, {
      onSuccess: (response) => {
        toast({
          title: "RFQ Created successfully",
          description: `Created RFQ ${response.rfqNumber}`,
          variant: "default",
        });
        setAnalyzedData(null);
        setRawText("");
        setShowMissingInfoModal(false);
      }
    });
  };

  const handleCopyMessage = () => {
    if (!analyzedData) return;
    const msg = `Hi ${analyzedData.customer?.name || 'there'},\n\nThank you for your RFQ. We noticed your phone number was missing from the request. Could you please provide it so we can process your quote?\n\nBest regards,\nM International`;
    navigator.clipboard.writeText(msg);
    alert('Message copied to clipboard');
  };

  const updateItem = (index: number, key: string, value: string | number) => {
    if (!analyzedData) return;
    const items = [...analyzedData.items];
    items[index] = { ...items[index], [key]: value };
    setAnalyzedData({ ...analyzedData, items });
  };

  const updateCustomer = (key: keyof AnalyzeRfqResult['customer'], value: string) => {
    if (!analyzedData) return;
    setAnalyzedData({
      ...analyzedData,
      customer: { ...analyzedData.customer, [key]: value }
    });
  };

  if (createMutation.isPending) {
    return <><PageHeading eyebrow="Manual Intake" title="Creating RFQ record" /><LoadingRows count={5} /></>;
  }

  return (
    <div className="fade-up">
      <button data-testid="button-back-to-inbox" onClick={() => setLocation('/rfq-inbox')} className="mb-6 inline-flex items-center gap-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"><ArrowLeft size={14} /> Back to inbox</button>
      
      <PageHeading 
        eyebrow="Manual Intake" 
        title="Create RFQ" 
        description="Paste an email, message, or manual notes to extract structured RFQ data."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="space-y-4">
          <SectionTitle title="1. Input" />
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
            <label className="eyebrow mb-3 block">Raw RFQ Text</label>
            <textarea
              className="min-h-[300px] w-full resize-y rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-[12px] text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))]"
              placeholder="Paste the raw RFQ text, email body, or message here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              disabled={analyzeMutation.isPending || !!analyzedData}
            />
            
            {!analyzedData ? (
              <button
                disabled={!rawText.trim() || analyzeMutation.isPending}
                onClick={handleAnalyze}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-[11px] font-bold text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/.9)] disabled:opacity-50"
              >
                {analyzeMutation.isPending ? 'Analyzing...' : <><Sparkles size={14} /> Analyze text</>}
              </button>
            ) : (
              <button
                onClick={() => setAnalyzedData(null)}
                className="mt-4 inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-4 py-2 text-[11px] font-bold hover:bg-[hsl(var(--muted))]"
              >
                Start Over
              </button>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle title="2. Extracted Data" />
          
          {!analyzedData && !analyzeMutation.isPending && (
            <div className="soft-grid flex min-h-[360px] items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[12px] text-[hsl(var(--muted-foreground))]">
              Enter text and click analyze to extract data.
            </div>
          )}
          
          {analyzeMutation.isPending && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
              <LoadingRows count={7} />
            </div>
          )}
          
          {analyzeMutation.isError && (
            <QueryState error onRetry={handleAnalyze} />
          )}

          {analyzedData && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 fade-up">
              <div className="mb-5 flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                <div>
                  <div className="flex items-center gap-2 font-bold text-[13px] text-[hsl(var(--primary))]">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    Extraction complete
                  </div>
                  {isMissingPhone && (
                    <div className="mt-2 text-[11px] text-amber-600 font-medium">
                      Missing: {missingFieldsText}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="eyebrow mb-1">AI Confidence</div>
                  <ConfidenceBar value={analyzedData.confidenceScore} />
                </div>
              </div>

              <div className="space-y-5">
                {isMissingPhone && (
                  <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50/50 p-3 text-[11px] text-amber-800">
                    <AlertCircle size={15} className="text-amber-600" />
                    <div className="flex-1 font-semibold">Missing required information: {missingFieldsText}</div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="eyebrow mb-1.5 block">Customer Name</label>
                    <input
                      value={analyzedData.customer?.name || ''}
                      onChange={(e) => updateCustomer('name', e.target.value)}
                      className="w-full rounded border border-[hsl(var(--input))] bg-transparent px-2.5 py-1.5 text-[11px] outline-none focus:border-[hsl(var(--accent))]"
                    />
                  </div>
                  <div>
                    <label className="eyebrow mb-1.5 block">Customer Email</label>
                    <input
                      value={analyzedData.customer?.email || ''}
                      onChange={(e) => updateCustomer('email', e.target.value)}
                      className="w-full rounded border border-[hsl(var(--input))] bg-transparent px-2.5 py-1.5 text-[11px] outline-none focus:border-[hsl(var(--accent))]"
                    />
                  </div>
                  <div>
                    <label className="eyebrow mb-1.5 block">Phone {isMissingPhone && <span className="text-amber-600 font-bold">*</span>}</label>
                    <input
                      value={analyzedData.customer?.phone || ''}
                      onChange={(e) => updateCustomer('phone', e.target.value)}
                      className={`w-full rounded border ${isMissingPhone ? 'border-amber-300 bg-amber-50/30 focus:border-amber-500' : 'border-[hsl(var(--input))] bg-transparent focus:border-[hsl(var(--accent))]'} px-2.5 py-1.5 text-[11px] outline-none`}
                      placeholder="Enter phone number..."
                    />
                  </div>
                </div>

                <div>
                  <label className="eyebrow mb-1.5 block">Request Type</label>
                  <select
                    value={analyzedData.requestType}
                    onChange={(e) => setAnalyzedData({ ...analyzedData, requestType: e.target.value as typeof RequestType[keyof typeof RequestType] })}
                    className="w-full rounded border border-[hsl(var(--input))] bg-transparent px-2.5 py-1.5 text-[11px] font-semibold outline-none focus:border-[hsl(var(--accent))]"
                  >
                    {Object.values(RequestType).map((type) => (
                      <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 border-t border-[hsl(var(--border))] pt-4">
                  <div className="eyebrow">Requested Items</div>
                  {analyzedData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-[1fr_2fr_80px] gap-3 rounded bg-[hsl(var(--muted)/.4)] p-3">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">Part Number</div>
                        <input
                          value={item.partNumber}
                          onChange={(e) => updateItem(index, 'partNumber', e.target.value)}
                          className="w-full rounded border border-[hsl(var(--input))] bg-transparent px-2 py-1 text-[11px] font-mono outline-none focus:border-[hsl(var(--accent))]"
                        />
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">Description</div>
                        <input
                          value={item.description || ''}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full rounded border border-[hsl(var(--input))] bg-transparent px-2 py-1 text-[11px] outline-none focus:border-[hsl(var(--accent))]"
                        />
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">Qty</div>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full rounded border border-[hsl(var(--input))] bg-transparent px-2 py-1 text-[11px] outline-none focus:border-[hsl(var(--accent))]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  {isMissingPhone && (
                    <button
                      onClick={() => setShowMissingInfoModal(true)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-[12px] font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                    >
                      <AlertCircle size={16} className="text-amber-500" /> Request Missing Information
                    </button>
                  )}
                  <button
                    onClick={() => handleCreate("READY_FOR_REVIEW")}
                    disabled={createMutation.isPending || isMissingPhone}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2.5 text-[12px] font-bold text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/.9)] disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Saving...' : <><Check size={16} /> Save & Submit to Queue</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {showMissingInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-xl">
            <h3 className="mb-2 text-[15px] font-extrabold">Request Missing Information</h3>
            <p className="mb-4 text-[11px] text-[hsl(var(--muted-foreground))]">
              Copy the message below to request the missing phone number from the customer.
            </p>
            <div className="mb-5 rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] p-3 text-[11px] leading-relaxed">
              Hi {analyzedData?.customer?.name || 'there'},<br /><br />
              Thank you for your RFQ. We noticed your phone number was missing from the request. Could you please provide it so we can process your quote?<br /><br />
              Best regards,<br />
              M International
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleCopyMessage}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-2 text-[11px] font-bold hover:bg-[hsl(var(--muted))]"
              >
                <Copy size={14} /> Copy Message
              </button>
              <button
                onClick={() => {
                  setShowMissingInfoModal(false);
                  handleCreate("VALIDATION_REQUIRED");
                }}
                disabled={createMutation.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[hsl(var(--primary))] px-3 py-2 text-[11px] font-bold text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/.9)]"
              >
                <Send size={14} /> Mark as Manually Sent
              </button>
            </div>
            <button
              onClick={() => setShowMissingInfoModal(false)}
              className="mt-4 w-full text-center text-[10px] font-bold text-[hsl(var(--muted-foreground))] hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
