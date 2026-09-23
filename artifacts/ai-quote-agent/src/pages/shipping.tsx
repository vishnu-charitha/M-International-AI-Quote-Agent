import { useState, useMemo } from "react";
import { Link, useLocation, useParams } from "wouter";
import { PageHeading, LoadingRows, QueryState, StatusBadge, SectionTitle } from '@/components/ops-primitives';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  useListFulfillments,
  useGetFulfillment,
  useUpdateFulfillmentStatus
} from "@workspace/api-client-react";
import { CheckCircle2, Circle, Truck, PackageCheck, ArrowLeft, Search, Filter, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SHIPPING_STATUSES = ["PACKED", "SHIPPED", "DELIVERED", "COMPLETED"];

export function ShippingPage() {
  const [, setLocation] = useLocation();
  const { data: allFulfillments, isLoading, isError, refetch } = useListFulfillments();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  if (isLoading) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Operations" title="Shipping" />
        <LoadingRows count={10} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Operations" title="Shipping" />
        <QueryState error onRetry={() => refetch()} />
      </div>
    );
  }

  const shippingFulfillments = (allFulfillments as any[] || []).filter(f => SHIPPING_STATUSES.includes(f.status));

  // Compute stats
  const stats = {
    readyToShip: shippingFulfillments.filter(f => f.status === "PACKED").length,
    shipped: shippingFulfillments.filter(f => f.status === "SHIPPED").length,
    inTransit: shippingFulfillments.filter(f => f.status === "SHIPPED").length, // Mapping In Transit to SHIPPED
    delivered: shippingFulfillments.filter(f => f.status === "DELIVERED").length,
    completed: shippingFulfillments.filter(f => f.status === "COMPLETED").length,
  };

  const filteredData = shippingFulfillments.filter(f => {
    // Status Filter
    if (statusFilter !== "ALL") {
      if (statusFilter === "READY_TO_SHIP" && f.status !== "PACKED") return false;
      if (statusFilter === "SHIPPED" && f.status !== "SHIPPED") return false;
      if (statusFilter === "IN_TRANSIT" && f.status !== "SHIPPED") return false;
      if (statusFilter === "DELIVERED" && f.status !== "DELIVERED") return false;
      if (statusFilter === "COMPLETED" && f.status !== "COMPLETED") return false;
    }

    // Search Filter
    if (search) {
      const q = search.toLowerCase();
      return (
        f.fulfillmentNumber?.toLowerCase().includes(q) ||
        f.orderId?.toString().toLowerCase().includes(q) ||
        f.customer?.toLowerCase().includes(q) ||
        f.partNumber?.toLowerCase().includes(q) ||
        f.trackingNumber?.toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <div className="fade-up pb-12">
      <PageHeading eyebrow="Operations" title="Shipping" description="Dispatch, carrier and delivery operations" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Ship</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.readyToShip}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shipped}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inTransit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <Tabs defaultValue="ALL" onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="READY_TO_SHIP">Ready to Ship</TabsTrigger>
            <TabsTrigger value="SHIPPED">Shipped</TabsTrigger>
            <TabsTrigger value="IN_TRANSIT">In Transit</TabsTrigger>
            <TabsTrigger value="DELIVERED">Delivered</TabsTrigger>
            <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search shipments..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!filteredData || filteredData.length === 0 ? (
        <QueryState empty label="No shipments found." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)]">
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Fulfillment #</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Order #</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Customer</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Part Number</th>
                <th className="px-5 py-3.5 text-right font-bold text-[hsl(var(--muted-foreground))]">Qty</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Carrier</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Tracking Number</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Ship Date</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Expected Delivery</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Status</th>
                <th className="px-5 py-3.5 font-bold text-right text-[hsl(var(--muted-foreground))]">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((f: any) => (
                <tr 
                  key={f.id} 
                  className="group border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/.5)]"
                >
                  <td className="px-5 py-4 font-mono font-bold text-[hsl(var(--primary))] group-hover:underline">
                    <Link href={`/shipping/${f.id}`}>{f.fulfillmentNumber}</Link>
                  </td>
                  <td className="px-5 py-4 font-mono font-bold">
                    ORD-{f.orderId}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold">{f.customer || 'Unknown'}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px] font-bold text-[hsl(var(--foreground)/.8))]">
                    {f.partNumber}
                  </td>
                  <td className="px-5 py-4 text-right font-mono">
                    {f.quantity}
                  </td>
                  <td className="px-5 py-4 font-medium">
                    {f.carrier || '—'}
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px]">
                    {f.trackingNumber || '—'}
                  </td>
                  <td className="px-5 py-4 text-[11px] text-[hsl(var(--muted-foreground))]">
                    {f.shippedAt ? new Date(f.shippedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-4 text-[11px] text-[hsl(var(--muted-foreground))]">
                    {f.expectedShipDate ? new Date(f.expectedShipDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={f.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setLocation(`/shipping/${f.id}`)}>
                      View
                    </Button>
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

export function ShippingDetailPage() {
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
        <PageHeading eyebrow="Shipping" title="Loading..." />
        <LoadingRows count={6} />
      </div>
    );
  }

  if (isError || !f || !SHIPPING_STATUSES.includes(f.status)) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Shipping" title="Unavailable" />
        <QueryState error onRetry={() => refetch()} label={f && !SHIPPING_STATUSES.includes(f.status) ? "This record is not ready for shipping yet." : undefined} />
      </div>
    );
  }

  const timelineSteps = [
    { id: "PACKED", label: "Ready to Ship", icon: <PackageCheck className="w-5 h-5" /> },
    { id: "SHIPPED", label: "Shipped", icon: <Truck className="w-5 h-5" /> },
    { id: "DELIVERED", label: "Delivered", icon: <CheckCircle2 className="w-5 h-5" /> },
    { id: "COMPLETED", label: "Completed", icon: <CheckCircle2 className="w-5 h-5" /> }
  ];

  const getStepIndex = (s: string) => timelineSteps.findIndex(t => t.id === s);
  const currentIndex = getStepIndex(f.status);

  const handleAction = () => {
    switch (f.status) {
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
      case "PACKED": return "Ship Order";
      case "SHIPPED": return "Mark Delivered";
      case "DELIVERED": return "Complete Fulfillment";
      case "COMPLETED": return "Completed";
      default: return null;
    }
  };

  const actionText = getActionText();

  return (
    <div className="fade-up pb-12">
      <Link href="/shipping">
        <a className="mb-6 inline-flex items-center gap-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">
          <ArrowLeft size={14} /> Back to shipping
        </a>
      </Link>

      <PageHeading 
        eyebrow="Operations / Shipping Detail" 
        title={f.fulfillmentNumber} 
        action={
          <div className="flex gap-2 items-center">
            <StatusBadge value={f.status} />
            {actionText && f.status !== "COMPLETED" && (
              <Button onClick={handleAction} disabled={isPending}>
                {actionText}
              </Button>
            )}
            {f.status === "COMPLETED" && (
              <Button disabled variant="outline">Completed</Button>
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

            <SectionTitle title="Shipment Information" />
            <div className="mt-4 grid grid-cols-2 gap-y-4">
              <Info label="Fulfillment Number" value={f.fulfillmentNumber} />
              <Info label="Order Number" value={`ORD-${f.orderId}`} />
              <Info label="Customer" value={f.customer || "—"} />
              <Info label="Company" value={f.customerCompany || "—"} />
              <Info label="Part Number" value={f.partNumber} />
              <Info label="Quantity" value={f.quantity?.toString()} />
            </div>
          </div>
          
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <SectionTitle title="Carrier Information" />
              {f.carrier && f.trackingNumber && (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => toast({ title: "Tracking unavailable", description: "This is a local environment. External tracking is disabled." })}>
                  <ExternalLink className="h-4 w-4" /> Track
                </Button>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-y-4">
              <Info label="Carrier" value={f.carrier || "—"} />
              <Info label="Tracking Number" value={f.trackingNumber || "—"} />
              <Info label="Expected Ship Date" value={f.expectedShipDate ? new Date(f.expectedShipDate).toLocaleDateString() : "—"} />
              <Info label="Actual Ship Date" value={f.shippedAt ? new Date(f.shippedAt).toLocaleDateString() : "—"} />
              <Info label="Delivery Date" value={f.deliveredAt ? new Date(f.deliveredAt).toLocaleDateString() : "—"} />
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
              <Label>Expected Delivery Date (Optional)</Label>
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
