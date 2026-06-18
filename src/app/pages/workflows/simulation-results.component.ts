import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

type ScenarioId = 'mix' | 'termination' | 'email' | 'failure' | 'skipped' | 'empty';
type SimStatus = 'matched' | 'skipped' | 'not-evaluated';

interface SimCondition {
  pass: boolean;
  field: string;
  operator: string;
  value: string;
  actual?: string;
}
interface DiffAction {
  kind: 'diff';
  icon: string;
  title: string;
  before: string;
  after: string;
  wildcardResolved?: string;
}
interface CommentAction {
  kind: 'comment';
  visibility: 'public' | 'internal';
  body: string;
}
interface EmailAction {
  kind: 'email';
  from: string;
  to: string;
  subject: string;
  body: string;
}
interface CreateTicketAction {
  kind: 'create_ticket';
  ticket: { subject: string; type: string; topic: string; priority: string; description: string; };
}
interface FailingAction {
  kind: 'failing';
  icon: string;
  title: string;
  target: string;
  reason: string;
}
type SimAction = DiffAction | CommentAction | EmailAction | CreateTicketAction | FailingAction;

interface SimWorkflow {
  id: string;
  name: string;
  status: SimStatus;
  stopAfter?: boolean;
  notEvaluatedReason?: { outcome: string; because: string };
  conditionsSummary?: string;
  conditionGroupMode?: 'ALL' | 'ANY';
  conditions?: SimCondition[];
  actions?: SimAction[];
}

interface SimCard {
  __terminationAfter?: false;
  wf: SimWorkflow;
  defaultExpanded?: boolean;
}
interface SimTermination {
  __terminationAfter: true;
  remaining: number;
}
type ScenarioCard = SimCard | SimTermination;

