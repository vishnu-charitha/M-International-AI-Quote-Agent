import { Link, useLocation, useParams } from 'wouter';
import { useGetOrder, useListOrders, useListInvoices, useCreateInvoice, useListFulfillments, useCreateFulfillment } from '@workspace/api-client-react';
import { PageHeading, LoadingRows, QueryState, StatusBadge, SectionTitle } from '@/components/ops-primitives';
import { ArrowLeft, Plus } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      <div className="break-words text-[11px] font-bold">{value || 'N/A'}</div>
    </div>
  );
}

export function OrdersPage() {
  const { data: orders, isLoading, isError, refetch } = useListOrders();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Fulfillment" title="Orders" />
        <LoadingRows count={10} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Fulfillment" title="Orders" />
        <QueryState error onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="fade-up pb-12">
      <PageHeading eyebrow="Fulfillment" title="Orders" description="View and manage customer orders generated from accepted quotes." />
      
      {!orders || (orders as any[]).length === 0 ? (
        <QueryState empty label="No orders found." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)]">
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Order Number</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Customer</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Part Number</th>
                <th className="px-5 py-3.5 text-right font-bold text-[hsl(var(--muted-foreground))]">Quantity</th>
                <th className="px-5 py-3.5 text-right font-bold text-[hsl(var(--muted-foreground))]">Value</th>
                <th className="px-5 py-3.5 font-bold text-[hsl(var(--muted-foreground))]">Status</th>
                <th className="px-5 py-3.5 text-right font-bold text-[hsl(var(--muted-foreground))]">Created</th>
              </tr>
            </thead>
            <tbody>
              {(orders as any[]).map((order: any) => (
                <tr 
                  key={order.id} 
                  onClick={() => setLocation('/orders/' + order.id)}
                  className="group cursor-pointer border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/.5)]"
                >
                  <td className="px-5 py-4 font-mono font-bold text-[hsl(var(--primary))] group-hover:underline">
                    {order.orderNumber}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold">{order.customer || 'Unknown'}</div>
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))]">{order.customerCompany || 'Unknown Company'}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px] font-bold text-[hsl(var(--foreground)/.8))]">
                    {order.partNumber}
                  </td>
                  <td className="px-5 py-4 text-right font-mono">
                    {order.quantity}
                  </td>
                  <td className="px-5 py-4 text-right font-mono font-bold text-[hsl(var(--primary))]">
                    $
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={order.status} />
                  </td>
                  <td className="px-5 py-4 text-right text-[11px] text-[hsl(var(--muted-foreground))]">
                    {new Date(order.createdAt).toLocaleDateString()}
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

export function OrderDetailPage() {
  const { orderId } = useParams();
  const { data, isLoading, isError, refetch } = useGetOrder(Number(orderId));
  const { data: invoices } = useListInvoices();
  const { data: fulfillments } = useListFulfillments();
  const { mutate: createInvoice, isPending: isCreatingInvoice } = useCreateInvoice();
  const { mutate: createFulfillment, isPending: isCreatingFulfillment } = useCreateFulfillment();
  const { toast } = useToast();
  
  const order = data as any;
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Order" title="Loading..." />
        <LoadingRows count={6} />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="fade-up">
        <PageHeading eyebrow="Order" title="Order unavailable" />
        <QueryState error onRetry={() => refetch()} />
      </div>
    );
  }

  const invoice = invoices ? (invoices as any[]).find((i: any) => i.orderId === order.id) : null;
  const fulfillment = fulfillments ? (fulfillments as any[]).find((f: any) => f.orderId === order.id) : null;

  const handleCreateInvoice = () => {
    createInvoice({ orderId: order.id }, {
      onSuccess: (newInvoice: any) => {
        toast({ title: "Invoice created successfully" });
        setLocation('/invoices/' + newInvoice.id);
      },
      onError: (err: any) => {
        toast({ title: "Failed to create invoice", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleCreateFulfillment = () => {
    createFulfillment({ orderId: order.id }, {
      onSuccess: (newFulfillment: any) => {
        toast({ title: "Fulfillment created successfully" });
        setLocation('/fulfillment/' + newFulfillment.id);
      },
      onError: (err: any) => {
        toast({ title: "Failed to create fulfillment", description: err.response?.data?.error || err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="fade-up pb-12">
      <button 
        onClick={() => setLocation('/orders')}
        className="mb-6 inline-flex items-center gap-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
      >
        <ArrowLeft size={14} /> Back to orders
      </button>

      <PageHeading 
        eyebrow="Fulfillment / Order Detail" 
        title={order.orderNumber} 
        action={<StatusBadge value={order.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_.5fr]">
        <div className="space-y-6">
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <SectionTitle title="Order Details" />
            <div className="mt-4 grid grid-cols-2 gap-y-4">
              <Info label="Part Number" value={order.partNumber} />
              <Info label="Quantity" value={order.quantity?.toString()} />
              <Info label="Accepted Value" value={"$" + order.acceptedValue} />
              <Info label="Created At" value={new Date(order.createdAt).toLocaleDateString()} />
              <Info label="Order Status" value={order.status} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <SectionTitle title="Customer Information" />
            <div className="mt-4 space-y-4">
              <Info label="Customer Name" value={order.customer || 'Unknown'} />
              <Info label="Company" value={order.customerCompany || 'Unknown'} />
            </div>
          </div>

          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <SectionTitle title="Related Records" />
            <div className="mt-4 space-y-4">
              <Info label="Quote Reference" value={order.quoteId ? 'Quote #' + order.quoteId : 'N/A'} />
              <Info label="RFQ Reference" value={order.rfqId ? 'RFQ #' + order.rfqId : 'N/A'} />
            </div>
          </div>

          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <SectionTitle title="Invoice" />
            <div className="mt-4">
              {invoice ? (
                <div className="space-y-4">
                  <Info label="Invoice Reference" value={invoice.invoiceNumber} />
                  <div className="flex gap-2">
                    <StatusBadge value={invoice.status} />
                    <StatusBadge value={invoice.paymentStatus} />
                  </div>
                  <Button 
                    className="w-full mt-2" 
                    variant="outline" 
                    onClick={() => setLocation('/invoices/' + invoice.id)}
                  >
                    View Invoice
                  </Button>
                </div>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={handleCreateInvoice} 
                  disabled={isCreatingInvoice}
                >
                  <Plus className="mr-2 h-4 w-4" /> 
                  {isCreatingInvoice ? "Creating..." : "Create Invoice"}
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <SectionTitle title="Fulfillment" />
            <div className="mt-4">
              {(!invoice || invoice.paymentStatus !== "PAID") ? (
                <div className="text-[13px] text-muted-foreground p-3 border rounded-md bg-muted/20">
                  <p className="font-medium text-foreground mb-1">Fulfillment unavailable</p>
                  Invoice payment must be completed before fulfillment can begin.
                </div>
              ) : fulfillment ? (
                <div className="space-y-4">
                  <Info label="Fulfillment Number" value={fulfillment.fulfillmentNumber} />
                  <div className="flex gap-2">
                    <StatusBadge value={fulfillment.status} />
                  </div>
                  <Button 
                    className="w-full mt-2" 
                    variant="outline" 
                    onClick={() => setLocation('/fulfillment/' + fulfillment.id)}
                  >
                    View Fulfillment
                  </Button>
                </div>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => handleCreateFulfillment()} 
                  disabled={isCreatingFulfillment}
                >
                  <Plus className="mr-2 h-4 w-4" /> 
                  {isCreatingFulfillment ? "Creating..." : "Create Fulfillment"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
