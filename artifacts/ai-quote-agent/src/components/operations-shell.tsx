import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Activity,
  Archive,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  PackageCheck,
  Plane,
  ReceiptText,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
  X,
} from 'lucide-react';

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; badge?: string };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: 'Command center',
    items: [
      { label: 'Overview', href: '/', icon: LayoutDashboard },
      { label: 'RFQ inbox', href: '/rfq-inbox', icon: Inbox, badge: '12' },
      { label: 'AI review', href: '/ai-review', icon: Sparkles, badge: '4' },
      { label: 'Email inbox', href: '/email-inbox', icon: FileText },
    ],
  },
  {
    label: 'Workflows',
    items: [
      { label: 'Parts exchange', href: '/parts-exchange', icon: ArrowUpRight },
      { label: 'New parts purchase', href: '/new-parts-purchase', icon: ShoppingCart },
      { label: 'Repair & overhaul', href: '/repair-overhaul', icon: Settings2 },
      { label: 'Compliance', href: '/compliance', icon: ShieldCheck },
      { label: 'Inventory', href: '/inventory', icon: Boxes },
      { label: 'Pricing', href: '/pricing', icon: BarChart3 },
      { label: 'Quotes', href: '/quotes', icon: ReceiptText },
      { label: 'Orders', href: '/orders', icon: ClipboardCheck },
      { label: 'Fulfillment', href: '/fulfillment', icon: PackageCheck },
      { label: 'Shipping', href: '/shipping', icon: Truck },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Email configuration', href: '/email-configuration', icon: Archive },
      { label: 'Users', href: '/users', icon: Users },
      { label: 'Settings', href: '/settings', icon: Settings2 },
    ],
  },
];

export function OperationsShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workflowsOpen, setWorkflowsOpen] = useState(true);

  return (
    <div className="app-shell flex">
      {mobileOpen && <button data-testid="button-close-sidebar-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-[hsl(var(--primary)/.35)] md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-transform duration-200 md:sticky md:top-0 md:h-[100dvh] md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-[hsl(var(--sidebar-border))] px-5">
          <Link href="/" data-testid="link-brand" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]">
              <Plane size={19} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[13px] font-extrabold tracking-[.16em] text-[hsl(var(--sidebar-foreground))]">M INTL</div>
              <div className="mono mt-0.5 text-[9px] tracking-[.12em] text-[hsl(var(--sidebar-foreground)/.56)]">QUOTE AGENT / OPS</div>
            </div>
          </Link>
          <button data-testid="button-close-sidebar" aria-label="Close sidebar" onClick={() => setMobileOpen(false)} className="rounded-md p-1 text-[hsl(var(--sidebar-foreground)/.6)] hover:bg-[hsl(var(--sidebar-accent))] md:hidden"><X size={17} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <div key={group.label} className="mb-7">
              <button data-testid={`button-toggle-${group.label.replace(/\s/g, '-')}`} onClick={() => group.label === 'Workflows' && setWorkflowsOpen((v) => !v)} className="mb-2 flex w-full items-center justify-between px-3 text-left">
                <span className="eyebrow text-[hsl(var(--sidebar-foreground)/.42)]">{group.label}</span>
                {group.label === 'Workflows' && <ChevronDown size={13} className={`text-[hsl(var(--sidebar-foreground)/.4)] transition-transform ${workflowsOpen ? '' : '-rotate-90'}`} />}
              </button>
              {(group.label !== 'Workflows' || workflowsOpen) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href} data-testid={`link-nav-${item.label.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-[12px] font-semibold transition-colors ${active ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.65)] hover:bg-[hsl(var(--sidebar-accent)/.65)] hover:text-[hsl(var(--sidebar-foreground))]'}`}>
                        <Icon size={16} strokeWidth={active ? 2.3 : 1.8} className={active ? 'text-[hsl(var(--sidebar-primary))]' : ''} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && <span className={`mono rounded px-1.5 py-0.5 text-[9px] ${active ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]' : 'bg-[hsl(var(--sidebar-foreground)/.1)] text-[hsl(var(--sidebar-foreground)/.58)]'}`}>{item.badge}</span>}
                        {active && !item.badge && <ChevronRight size={13} className="text-[hsl(var(--sidebar-foreground)/.34)]" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-[hsl(var(--sidebar-border))] p-3">
          <div className="flex items-center gap-3 rounded-md bg-[hsl(var(--sidebar-accent)/.7)] px-3 py-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--sidebar-primary))] text-[11px] font-extrabold text-[hsl(var(--sidebar-primary-foreground))]">AR</div>
            <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-bold">Alex Rivera</div><div className="truncate text-[10px] text-[hsl(var(--sidebar-foreground)/.5)]">Operations desk</div></div>
            <button data-testid="button-help" aria-label="Help" className="text-[hsl(var(--sidebar-foreground)/.5)] hover:text-[hsl(var(--sidebar-foreground))]"><CircleHelp size={15} /></button>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.92)] px-5 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button data-testid="button-open-sidebar" aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] md:hidden"><Menu size={19} /></button>
            <div className="hidden items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))] sm:flex"><Activity size={14} className="text-[hsl(var(--accent))]" /><span className="mono">OPS / LIVE</span><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--chart-3))]" /></div>
            <span className="hidden text-[11px] text-[hsl(var(--muted-foreground)/.7)] sm:inline">All systems operational</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button data-testid="button-notifications" aria-label="Notifications" className="relative rounded-md p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /></button>
            <div className="hidden h-5 w-px bg-[hsl(var(--border))] sm:block" />
            <div className="hidden text-right sm:block"><div className="text-[11px] font-bold">Tuesday, 18 Jun 2024</div><div className="mono text-[9px] text-[hsl(var(--muted-foreground))]">14:32 UTC</div></div>
            <div className="grid h-8 w-8 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[10px] font-extrabold text-[hsl(var(--primary))]">AR</div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1536px] px-5 py-7 md:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