interface Scenario {
  id: ScenarioId;
  label: string;
  hint: string;
  durationMs: number;
  cards: ScenarioCard[];
  empty?: boolean;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'mix',
    label: 'Typical mix',
    hint: 'Matched, skipped, and another matched in the same run.',
    durationMs: 412,
    cards: [
      {
        wf: {
          id: 'wf-1', name: 'Require approval for software purchases', status: 'matched',
          conditionsSummary: 'all met',
          conditionGroupMode: 'ALL',
          conditions: [
            { pass: true, field: 'Topic',               operator: 'is',     value: 'Procurement', actual: 'Procurement' },
            { pass: true, field: 'Organizational Unit', operator: 'is not', value: 'Operations',  actual: 'Curriculum' },
          ],
          actions: [
            { kind: 'diff', icon: 'flag',   title: 'Set priority', before: 'Medium', after: 'High' },
            { kind: 'comment', visibility: 'internal',
              body: 'New software request requires approval — routing to Director of Finance.' },
            { kind: 'diff', icon: 'person', title: 'Assign to', before: 'Unassigned', after: 'Sarah Chen' },
          ],
        },
        defaultExpanded: true,
      },
      {
        wf: {
          id: 'wf-2', name: 'Route high-priority tickets to on-call team', status: 'skipped',
          conditionsSummary: '1 of 1 failed',
          conditions: [
            { pass: false, field: 'Priority', operator: 'is', value: 'High', actual: 'Medium' },
          ],
        },
        defaultExpanded: false,
      },
      {
        wf: {
          id: 'wf-3', name: 'Auto-tag new tickets and follow requester manager', status: 'matched',
          conditionsSummary: 'no conditions',
          actions: [
            { kind: 'diff', icon: 'label',      title: 'Add tag',      before: 'none', after: 'First Touch' },
            { kind: 'diff', icon: 'person_add', title: 'Add follower', before: 'none', after: 'priya.patel@district.example', wildcardResolved: '{{ticket.requester.manager}}' },
          ],
        },
        defaultExpanded: false,
      },
    ],
  },
  {
    id: 'termination',
    label: 'Termination',
    hint: 'First workflow matched with Stop set — rest not evaluated.',
    durationMs: 218,
    cards: [
      {
        wf: {
          id: 'wf-1', name: 'Require approval for software purchases', status: 'matched',
          stopAfter: true,
          conditionsSummary: 'all met',
          conditions: [
            { pass: true, field: 'Topic', operator: 'is', value: 'Procurement', actual: 'Procurement' },
          ],
          actions: [
            { kind: 'diff', icon: 'flag', title: 'Set priority', before: 'Medium', after: 'High' },
            { kind: 'comment', visibility: 'internal', body: 'Routing to Director of Finance for approval.' },
          ],
        },
        defaultExpanded: true,
      },
      { __terminationAfter: true, remaining: 2 },
      {
        wf: { id: 'wf-2', name: 'Route high-priority tickets to on-call team', status: 'not-evaluated',
              notEvaluatedReason: { outcome: 'be skipped', because: 'priority was not High.' } },
        defaultExpanded: false,
      },
      {
        wf: { id: 'wf-3', name: 'Auto-tag new tickets and follow requester manager', status: 'not-evaluated',
              notEvaluatedReason: { outcome: 'run unconditionally', because: 'it has no conditions.' } },
        defaultExpanded: false,
      },
    ],
  },
  {
    id: 'email',
    label: 'Email preview',
    hint: 'An external Send Email action rendered as a preview card.',
    durationMs: 367,
    cards: [
      {
        wf: {
          id: 'wf-email', name: 'Notify procurement of new approval request', status: 'matched',
          conditionsSummary: 'all met',
          conditions: [
            { pass: true, field: 'Topic',    operator: 'is', value: 'Procurement', actual: 'Procurement' },
            { pass: true, field: 'Priority', operator: 'is', value: 'High',        actual: 'High' },
          ],
          actions: [
            {
              kind: 'email',
              from: 'workflows@district.example',
              to: 'procurement@district.example',
              subject: 'New approval request — TKT-10472',
              body: 'A new procurement request has been submitted and requires your review.\n\nView ticket: https://onflo.app/tickets/10472',
            },
          ],
        },
        defaultExpanded: true,
      },
    ],
  },
  {
    id: 'failure',
    label: 'Predicted failure',
    hint: 'Actions that would fail at runtime, surfaced as amber warnings.',
    durationMs: 311,
    cards: [
      {
        wf: {
          id: 'wf-failing', name: 'Sync VIP customers to Salesforce', status: 'matched',
          conditionsSummary: 'all met',
          conditions: [
            { pass: true, field: 'Customer Type', operator: 'is', value: 'VIP', actual: 'VIP' },
          ],
          actions: [
            {
              kind: 'failing', icon: 'cloud_sync', title: 'Sync to Salesforce', target: 'Account → Acme Corp',
              reason: 'Connector returned 502 in the last test run; the integration may need re-authentication.',
            },
            {
              kind: 'failing', icon: 'send', title: 'Send email', target: 'vp.sales@acme.example',
              reason: 'Recipient address is invalid (no MX record).',
            },
          ],
        },
        defaultExpanded: true,
      },
    ],
  },
  {
    id: 'skipped',
    label: 'Skipped detail',
    hint: 'Expanded skipped workflow showing which condition failed.',
    durationMs: 154,
    cards: [
      {
        wf: {
          id: 'wf-skipped', name: 'Escalate stale VIP tickets after 2 hours', status: 'skipped',
          conditionsSummary: '1 of 2 failed',
          conditionGroupMode: 'ALL',
          conditions: [
            { pass: true,  field: 'Customer Type', operator: 'is',           value: 'VIP', actual: 'VIP' },
            { pass: false, field: 'Ticket Age',    operator: 'is more than', value: '2',   actual: '0.6' },
          ],
        },
        defaultExpanded: true,
      },
    ],
  },
  {
    id: 'empty',
    label: 'Empty bucket',
    hint: 'No workflows exist for this trigger.',
    durationMs: 38,
    cards: [],
    empty: true,
  },
];

