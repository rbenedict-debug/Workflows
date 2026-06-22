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
  testResult = signal<{ ok: boolean; error?: string; evaluated: number; matched: number; skipped: number; durationMs: number; recordId: string } | null>(null);
  openMenuId = signal<string | null>(null);
  deleteTarget = signal<Workflow | null>(null);  // workflow pending delete confirmation

  // ── Drag-to-reorder state (native HTML5 DnD — no CDK in design mode) ──
  armedId    = signal<string | null>(null);  // card whose handle is grabbed → draggable
  draggedId  = signal<string | null>(null);  // card currently being dragged
  dragOverId = signal<string | null>(null);  // current drop-target card
  private _ghost: HTMLElement | null = null;  // floating clone that follows the cursor
  private _grabX = 0;                          // cursor offset within the grabbed card
  private _grabY = 0;

  triggers = computed<TriggerDef[]>(() => TRIGGERS[this.categoryId()]);
  category = computed<CategoryDef>(() => this.categories.find(c => c.id === this.categoryId())!);
  trigger  = computed<TriggerDef>(() => this.triggers().find(t => t.id === this.triggerId()) ?? this.triggers()[0]);

  // Mutable, reorderable working copy for the active category + trigger.
  // Drag-to-reorder mutates this; reloadWorkflows() resets it on context change.
  allWorkflows = signal<Workflow[]>([]);

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
    this.reloadWorkflows();
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
    this.reloadWorkflows();
  }

  // Reload the default-ordered workflows for the active category + trigger.
  private reloadWorkflows(): void {
    this.allWorkflows.set(workflowsFor(this.categoryId(), this.trigger().id));
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
    const map = this.expandedMap();
    // A per-card override wins; otherwise fall back to the collapse-all baseline.
    if (id in map) return !map[id];
    return this.collapseAll();
  }

  toggleCollapsed(id: string): void {
    // Flip only this card, recorded as an override, so the rest keep their state —
    // e.g. after "Collapse all" you can expand one card and the others stay collapsed.
    const wasCollapsed = this.isCollapsed(id);
    this.expandedMap.update(map => ({ ...map, [id]: wasCollapsed }));
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

  // ── Drag-to-reorder (native HTML5 DnD; design-mode safe, no CDK) ──────────────
  // Only the rail handle arms a card for dragging, so clicks/selection elsewhere on
  // the card aren't hijacked. Reordering mutates allWorkflows; the position numbers
  // re-derive from the new index automatically.
  // TODO eng: swap native DnD for @angular/cdk/drag-drop and persist the new order to
  // OnfloStore — this in-session reorder resets when the category/trigger changes.
  armDrag(id: string): void {
    if (this.searchActive()) return;            // reorder is disabled while searching
    this.armedId.set(id);
  }

  onDragStart(event: DragEvent, id: string): void {
    if (this.armedId() !== id) { event.preventDefault(); return; }
    this.draggedId.set(id);
    const dt = event.dataTransfer;
    if (!dt) return;
    dt.setData('text/plain', id);   // Firefox needs data set to start a drag
    dt.effectAllowed = 'move';

    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    this._grabX = event.clientX - rect.left;
    this._grabY = event.clientY - rect.top;

    // The native drag image is a bitmap that fills the card's rounded corners with
    // white. Hide it with a 1px transparent image, then follow the cursor with a real
    // cloned element so the ghost keeps the card's exact rounded styling.
    const blank = document.createElement('div');
    blank.style.cssText = 'position:fixed;top:-20px;left:-20px;width:1px;height:1px;background:transparent;';
    document.body.appendChild(blank);
    dt.setDragImage(blank, 0, 0);
    setTimeout(() => blank.remove(), 0);

    const ghost = card.cloneNode(true) as HTMLElement;
    ghost.classList.add('wf-card--ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.left  = `${event.clientX - this._grabX}px`;
    ghost.style.top   = `${event.clientY - this._grabY}px`;
    document.body.appendChild(ghost);
    this._ghost = ghost;
  }

  onDrag(event: DragEvent): void {
    // The drag event fires continuously; the final one can report (0,0) — ignore it.
    if (!this._ghost || (event.clientX === 0 && event.clientY === 0)) return;
    this._ghost.style.left = `${event.clientX - this._grabX}px`;
    this._ghost.style.top  = `${event.clientY - this._grabY}px`;
  }

  onDragOver(event: DragEvent, id: string): void {
    if (!this.draggedId()) return;
    event.preventDefault();                     // allow the drop
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverId.set(id);
  }

  onDrop(event: DragEvent, targetId: string): void {
    event.preventDefault();
    const fromId = this.draggedId();
    this.endDrag();
    if (!fromId || fromId === targetId) return;
    const list = [...this.allWorkflows()];
    const from = list.findIndex(w => w.id === fromId);
    const to   = list.findIndex(w => w.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    this.allWorkflows.set(list);
  }

  endDrag(): void {
    this._ghost?.remove();
    this._ghost = null;
    this.armedId.set(null);
    this.draggedId.set(null);
    this.dragOverId.set(null);
  }

  private _copyCounter = 0;

  // Card overflow-menu actions. Edit / View Logs navigate; the rest mutate the
  // in-session list (position numbers re-derive from order automatically).
  // TODO eng: persist enable-disable / copy / reorder / delete to OnfloStore.
  onWorkflowAction(workflowId: string, actionId: string, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    switch (actionId) {
      case 'edit':        this.openBuilder({ id: workflowId }); break;
      case 'view-logs':   this.openLogs(workflowId); break;
      case 'copy':        this.copyWorkflow(workflowId); break;
      case 'enable':      this.setWorkflowDisabled(workflowId, false); break;
      case 'disable':     this.setWorkflowDisabled(workflowId, true); break;
      case 'move-top':    this.moveWorkflow(workflowId, 'top'); break;
      case 'move-bottom': this.moveWorkflow(workflowId, 'bottom'); break;
      case 'delete':      this.requestDelete(workflowId); break;
    }
  }

  private setWorkflowDisabled(id: string, disabled: boolean): void {
    this.allWorkflows.update(list => list.map(w => (w.id === id ? { ...w, disabled } : w)));
  }

  private moveWorkflow(id: string, to: 'top' | 'bottom'): void {
    const list = [...this.allWorkflows()];
    const i = list.findIndex(w => w.id === id);
    if (i < 0) return;
    const [w] = list.splice(i, 1);
    if (to === 'top') list.unshift(w); else list.push(w);
    this.allWorkflows.set(list);
  }

  private deleteWorkflow(id: string): void {
    this.allWorkflows.update(list => list.filter(w => w.id !== id));
  }

  // Delete confirmation dialog
  private requestDelete(id: string): void {
    this.deleteTarget.set(this.allWorkflows().find(w => w.id === id) ?? null);
  }
  cancelDelete(): void { this.deleteTarget.set(null); }
  confirmDelete(): void {
    const wf = this.deleteTarget();
    if (wf) this.deleteWorkflow(wf.id);
    this.deleteTarget.set(null);
  }

  private copyWorkflow(id: string): void {
    const list = [...this.allWorkflows()];
    const i = list.findIndex(w => w.id === id);
    if (i < 0) return;
    const orig = list[i];
    const copy: Workflow = {
      ...orig,
      id: `${orig.id}-copy-${++this._copyCounter}`,
      name: `${orig.name} (Copy)`,
      tags: [...orig.tags],
      conditions: orig.conditions.map(c => ({ ...c })),
      actions: orig.actions.map(a => ({ ...a })),
    };
    list.splice(i + 1, 0, copy);   // insert right after the original
    this.allWorkflows.set(list);
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
      const recordId = this.testRecordId().trim();
      const durationMs = 180 + Math.round(Math.random() * 240);
      // Simulate a lookup failure when the sample ID isn't a valid record reference.
      // TODO eng: replace with the real trigger result (record-not-found, eval errors…).
      if (!/^(tkt|ast|usr|rec)-\d+$/i.test(recordId)) {
        this.testResult.set({
          ok: false,
          error: `Couldn't find a ${this.sampleNounFor(this.categoryId())} with ID “${recordId}”. Check the ID and run the test again.`,
          evaluated: 0, matched: 0, skipped: 0, durationMs, recordId,
        });
        this.testPhase.set('result');
        return;
      }
      const evaluated = this.allWorkflows().length;
      const matched = Math.max(0, Math.min(evaluated, Math.round(evaluated * 0.6)));
      this.testResult.set({
        ok: true,
        evaluated,
        matched,
        skipped: evaluated - matched,
        durationMs,
        recordId,
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

  // Execution position among enabled workflows. Disabled workflows are skipped at
  // run time, so they get no number and the enabled ones renumber consecutively.
  executionNumber(wf: Workflow): string {
    let n = 0;
    for (const w of this.filtered()) {
      if (w.disabled) continue;
      n++;
      if (w.id === wf.id) break;
    }
    return String(n).padStart(2, '0');
  }
}
