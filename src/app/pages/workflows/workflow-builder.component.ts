import { Component, HostListener, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TRIGGERS, TRIGGER_ICONS, workflowById, type Workflow } from './workflow-data';

interface BuilderRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}
interface BuilderGroup {
  id: string;
  mode: 'ALL' | 'ANY';
  rules: BuilderRule[];
}
interface BuilderAction {
  id: string;
  type: string;
  icon: string;
  name: string;
  summary: string;
  expanded: boolean;
  hasError: boolean;
}
interface BuilderState {
  id: string | null;
  name: string;
  description: string;
  tags: string[];
  active: boolean;
  expiresAt: string;
  categoryId: string;
  triggerId: string;
  triggerLabel: string;
  triggerIcon: string;
  triggerCategoryLabel: string;
  conditions: { groupJoin: 'AND' | 'OR'; groups: BuilderGroup[] };
  actions: BuilderAction[];
  stopAfter: boolean;
}

const FIELD_OPTIONS = ['Subject','Topic','Priority','Status','Type','Entry Point','Tags','Owner','Team','Customer Type','Ticket Age','Cost Center','Organizational Unit'];
const OPERATOR_OPTIONS = ['is','is not','contains','does not contain','is more than','is less than','is one of'];

const TAG_SUGGESTIONS = ['Routing','Priority','Notification','SLA','Customer','Procurement','Approval','Finance','Reporting','Archive','Escalation','Bug','Mobile'];

@Component({
  selector: 'app-workflow-builder',
  standalone: true,
  templateUrl: './workflow-builder.component.html',
  styleUrl: './workflow-builder.component.scss',
  host: { class: 'ds-page-content', role: 'main' },
})
export class WorkflowBuilderComponent {
  fieldOptions = FIELD_OPTIONS;
  operatorOptions = OPERATOR_OPTIONS;
  tagSuggestions = TAG_SUGGESTIONS;

  wf = signal<BuilderState>(this.demoSeed());
  initialSnapshot = signal<string>(JSON.stringify(this.demoSeed()));

  dirty = computed<boolean>(() => JSON.stringify(this.wf()) !== this.initialSnapshot());
  hasErrors = computed<boolean>(() => {
    const s = this.wf();
    if (!s.name.trim()) return true;
    if (s.actions.some(a => a.hasError)) return true;
    return false;
  });
  totalConditions = computed<number>(() =>
    this.wf().conditions.groups.reduce((n, g) => n + g.rules.length, 0)
  );

  pickerOpen = signal<boolean>(false);
  tagDraft = signal<string>('');
  tagDropdownOpen = signal<boolean>(false);

  // Angular-driven ds-select dropdowns (no select.js dependency). One open at a time.
  openSelectKey = signal<string | null>(null);

  filteredTagSuggestions = computed<string[]>(() => {
    const draft = this.tagDraft().toLowerCase();
    const current = this.wf().tags;
    return TAG_SUGGESTIONS
      .filter(s => !current.includes(s))
      .filter(s => !draft || s.toLowerCase().includes(draft));
  });

  constructor(private route: ActivatedRoute, private router: Router) {
    this.route.queryParamMap.subscribe(p => {
      const id = p.get('id');
      const isNew = p.get('new');
      if (id) {
        const stored = workflowById(id);
        if (stored) {
          this.wf.set(this.workflowToBuilder(stored));
          this.initialSnapshot.set(JSON.stringify(this.wf()));
          return;
        }
      }
      if (isNew) {
        const categoryId = (p.get('category') ?? 'tickets') as 'tickets' | 'assets' | 'users';
        const triggerId  = p.get('trigger')  ?? 'ticket-created';
        const trigger = (TRIGGERS[categoryId] ?? TRIGGERS.tickets).find(t => t.id === triggerId) ?? TRIGGERS[categoryId][0];
        this.wf.set({
          id: null,
          name: '',
          description: '',
          tags: [],
          active: true,
          expiresAt: '',
          categoryId,
          triggerId: trigger.id,
          triggerLabel: trigger.label,
          triggerIcon: TRIGGER_ICONS[trigger.id] ?? 'bolt',
          triggerCategoryLabel: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
          conditions: { groupJoin: 'AND', groups: [] },
          actions: [],
          stopAfter: false,
        });
        this.initialSnapshot.set(JSON.stringify(this.wf()));
      }
    });
  }

