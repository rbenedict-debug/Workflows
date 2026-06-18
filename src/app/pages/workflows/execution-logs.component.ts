import { Component, HostListener, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TRIGGER_ICONS, TRIGGERS, workflowById, type Workflow } from './workflow-data';

type EventStatus = 'matched' | 'partial' | 'failed' | 'skipped' | 'halted';

interface EventAction {
  status: 'ok' | 'failed';
  summary: string;
  durationMs: number;
  output?: string;
  error?: string;
}
interface EventConditionRule {
  pass: boolean;
  field: string;
  operator: string;
  expected: string;
  actual: string;
}
interface EventConditionGroup {
  mode: 'ALL' | 'ANY';
  passed: boolean;
  rules: EventConditionRule[];
}
interface ExecutionEvent {
  id: string;
  timestamp: number;
  status: EventStatus;
  durationMs: number;
  evalMs: number;
  stopAfter: boolean;
  skipReason?: string;
  trigger: {
    label: string;
    icon: string;
    record: {
      id: string;
      title: string;
      fields: Record<string, string>;
    };
  };
  conditions: { allPassed: boolean; groups: EventConditionGroup[] };
  actions: EventAction[];
}

const STATUS_LABELS: Record<EventStatus, string> = {
  matched: 'Matched',
  partial: 'Action error',
  failed: 'Failed',
  skipped: 'Skipped',
  halted: 'Halted',
};
const STATUS_ICONS: Record<EventStatus, string> = {
  matched: 'check_circle',
  partial: 'error',
  failed: 'cancel',
  skipped: 'remove_circle_outline',
  halted: 'block',
};

const RANGE_OPTIONS = [
  { id: '1h',  label: 'Last hour' },
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d',  label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
];
const STATUS_CHIPS: Array<{ id: 'all' | EventStatus; label: string }> = [
  { id: 'all',     label: 'All' },
  { id: 'matched', label: 'Matched' },
  { id: 'partial', label: 'Action errors' },
  { id: 'failed',  label: 'Failed' },
  { id: 'skipped', label: 'Skipped' },
  { id: 'halted',  label: 'Halted' },
];

@Component({
  selector: 'app-execution-logs',
  standalone: true,
  templateUrl: './execution-logs.component.html',
  styleUrl: './execution-logs.component.scss',
  host: { class: 'ds-page-content', role: 'main' },
})
export class ExecutionLogsComponent {
  rangeOptions = RANGE_OPTIONS;
  statusChips = STATUS_CHIPS;

  workflow = signal<Workflow | null>(null);
  events   = signal<ExecutionEvent[]>([]);

  range        = signal<string>('24h');
  statusFilter = signal<'all' | EventStatus>('all');
  search       = signal<string>('');
  live         = signal<boolean>(true);
  expanded     = signal<Record<string, boolean>>({});
  now          = signal<number>(Date.now());

  // Angular-driven ds-select for the range filter.
  rangeOpen = signal<boolean>(false);

  workflowMeta = computed(() => {
    const wf = this.workflow();
    if (!wf) return null;
    const triggerLabel = TRIGGERS[wf.categoryId].find(t => t.id === wf.triggerId)?.label ?? wf.triggerId;
    return {
      categoryLabel: wf.categoryId.charAt(0).toUpperCase() + wf.categoryId.slice(1),
      triggerLabel,
      triggerIcon: TRIGGER_ICONS[wf.triggerId] ?? 'bolt',
    };
  });

