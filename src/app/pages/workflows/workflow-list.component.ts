import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CATEGORIES, TRIGGERS, countFor, workflowsFor,
  type CategoryDef, type TriggerDef, type Workflow,
} from './workflow-data';

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  templateUrl: './workflow-list.component.html',
  styleUrl: './workflow-list.component.scss',
  host: { class: 'ds-page-content', role: 'main' },
})
export class WorkflowListComponent {
  readonly categories = CATEGORIES;

  categoryId = signal<'tickets' | 'assets' | 'users'>('tickets');
  triggerId  = signal<string>('ticket-created');
  search     = signal<string>('');
  tagFilter  = signal<string | null>(null);
  page       = signal<number>(1);
  perPage    = signal<number>(10);
  collapseAll = signal<boolean>(false);
  expandedMap = signal<Record<string, boolean>>({});
  testRunOpen = signal<boolean>(false);
  testRecordId = signal<string>('TKT-10472');
  testPhase = signal<'configure' | 'running' | 'result'>('configure');
  testResult = signal<{ evaluated: number; matched: number; skipped: number; durationMs: number; recordId: string } | null>(null);
  openMenuId = signal<string | null>(null);

  triggers = computed<TriggerDef[]>(() => TRIGGERS[this.categoryId()]);
  category = computed<CategoryDef>(() => this.categories.find(c => c.id === this.categoryId())!);
  trigger  = computed<TriggerDef>(() => this.triggers().find(t => t.id === this.triggerId()) ?? this.triggers()[0]);

  allWorkflows = computed<Workflow[]>(() => workflowsFor(this.categoryId(), this.trigger().id));

  filtered = computed<Workflow[]>(() => {
    const q = this.search().trim().toLowerCase();
    const tag = this.tagFilter();
    return this.allWorkflows().filter(w => {
      if (q) {
        const matchesName = w.name.toLowerCase().includes(q);
        const matchesTag  = w.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesName && !matchesTag) return false;
      }
      if (tag && !w.tags.includes(tag)) return false;
      return true;
    });
  });

  totalPages = computed<number>(() => Math.max(1, Math.ceil(this.filtered().length / this.perPage())));
  safePage   = computed<number>(() => Math.min(this.page(), this.totalPages()));
  start      = computed<number>(() => (this.safePage() - 1) * this.perPage());
  end        = computed<number>(() => Math.min(this.start() + this.perPage(), this.filtered().length));
  visible    = computed<Workflow[]>(() => this.filtered().slice(this.start(), this.end()));
  searchActive = computed<boolean>(() => this.search().trim().length > 0);

  constructor(private route: ActivatedRoute, private router: Router) {
    // Settings → Workflows → Tickets / Assets passes ?category=... to preselect the rail.
    this.route.queryParamMap.subscribe(p => {
      const cat = p.get('category');
      if (cat === 'tickets' || cat === 'assets' || cat === 'users') {
        this.categoryId.set(cat);
        this.triggerId.set(TRIGGERS[cat][0].id);
        this.resetFilters();
      }
    });
  }

  countFor(cat: string, trig: string): number { return countFor(cat, trig); }

  pickCategory(cat: 'tickets' | 'assets' | 'users'): void {
    if (cat === this.categoryId()) return;
    this.categoryId.set(cat);
    this.triggerId.set(TRIGGERS[cat][0].id);
    this.resetFilters();
  }

  pickTrigger(t: string): void {
    if (t === this.triggerId()) return;
    this.triggerId.set(t);
    this.resetFilters();
  }

  private resetFilters(): void {
    this.search.set('');
    this.tagFilter.set(null);
    this.page.set(1);
    this.expandedMap.set({});
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  setPerPage(n: number): void {
    this.perPage.set(n);
    this.page.set(1);
  }

  setPage(n: number): void {
    if (n < 1 || n > this.totalPages()) return;
    this.page.set(n);
  }

  clearTagFilter(): void { this.tagFilter.set(null); }

  toggleCollapseAll(checked: boolean): void {
    this.collapseAll.set(checked);
    this.expandedMap.set({});
  }

  isCollapsed(id: string): boolean {
    if (this.collapseAll()) return true;
    const map = this.expandedMap();
    return id in map ? !map[id] : false;
  }

  toggleCollapsed(id: string): void {
    if (this.collapseAll()) { this.collapseAll.set(false); return; }
    const map = { ...this.expandedMap() };
    const current = id in map ? map[id] : true;
    map[id] = !current;
    this.expandedMap.set(map);
  }

  openBuilder(params: Record<string, string | number>): void {
    this.router.navigate(['/workflows/builder'], { queryParams: params });
  }

  openLogs(id: string): void {
    this.router.navigate(['/workflows/logs'], { queryParams: { id } });
  }

  openSimulation(): void {
    this.router.navigate(['/workflows/simulation'], {
      queryParams: {
        category: this.categoryId(),
        trigger: this.trigger().id,
        record: this.testResult()?.recordId ?? this.testRecordId(),
        ms: String(this.testResult()?.durationMs ?? 412),
      },
    });
  }

  toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  closeMenu(): void { this.openMenuId.set(null); }

  // TODO eng: wire reorder / disable / delete to OnfloStore. Static no-ops here.
  onWorkflowAction(workflowId: string, actionId: string, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    if (actionId === 'edit') {
      this.openBuilder({ id: workflowId });
    } else if (actionId === 'view-logs') {
      this.openLogs(workflowId);
    } else if (actionId === 'copy') {
      this.openBuilder({ id: workflowId });
    }
  }

  // Test run dialog ----------------------------------------------------------
  openTestRun(): void {
    this.testRecordId.set(this.sampleIdFor(this.categoryId()));
    this.testPhase.set('configure');
    this.testResult.set(null);
    this.testRunOpen.set(true);
  }

  closeTestRun(): void {
    this.testRunOpen.set(false);
  }

  runTest(): void {
    this.testPhase.set('running');
    setTimeout(() => {
      const evaluated = this.allWorkflows().length;
      const matched = Math.max(0, Math.min(evaluated, Math.round(evaluated * 0.6)));
      this.testResult.set({
        evaluated,
        matched,
        skipped: evaluated - matched,
        durationMs: 180 + Math.round(Math.random() * 240),
        recordId: this.testRecordId(),
      });
      this.testPhase.set('result');
    }, 700);
  }

  runTestAgain(): void {
    this.testResult.set(null);
    this.testPhase.set('configure');
  }

  setTestRecordId(value: string): void { this.testRecordId.set(value); }

  sampleNounFor(cat: string): string {
    return ({ tickets: 'ticket', assets: 'asset', users: 'user' } as Record<string, string>)[cat] ?? 'record';
  }

  private sampleIdFor(cat: string): string {
    const prefix = ({ tickets: 'TKT', assets: 'AST', users: 'USR' } as Record<string, string>)[cat] ?? 'REC';
    return `${prefix}-10472`;
  }

  positionLabel(index: number): string {
    const n = this.start() + index + 1;
    return String(n).padStart(2, '0');
  }
}