  // Close any open dropdown when clicking elsewhere.
  @HostListener('document:click')
  onDocumentClick(): void {
    this.openSelectKey.set(null);
    this.pickerOpen.set(false);
  }

  // ── ds-select open state ──────────────────────────────────────────────────
  toggleSelect(key: string, event: Event): void {
    event.stopPropagation();
    this.openSelectKey.set(this.openSelectKey() === key ? null : key);
  }
  isSelectOpen(key: string): boolean { return this.openSelectKey() === key; }

  chooseField(gid: string, rid: string, field: string, event: Event): void {
    event.stopPropagation();
    this.updateRule(gid, rid, { field, operator: '', value: '' });
    this.openSelectKey.set(null);
  }
  chooseOperator(gid: string, rid: string, operator: string, event: Event): void {
    event.stopPropagation();
    this.updateRule(gid, rid, { operator });
    this.openSelectKey.set(null);
  }

  // ── Mutation helpers ──────────────────────────────────────────────────────
  private patch(partial: Partial<BuilderState>): void {
    this.wf.update(s => ({ ...s, ...partial }));
  }

  setName(v: string)        { this.patch({ name: v }); }
  setDescription(v: string) { this.patch({ description: v }); }
  setExpiresAt(v: string)   { this.patch({ expiresAt: v }); }
  setActive(v: boolean)     { this.patch({ active: v }); }
  setStopAfter(v: boolean)  { this.patch({ stopAfter: v }); }

  setGroupJoin(v: 'AND' | 'OR'): void {
    this.wf.update(s => ({ ...s, conditions: { ...s.conditions, groupJoin: v }}));
  }

  addGroup(): void {
    this.wf.update(s => ({
      ...s,
      conditions: {
        ...s.conditions,
        groups: [
          ...s.conditions.groups,
          {
            id: 'g-' + Date.now(),
            mode: 'ALL',
            rules: [{ id: 'r-' + Date.now(), field: '', operator: '', value: '' }],
          },
        ],
      },
    }));
  }

  removeGroup(gid: string): void {
    this.wf.update(s => ({
      ...s,
      conditions: { ...s.conditions, groups: s.conditions.groups.filter(g => g.id !== gid) },
    }));
  }

  setGroupMode(gid: string, mode: 'ALL' | 'ANY'): void {
    this.wf.update(s => ({
      ...s,
      conditions: {
        ...s.conditions,
        groups: s.conditions.groups.map(g => g.id === gid ? { ...g, mode } : g),
      },
    }));
  }

  addRule(gid: string): void {
    this.wf.update(s => ({
      ...s,
      conditions: {
        ...s.conditions,
        groups: s.conditions.groups.map(g => g.id === gid
          ? { ...g, rules: [...g.rules, { id: 'r-' + Date.now(), field: '', operator: '', value: '' }] }
          : g),
      },
    }));
  }

  removeRule(gid: string, rid: string): void {
    this.wf.update(s => ({
      ...s,
      conditions: {
        ...s.conditions,
        groups: s.conditions.groups.map(g => g.id === gid
          ? { ...g, rules: g.rules.filter(r => r.id !== rid) }
          : g),
      },
    }));
  }

  updateRule(gid: string, rid: string, patch: Partial<BuilderRule>): void {
    this.wf.update(s => ({
      ...s,
      conditions: {
        ...s.conditions,
        groups: s.conditions.groups.map(g => g.id === gid
          ? { ...g, rules: g.rules.map(r => r.id === rid ? { ...r, ...patch } : r) }
          : g),
      },
    }));
  }

  // Actions
  toggleAction(aid: string): void {
    this.wf.update(s => ({
      ...s,
      actions: s.actions.map(a => a.id === aid ? { ...a, expanded: !a.expanded } : a),
    }));
  }

  removeAction(aid: string): void {
    this.wf.update(s => ({ ...s, actions: s.actions.filter(a => a.id !== aid) }));
  }