@Component({
  selector: 'app-simulation-results',
  standalone: true,
  templateUrl: './simulation-results.component.html',
  styleUrl: './simulation-results.component.scss',
  host: { class: 'ds-page-content', role: 'main' },
})
export class SimulationResultsComponent {
  scenarios = SCENARIOS;
  scenarioIdx = signal<number>(0);
  recordId    = signal<string>('TKT-10472');
  durationMs  = signal<number>(412);
  expandedById = signal<Record<string, boolean>>({});

  scenario = computed<Scenario>(() => this.scenarios[this.scenarioIdx()]);

  metrics = computed(() => {
    const s = this.scenario();
    if (s.empty) return { evaluated: 0, matched: 0, skipped: 0, notEval: 0 };
    let evaluated = 0, matched = 0, skipped = 0, notEval = 0;
    s.cards.forEach(c => {
      if ('__terminationAfter' in c && c.__terminationAfter) return;
      if (!('wf' in c)) return;
      const status = c.wf.status;
      if (status === 'matched')        { evaluated++; matched++; }
      else if (status === 'skipped')   { evaluated++; skipped++; }
      else if (status === 'not-evaluated') { notEval++; }
    });
    return { evaluated, matched, skipped, notEval };
  });

  constructor(private route: ActivatedRoute, private router: Router) {
    this.route.queryParamMap.subscribe(p => {
      const sid = p.get('scenario');
      const idx = sid ? this.scenarios.findIndex(s => s.id === sid) : 0;
      this.scenarioIdx.set(idx >= 0 ? idx : 0);
      this.durationMs.set(this.scenarios[idx >= 0 ? idx : 0].durationMs);
      this.recordId.set(p.get('record') ?? 'TKT-10472');
      this.initExpandedMap();
    });
  }

  pickScenario(idx: number): void {
    this.scenarioIdx.set(idx);
    this.durationMs.set(this.scenarios[idx].durationMs);
    this.router.navigate([], { queryParams: { scenario: this.scenarios[idx].id }, queryParamsHandling: 'merge' });
    this.initExpandedMap();
  }

  private initExpandedMap(): void {
    const map: Record<string, boolean> = {};
    this.scenario().cards.forEach(c => {
      if ('wf' in c && c.wf) map[c.wf.id] = !!c.defaultExpanded;
    });
    this.expandedById.set(map);
  }

  isCardExpanded(id: string): boolean { return !!this.expandedById()[id]; }

  toggleCard(id: string): void {
    this.expandedById.update(m => ({ ...m, [id]: !m[id] }));
  }

  runAgain(): void {
    const next = (this.scenarioIdx() + 1) % this.scenarios.length;
    this.pickScenario(next);
  }

  close(): void {
    this.router.navigate(['/workflows']);
  }

  // Type guards for the template ---------------------------------------------
  isTermination(c: ScenarioCard): c is SimTermination {
    return '__terminationAfter' in c && c.__terminationAfter === true;
  }
  isCard(c: ScenarioCard): c is SimCard {
    return !('__terminationAfter' in c && c.__terminationAfter === true);
  }

  pad2(n: number): string { return String(n).padStart(2, '0'); }

  position(i: number): number {
    // count non-termination cards up to and including i
    return this.scenario().cards.slice(0, i + 1).filter(c => !this.isTermination(c)).length;
  }

  asDiff(a: SimAction): DiffAction | null { return a.kind === 'diff' ? a : null; }
  asComment(a: SimAction): CommentAction | null { return a.kind === 'comment' ? a : null; }
  asEmail(a: SimAction): EmailAction | null { return a.kind === 'email' ? a : null; }
  asCreateTicket(a: SimAction): CreateTicketAction | null { return a.kind === 'create_ticket' ? a : null; }
  asFailing(a: SimAction): FailingAction | null { return a.kind === 'failing' ? a : null; }
}
