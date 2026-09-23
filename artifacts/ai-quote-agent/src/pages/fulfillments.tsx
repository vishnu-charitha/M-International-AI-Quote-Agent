import { useState } from "react";
import { Link, useParams } from "wouter";
import { PageHeading, LoadingRows, QueryState, StatusBadge, SectionTitle } from '@/components/ops-primitives';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  useListFulfillments,
  useGetFulfillment,
  useUpdateFulfillmentStatus
} from "@workspace/api-client-react";
import { CheckCircle2, Circle, Truck, Package, PackageCheck, ArrowLeft } from "lucide-react";

export function FulfillmentsPage() {
  const { data: fulfillments, isLoading, isError, refetch } = useListFulfillments();

  if (isLoading) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Operations" title="Fulfillments" />
        <LoadingRows count={10} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Operations" title="Fulfillments" />
        <QueryState error onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="fade-up pb-12">
      <PageHeading eyebrow="Operations" title="Fulfillments" description="Manage order fulfillment and shipping" />

      {!fulfillments || (fulfillments as any[]).length === 0 ? (
        <QueryState empty label="No fulfillments found." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)]">
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Fulfillment Number</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Order Number</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Customer</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Part Number</th>
                <th className="px-5 py-3.5 text-right font-bold text-[hsl(var(--muted-foreground))]">Quantity</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Status</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Expected Ship</th>
                <th className="px-5 py-3.5 text-right font-bold text-[hsl(var(--muted-foreground))]">Created</th>
              </tr>
            </thead>
            <tbody>
              {(fulfillments as any[]).map((f: any) => (
                <tr 
                  key={f.id} 
                  className="group border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/.5)]"
                >
                  <td className="px-5 py-4 font-mono font-bold text-[hsl(var(--primary))] group-hover:underline">
                    <Link href={`/fulfillment/${f.id}`}>{f.fulfillmentNumber}</Link>
                  </td>
                  <td className="px-5 py-4 font-mono font-bold">
                    <Link href={`/orders/${f.orderId}`}>{f.orderId}</Link>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold">{f.customer || 'Unknown'}</div>
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))]">{f.customerCompany || 'Unknown Company'}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px] font-bold text-[hsl(var(--foreground)/.8))]">
                    {f.partNumber}
                  </td>
                  <td className="px-5 py-4 text-right font-mono">
                    {f.quantity}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={f.status} />
                  </td>
                  <td className="px-5 py-4 text-[11px] text-[hsl(var(--muted-foreground))]">
                    {f.expectedShipDate ? new Date(f.expectedShipDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-4 text-right text-[11px] text-[hsl(var(--muted-foreground))]">
                    {new Date(f.createdAt).toLocaleDateString()}
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      <div className="break-words text-[11px] font-bold">{value || 'N/A'}</div>
    </div>
  );
}

export function FulfillmentDetailPage() {
  const { fulfillmentId } = useParams();
  const { toast } = useToast();
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [shippingData, setShippingData] = useState({ carrier: '', trackingNumber: '', expectedShipDate: '' });

  const { data, isLoading, isError, refetch } = useGetFulfillment(Number(fulfillmentId));
  const { mutate: updateStatus, isPending } = useUpdateFulfillmentStatus();

  const f = data as any;

  if (isLoading) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Fulfillment" title="Loading..." />
        <LoadingRows count={6} />
      </div>
    );
  }

  if (isError || !f) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Fulfillment" title="Unavailable" />
        <QueryState error onRetry={() => refetch()} />
      </div>
    );
  }

  const timelineSteps = [
    { id: "READY", label: "Ready", icon: <Circle className="w-5 h-5" /> },
    { id: "PICKING", label: "Picking", icon: <Package className="w-5 h-5" /> },
    { id: "PACKED", label: "Packed", icon: <PackageCheck className="w-5 h-5" /> },
    { id: "SHIPPED", label: "Shipped", icon: <Truck className="w-5 h-5" /> },
    { id: "DELIVERED", label: "Delivered", icon: <CheckCircle2 className="w-5 h-5" /> },
    { id: "COMPLETED", label: "Completed", icon: <CheckCircle2 className="w-5 h-5" /> }
  ];

  const getStepIndex = (s: string) => timelineSteps.findIndex(t => t.id === s);
  const currentIndex = getStepIndex(f.status);

  const handleAction = () => {
    switch (f.status) {
      case "READY":
        return doUpdate("PICKING");
      case "PICKING":
        return doUpdate("PACKED");
      case "PACKED":
        setShippingDialogOpen(true);
        return;
      case "SHIPPED":
        return doUpdate("DELIVERED");
      case "DELIVERED":
        return doUpdate("COMPLETED");
    }
  };

  const doUpdate = (newStatus: any, additionalData: any = {}) => {
    updateStatus(
      { 
        fulfillmentId: f.id, 
        data: { status: newStatus, ...additionalData }
      },
      {
        onSuccess: () => {
          toast({ title: "Status updated" });
          setShippingDialogOpen(false);
          refetch();
        },
        onError: (err: any) => {
          toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const submitShipping = () => {
    if (!shippingData.carrier || !shippingData.trackingNumber) {
      toast({ title: "Validation Error", description: "Carrier and tracking number are required", variant: "destructive" });
      return;
    }
    doUpdate("SHIPPED", shippingData);
  };

  const getActionText = () => {
    switch (f.status) {
      case "READY": return "Start Picking";
      case "PICKING": return "Mark Packed";
      case "PACKED": return "Ship Order";
      case "SHIPPED": return "Mark Delivered";
      case "DELIVERED": return "Complete Fulfillment";
      default: return null;
    }
  };

  const actionText = getActionText();

  return (
    <div className="fade-up pb-12">
      <Link href="/fulfillment">
        <a className="mb-6 inline-flex items-center gap-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">
          <ArrowLeft size={14} /> Back to fulfillments
        </a>
      </Link>

      <PageHeading 
        eyebrow="Operations / Fulfillment Detail" 
        title={f.fulfillmentNumber} 
        action={
          <div className="flex gap-2 items-center">
            <StatusBadge value={f.status} />
            {actionText && (
              <Button onClick={handleAction} disabled={isPending}>
                {actionText}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_.5fr]">
        <div className="space-y-6">
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-sm">
            <div className="relative mb-8">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2" />
              <div className="relative z-10 flex justify-between">
                {timelineSteps.map((step, i) => {
                  const isActive = i === currentIndex;
                  const isCompleted = i < currentIndex || f.status === 'COMPLETED';
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 
                        ${isActive ? 'bg-primary border-primary text-primary-foreground' : 
                          isCompleted ? 'bg-primary/20 border-primary text-primary' : 
                          'bg-background border-border text-muted-foreground'}`}>
                        {step.icon}
                      </div>
                      <p className={`mt-2 text-sm font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <SectionTitle title="Fulfillment Info" />
            <div className="mt-4 grid grid-cols-2 gap-y-4">
              <Info label="Part Number" value={f.partNumber} />
              <Info label="Quantity" value={f.quantity?.toString()} />
              <Info label="Warehouse Location" value={f.warehouseLocation || "—"} />
              <Info label="Assigned To" value={f.assignedTo || "—"} />
            </div>
          </div>
          
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
            <SectionTitle title="Shipping Details" />
            <div className="mt-4 grid grid-cols-2 gap-y-4">
              <Info label="Carrier" value={f.carrier || "—"} />
              <Info label="Tracking Number" value={f.trackingNumber || "—"} />
              <Info label="Expected Ship Date" value={f.expectedShipDate ? new Date(f.expectedShipDate).toLocaleDateString() : "—"} />
              <Info label="Shipped At" value={f.shippedAt ? new Date(f.shippedAt).toLocaleDateString() : "—"} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <SectionTitle title="Customer Information" />
            <div className="mt-4 space-y-4">
              <Info label="Customer Name" value={f.customer || 'Unknown'} />
              <Info label="Company" value={f.customerCompany || 'Unknown'} />
            </div>
          </div>

          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <SectionTitle title="Related Records" />
            <div className="mt-4 space-y-4">
              <Info label="Order ID" value={<Link href={`/orders/${f.orderId}`}>{f.orderId}</Link>} />
              <Info label="Invoice ID" value={<Link href={`/invoices/${f.invoiceId}`}>{f.invoiceId}</Link>} />
              <Info label="Quote ID" value={<Link href={`/quotes/${f.quoteId}`}>{f.quoteId}</Link>} />
              <Info label="RFQ ID" value={<Link href={`/rfqs/${f.rfqId}`}>{f.rfqId}</Link>} />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ship Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Carrier</Label>
              <Input 
                placeholder="e.g. DHL, FedEx" 
                value={shippingData.carrier} 
                onChange={e => setShippingData({...shippingData, carrier: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input 
                placeholder="e.g. 1Z99999999" 
                value={shippingData.trackingNumber} 
                onChange={e => setShippingData({...shippingData, trackingNumber: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Ship Date (Optional)</Label>
              <Input 
                type="date"
                value={shippingData.expectedShipDate} 
                onChange={e => setShippingData({...shippingData, expectedShipDate: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShippingDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitShipping} disabled={isPending}>Confirm Shipment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