  moveAction(aid: string, delta: number): void {
    this.wf.update(s => {
      const i = s.actions.findIndex(a => a.id === aid);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= s.actions.length) return s;
      const next = [...s.actions];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...s, actions: next };
    });
  }

  addAction(type: string, icon: string, name: string): void {
    this.wf.update(s => ({
      ...s,
      actions: [
        ...s.actions,
        {
          id: 'a-' + Date.now(),
          type, icon, name,
          summary: 'Setup required',
          expanded: true,
          hasError: true,
        },
      ],
    }));
    this.pickerOpen.set(false);
  }

  togglePicker(event: Event): void {
    event.stopPropagation();
    this.pickerOpen.update(o => !o);
  }

  // Tags
  addTag(tag: string): void {
    const trimmed = tag.trim();
    if (!trimmed) return;
    this.wf.update(s => s.tags.includes(trimmed) ? s : { ...s, tags: [...s.tags, trimmed] });
    this.tagDraft.set('');
  }

  removeTag(tag: string): void {
    this.wf.update(s => ({ ...s, tags: s.tags.filter(t => t !== tag) }));
  }

  setTagDraft(v: string) { this.tagDraft.set(v); }

  openTagDropdown() { this.tagDropdownOpen.set(true); }
  closeTagDropdown() {
    setTimeout(() => this.tagDropdownOpen.set(false), 120);
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.tagDraft().trim()) {
      event.preventDefault();
      this.addTag(this.tagDraft());
    }
    if (event.key === 'Backspace' && !this.tagDraft() && this.wf().tags.length) {
      this.removeTag(this.wf().tags[this.wf().tags.length - 1]);
    }
  }

  // Save
  cancelChanges(): void {
    this.wf.set(JSON.parse(this.initialSnapshot()));
  }

  saveProgress(): void {
    // TODO eng: persist to OnfloStore.save(wf)
    this.initialSnapshot.set(JSON.stringify(this.wf()));
  }

  saveAndExit(): void {
    // TODO eng: persist then nav
    this.router.navigate(['/workflows']);
  }

  back(): void {
    if (this.dirty() && !confirm('Discard unsaved changes and return to the workflow list?')) return;
    this.router.navigate(['/workflows']);
  }

  // ── Seeds / converters ────────────────────────────────────────────────────
  private demoSeed(): BuilderState {
    return {
      id: 'wf-1',
      name: 'Require approval for software purchases',
      description: 'Sends software requests over $500 to the Director of Finance before procurement processes them.',
      tags: ['Procurement', 'Approval', 'Finance'],
      active: true,
      expiresAt: '',
      categoryId: 'tickets',
      triggerId: 'ticket-created',
      triggerLabel: 'Ticket Created',
      triggerIcon: 'bolt',
      triggerCategoryLabel: 'Tickets',
      conditions: {
        groupJoin: 'AND',
        groups: [{
          id: 'g-1',
          mode: 'ALL',
          rules: [
            { id: 'r-1', field: 'Topic',               operator: 'is',     value: 'Procurement' },
            { id: 'r-2', field: 'Organizational Unit', operator: 'is not', value: 'Operations' },
          ],
        }],
      },
      actions: [
        { id: 'a-1', type: 'set_priority', icon: 'flag',   name: 'Set priority',     summary: 'Set priority to High',         expanded: false, hasError: false },
        { id: 'a-2', type: 'add_comment',  icon: 'chat',   name: 'Add comment',      summary: 'Internal comment: New softwa…', expanded: true,  hasError: false },
        { id: 'a-3', type: 'assign_agent', icon: 'person', name: 'Assign to agent',  summary: 'Assign to Sarah Chen',         expanded: false, hasError: false },
      ],
      stopAfter: true,
    };
  }

  private workflowToBuilder(w: Workflow): BuilderState {
    return {
      id: w.id,
      name: w.name,
      description: w.description,
      tags: [...w.tags],
      active: !w.disabled,
      expiresAt: '',
      categoryId: w.categoryId,
      triggerId: w.triggerId,
      triggerLabel: TRIGGERS[w.categoryId].find(t => t.id === w.triggerId)?.label ?? w.triggerId,
      triggerIcon: TRIGGER_ICONS[w.triggerId] ?? 'bolt',
      triggerCategoryLabel: w.categoryId.charAt(0).toUpperCase() + w.categoryId.slice(1),
      conditions: {
        groupJoin: 'AND',
        groups: w.conditions.length > 0 ? [{
          id: 'g-1',
          mode: 'ALL',
          rules: w.conditions.map((c, i) => ({
            id: 'r-' + i,
            field: c.field,
            operator: c.operator,
            value: c.value,
          })),
        }] : [],
      },
      actions: w.actions.map((a, i) => ({
        id: 'a-' + i,
        type: 'static',
        icon: a.icon ?? 'bolt',
        name: a.verb,
        summary: `${a.verb} ${a.target}`,
        expanded: false,
        hasError: false,
      })),
      stopAfter: w.stop,
    };
  }
}