  filtered = computed<ExecutionEvent[]>(() => {
    const q = this.search().trim().toLowerCase();
    const sf = this.statusFilter();
    return this.events().filter(e => {
      if (sf !== 'all' && e.status !== sf) return false;
      if (q) {
        const r = e.trigger.record;
        const hay = `${r.id} ${r.title}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  counts = computed(() => {
    const c = { total: this.events().length, matched: 0, partial: 0, failed: 0, skipped: 0, halted: 0 };
    this.events().forEach(e => { (c as Record<string, number>)[e.status] = ((c as Record<string, number>)[e.status] ?? 0) + 1; });
    return c;
  });

  kpi = computed(() => {
    const c = this.counts();
    const ev = this.events();
    const matched = c.matched + c.partial;
    const total = c.total || 1;
    const rate = Math.round((matched / total) * 100);
    const errs = c.failed + c.partial;
    const totalMs = ev.reduce((s, e) => s + e.durationMs, 0);
    const avg = ev.length ? Math.round(totalMs / ev.length) : 0;
    return { runs: c.total, rate, skipped: c.skipped, errors: errs, avg };
  });

  skippedPercent = computed<number>(() => {
    const k = this.kpi();
    return k.runs > 0 ? Math.round((k.skipped / k.runs) * 100) : 0;
  });

  grouped = computed<Array<{ type: 'header' | 'event'; key?: string; ts?: number; evt?: ExecutionEvent }>>(() => {
    const out: Array<{ type: 'header' | 'event'; key?: string; ts?: number; evt?: ExecutionEvent }> = [];
    let lastKey: string | null = null;
    const n = this.now();
    this.filtered().forEach(e => {
      const key = this.dayHeader(e.timestamp, n);
      if (key !== lastKey) {
        out.push({ type: 'header', key, ts: e.timestamp });
        lastKey = key;
      }
      out.push({ type: 'event', evt: e });
    });
    return out;
  });

  constructor(private route: ActivatedRoute, private router: Router) {
    this.route.queryParamMap.subscribe(p => {
      const id = p.get('id');
      if (id) {
        const wf = workflowById(id);
        if (wf) {
          this.workflow.set(wf);
          this.events.set(this.generateEvents(wf));
        }
      } else {
        this.workflow.set(workflowById('wf-1'));
        this.events.set(this.generateEvents(workflowById('wf-1')!));
      }
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.rangeOpen.set(false); }

  // ── Filter mutations ──────────────────────────────────────────────────────
  setRange(v: string)        { this.range.set(v); }
  setStatusFilter(v: 'all' | EventStatus) { this.statusFilter.set(v); }
  setSearch(v: string)       { this.search.set(v); }
  toggleLive()               { this.live.update(v => !v); }
  refresh()                  { this.now.set(Date.now()); }

  toggleRange(event: Event): void {
    event.stopPropagation();
    this.rangeOpen.update(o => !o);
  }
  chooseRange(v: string, event: Event): void {
    event.stopPropagation();
    this.range.set(v);
    this.rangeOpen.set(false);
  }

  expandAll(): void {
    const map: Record<string, boolean> = {};
    this.filtered().forEach(e => { map[e.id] = true; });
    this.expanded.set(map);
  }

  collapseAll(): void { this.expanded.set({}); }

  toggle(id: string): void {
    this.expanded.update(m => ({ ...m, [id]: !m[id] }));
  }

  isExpanded(id: string): boolean { return !!this.expanded()[id]; }

  // ── Formatters ────────────────────────────────────────────────────────────
  formatTime(ts: number): string {
    const d = new Date(ts);
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m}:${s} ${ap}`;
  }

  formatDuration(ms: number): string {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  }

  formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString();
  }

  formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString();
  }

  statusLabel(s: EventStatus): string { return STATUS_LABELS[s]; }
  statusIcon(s: EventStatus): string  { return STATUS_ICONS[s]; }

  statusCount(id: 'all' | EventStatus): number {
    const c = this.counts();
    if (id === 'all') return c.total;
    return (c as Record<string, number>)[id] ?? 0;
  }

  rangeLabel(): string {
    return RANGE_OPTIONS.find(r => r.id === this.range())?.label ?? 'Last 24 hours';
  }

  fieldEntries(fields: Record<string, string>): Array<[string, string]> {
    return Object.entries(fields).slice(0, 8);
  }

  conditionTotals(evt: ExecutionEvent): { passed: number; total: number } {
    const total = evt.conditions.groups.reduce((s, g) => s + g.rules.length, 0);
    const passed = evt.conditions.groups.reduce((s, g) => s + g.rules.filter(r => r.pass).length, 0);
    return { passed, total };
  }

  actionTotals(evt: ExecutionEvent): { ok: number; total: number } {
    const total = evt.actions.length;
    const ok = evt.actions.filter(a => a.status === 'ok').length;
    return { ok, total };
  }

  pad2(n: number): string { return String(n).padStart(2, '0'); }

  // ── Navigation ────────────────────────────────────────────────────────────
  editWorkflow(id: string): void {
    this.router.navigate(['/workflows/builder'], { queryParams: { id } });
  }

  back(): void {
    this.router.navigate(['/workflows']);
  }

  // ── Mock event generator (TODO eng: replace with real log stream) ─────────
  private dayHeader(ts: number, now: number): string {
    const d = new Date(ts);
    const today = new Date(now);
    const yesterday = new Date(now - 86400000);
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (sameDay(d, today)) return 'Today';
    if (sameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  private generateEvents(wf: Workflow): ExecutionEvent[] {
    const subjects = [
      'Software license renewal — Figma Org',
      'Order new tablets for media center',
      'Adobe Creative Cloud — 6 seats',
      'Replacement projector for Room 214',
      'Laptop won\'t boot after update',
      'Replace cracked screen on iPad-2241',
      'New hire account setup — J. Park',
      'PowerSchool permissions for new VP',
      'Wi-Fi dropping in 2nd floor wing',
      'VPN client won\'t connect from home',
    ];
    const names = ['Andrew Park', 'Priya Patel', 'Marcus Johnson', 'Elena Brooks', 'Sarah Chen', 'Jamal Adams', 'Lien Nguyen', 'Devon Williams'];
    const statuses: EventStatus[] = ['matched', 'matched', 'matched', 'matched', 'skipped', 'partial', 'failed', 'skipped', 'halted'];
    const now = Date.now();
    const out: ExecutionEvent[] = [];
    for (let i = 0; i < 28; i++) {
      const status = statuses[i % statuses.length];
      const ticketId = `TKT-${10472 - i * 11}`;
      const subj = subjects[i % subjects.length];
      const person = names[i % names.length];
      const evalMs = 12 + (i * 3) % 28;
      const actDurations = wf.actions.map((_, k) => 18 + ((i + k) * 7) % 90);
      const actSum = actDurations.reduce((a, b) => a + b, 0);
      const total = evalMs + (status === 'skipped' || status === 'halted' ? 0 : actSum);
      const condRules: EventConditionRule[] = wf.conditions.map((c, k) => ({
        pass: status === 'matched' || status === 'partial' || status === 'failed' || (status === 'skipped' && k > 0),
        field: c.field,
        operator: c.operator,
        expected: c.value,
        actual: (status === 'skipped' && k === 0) ? 'Hardware' : c.value,
      }));
      const condGroup: EventConditionGroup = {
        mode: 'ALL',
        passed: status !== 'skipped',
        rules: condRules,
      };
      const evtActions: EventAction[] = (status === 'skipped' || status === 'halted')
        ? []
        : wf.actions.map((a, k) => {
            const isErr = (status === 'partial' && k === wf.actions.length - 1) || status === 'failed';
            return {
              status: isErr ? 'failed' : 'ok',
              summary: `${a.verb} ${a.target}`,
              durationMs: actDurations[k],
              output: !isErr ? `resolved → ${a.target}` : undefined,
              error: isErr ? 'Connector returned 502 — retry scheduled' : undefined,
            };
          });

      out.push({
        id: `evt-${i}`,
        timestamp: now - i * 1000 * 60 * (i < 8 ? 4 : 70),
        status,
        durationMs: total,
        evalMs,
        stopAfter: wf.stop && status === 'matched' && i === 0,
        skipReason: status === 'halted' ? 'Upstream workflow halted the chain.' : undefined,
        trigger: {
          label: TRIGGERS[wf.categoryId].find(t => t.id === wf.triggerId)?.label ?? wf.triggerId,
          icon: TRIGGER_ICONS[wf.triggerId] ?? 'bolt',
          record: {
            id: ticketId,
            title: subj,
            fields: {
              'Ticket ID': ticketId,
              'Subject': subj,
              'Topic': i % 3 === 0 ? 'Procurement' : 'Hardware',
              'Priority': i % 2 ? 'High' : 'Medium',
              'Status': 'New',
              'Entry Point': i % 4 === 0 ? 'Email' : 'Portal',
              'Customer': person,
              'Customer Type': i % 5 === 0 ? 'VIP' : 'Standard',
            },
          },
        },
        conditions: { allPassed: status !== 'skipped', groups: [condGroup] },
        actions: evtActions,
      });
    }
    return out;
  }
}
