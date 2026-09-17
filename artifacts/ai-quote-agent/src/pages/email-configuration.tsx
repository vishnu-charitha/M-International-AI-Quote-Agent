import { useEffect, useState, type ButtonHTMLAttributes } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useGetMicrosoftStatus, 
  useUpdateMicrosoftConfig, 
  useDisconnectMicrosoft,
  getGetMicrosoftStatusQueryKey 
} from '@workspace/api-client-react';
import { PageHeading, LoadingRows } from '@/components/ops-primitives';
import { Cloud, Link2, Mail, Save, Unplug, AlertCircle } from 'lucide-react';

function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-[10px] font-extrabold transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;
}

export function EmailConfigurationPage() {
  const status = useGetMicrosoftStatus();
  const updateConfig = useUpdateMicrosoftConfig();
  const disconnect = useDisconnectMicrosoft();
  const queryClient = useQueryClient();
  
  const [mailbox, setMailbox] = useState('');
  
  useEffect(() => {
    if (status.data?.mailbox) {
      setMailbox(status.data.mailbox);
    }
  }, [status.data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getGetMicrosoftStatusQueryKey() });
  const connectMicrosoft = () => { window.location.href = '/api/integrations/microsoft/connect'; };
  const disconnectMicrosoft = () => disconnect.mutate(undefined, { onSuccess: refresh });

  const saveConfig = () => {
    updateConfig.mutate({ data: { mailbox } }, {
      onSuccess: () => {
        refresh();
        alert('Configuration saved successfully.');
      }
    });
  };

  if (status.isLoading) return <><PageHeading eyebrow="Administration" title="Email Configuration" /><LoadingRows count={5} /></>;
  
  const connected = status.data?.connected ?? false;
  const configured = status.data?.configured ?? false;
  const development = status.data?.developmentMode ?? false;

  return (
    <div className="fade-up">
      <PageHeading eyebrow="Administration" title="Email Configuration" description="Configure monitored mailboxes and ingestion rules for the AI Quote Agent." />
      
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="space-y-5">
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <div className="eyebrow mb-5">Ingestion Rules</div>
            
            <label className="block mb-4">
              <span className="eyebrow mb-2 block">Monitored Mailbox</span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                  <input 
                    data-testid="input-monitored-mailbox"
                    value={mailbox} 
                    onChange={(e) => setMailbox(e.target.value)}
                    placeholder="e.g. quotes@m-international.com"
                    className="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] pl-9 pr-3 text-[11px] outline-none focus:border-[hsl(var(--accent))]" 
                  />
                </div>
                <Button disabled={updateConfig.isPending} onClick={saveConfig} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                  <Save size={13} /> {updateConfig.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">The email address that the system will monitor for incoming RFQs.</p>
            </label>

            <div className="mt-6 border-t border-[hsl(var(--border))] pt-5 space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold">Auto-process low confidence</div>
                  <div className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">Automatically create RFQs even if AI confidence is low.</div>
                </div>
                <input type="checkbox" className="h-4 w-4" />
              </label>
              
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold">Require human review</div>
                  <div className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">Route all classified RFQs to the review queue first.</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </label>
              
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold">Ignore internal emails</div>
                  <div className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">Do not process emails from the same domain.</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </label>
            </div>
          </div>
        </section>

        <aside>
          <div data-testid="card-integration-microsoft" className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><Cloud size={18} /></div>
              <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] font-bold uppercase ${connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                {connected ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <h2 className="text-[15px] font-extrabold">Microsoft 365</h2>
            <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Mailbox ingestion through Microsoft Graph.</p>
            <div className="mt-5 space-y-2 border-t border-[hsl(var(--border))] pt-4">
              <div className="flex items-center gap-2 text-[10px]">
                <span className={`h-1.5 w-1.5 rounded-full ${configured ? 'bg-emerald-500' : 'bg-amber-500'}`} /> Configuration {configured ? 'available' : 'required'}
              </div>
              {development && <div className="flex items-center gap-2 text-[10px] text-[hsl(var(--accent-foreground))]"><AlertCircle size={12} /> Development mode</div>}
              <div className="text-[10px] leading-5 text-[hsl(var(--muted-foreground))]">{status.data?.message || 'No connection message returned.'}</div>
            </div>
            <div className="mt-6">
              {connected ? 
                <Button data-testid="button-disconnect-microsoft" disabled={disconnect.isPending} onClick={disconnectMicrosoft} className="border border-red-200 bg-red-50 text-red-700"><Unplug size={13} /> Disconnect</Button> 
                : <Button data-testid="button-connect-microsoft" onClick={connectMicrosoft} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Link2 size={13} /> Connect Microsoft 365</Button>
              }
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
