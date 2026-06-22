// Mock data for Workflow List / Builder / Logs / Simulation pages.
// In production this is backed by the OnfloStore localStorage shape.
// TODO eng: replace with real workflow service.

export interface Condition {
  field: string;
  operator: string;
  value: string;
}
export interface Action {
  verb: string;
  target: string;
  icon?: string;
}
export interface Workflow {
  id: string;
  name: string;
  description: string;
  tags: string[];
  conditions: Condition[];
  actions: Action[];
  stop: boolean;
  disabled: boolean;
  categoryId: 'tickets' | 'assets' | 'users';
  triggerId: string;
  order: number;
}

export interface CategoryDef {
  id: 'tickets' | 'assets' | 'users';
  label: string;
  icon: string;
}
export interface TriggerDef {
  id: string;
  label: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'tickets', label: 'Tickets', icon: 'inbox' },
  { id: 'assets',  label: 'Assets',  icon: 'desktop_mac' },
  { id: 'users',   label: 'Users',   icon: 'group' },
];

export const TRIGGERS: Record<'tickets' | 'assets' | 'users', TriggerDef[]> = {
  tickets: [
    { id: 'ticket-created',        label: 'Ticket Created' },
    { id: 'ticket-updated',        label: 'Ticket Updated' },
    { id: 'ticket-status-change',  label: 'Ticket Status Change' },
    { id: 'ticket-assigned',       label: 'Ticket Assigned' },
    { id: 'ticket-stale',          label: 'Ticket Stale' },
    { id: 'ticket-approval-sent',  label: 'Ticket Sent for Approval' },
    { id: 'ticket-approved',       label: 'Ticket Approved' },
    { id: 'ticket-denied',         label: 'Ticket Denied' },
    { id: 'on-schedule',           label: 'On a Schedule' },
  ],
  assets: [
    { id: 'asset-added',           label: 'Asset Added' },
    { id: 'asset-assigned',        label: 'Asset Assigned' },
    { id: 'asset-unassigned',      label: 'Asset Unassigned' },
    { id: 'asset-id-added',        label: 'Asset ID Added' },
    { id: 'asset-deleted',         label: 'Asset Deleted' },
    { id: 'asset-updated',         label: 'Asset Updated' },
    { id: 'asset-status-change',   label: 'Asset Status Change' },
    { id: 'asset-batch',           label: 'Asset Batch Processed' },
    { id: 'asset-loaned',          label: 'Asset Loaned' },
    { id: 'asset-returned',        label: 'Asset Returned' },
    { id: 'purchase-order',        label: 'Purchase Order Added' },
    { id: 'warranty-expired',      label: 'Asset Warranty Expired' },
    { id: 'inventory-threshold',   label: 'Inventory Threshold Exceeded' },
    { id: 'service-ticket',        label: 'Service Ticket Created' },
    { id: 'on-schedule',           label: 'On a Schedule' },
  ],
  users: [
    { id: 'user-created',          label: 'User Created' },
    { id: 'user-updated',          label: 'User Updated' },
    { id: 'user-deactivated',      label: 'User Deactivated' },
    { id: 'on-schedule',           label: 'On a Schedule' },
  ],
};

export const TRIGGER_ICONS: Record<string, string> = {
  'ticket-created':         'bolt',
  'ticket-updated':         'edit_note',
  'ticket-status-change':   'sync_alt',
  'ticket-assigned':        'assignment_ind',
  'ticket-stale':           'hourglass_top',
  'ticket-approval-sent':   'send',
  'ticket-approved':        'check_circle',
  'ticket-denied':          'block',
  'on-schedule':            'schedule',
  'asset-added':            'add_box',
  'asset-assigned':         'assignment',
  'asset-warranty-expired': 'gpp_bad',
  'warranty-expired':       'gpp_bad',
  'user-created':           'person_add',
};

export const WORKFLOWS: Workflow[] = [
  {
    id: 'wf-1',
    name: 'Require approval for software purchases',
    description: 'Sends software requests over $500 to the Director of Finance before procurement processes them.',
    tags: ['Procurement', 'Approval', 'Finance'],
    conditions: [
      { field: 'Topic',               operator: 'is',     value: 'Procurement' },
      { field: 'Organizational Unit', operator: 'is not', value: 'Operations' },
    ],
    actions: [
      { verb: 'Set priority to',  target: 'High',                                   icon: 'flag' },
      { verb: 'Internal comment', target: 'New software request requires approval from the Director of Finance.', icon: 'chat' },
      { verb: 'Assign to',        target: 'Sarah Chen',                             icon: 'person' },
    ],
    stop: true,
    disabled: false,
    categoryId: 'tickets', triggerId: 'ticket-created', order: 1,
  },
  {
    id: 'wf-2',
    name: 'Route high-priority tickets to on-call team',
    description: 'Anything marked High lands directly with the on-call team using round-robin assignment.',
    tags: ['Routing', 'Priority'],
    conditions: [
      { field: 'Priority', operator: 'is', value: 'High' },
    ],
    actions: [
      { verb: 'Round robin',      target: 'Tier 2 Support', icon: 'sync' },
      { verb: 'Add tag',          target: 'Escalated',      icon: 'label' },
      { verb: 'Internal comment', target: 'Auto-routed to on-call team.', icon: 'chat' },
    ],
    stop: false,
    disabled: false,
    categoryId: 'tickets', triggerId: 'ticket-created', order: 2,
  },
  {
    id: 'wf-3',
    name: 'Auto-tag new tickets and follow requester manager',
    description: 'Tags fresh tickets as First Touch and subscribes the requester’s manager to updates.',
    tags: ['Customer', 'Notification'],
    conditions: [],
    actions: [
      { verb: 'Add tag',      target: 'First Touch',                       icon: 'label' },
      { verb: 'Add follower', target: '{{ticket.requester.manager}}',      icon: 'person_add' },
    ],
    stop: false,
    disabled: false,
    categoryId: 'tickets', triggerId: 'ticket-created', order: 3,
  },
  {
    id: 'wf-4',
    name: 'Escalate stale VIP tickets after 2 hours',
    description: 'Bumps priority and adds the support lead as a follower when a VIP ticket has been open for 2+ hours.',
    tags: ['Escalation', 'VIP'],
    conditions: [
      { field: 'Customer Type', operator: 'is',           value: 'VIP' },
      { field: 'Ticket Age',    operator: 'is more than', value: '2' },
    ],
    actions: [
      { verb: 'Increase priority', target: 'by one level',  icon: 'arrow_upward' },
      { verb: 'Add follower',      target: 'Marcus Johnson', icon: 'person_add' },
    ],
    stop: false,
    disabled: true,
    categoryId: 'tickets', triggerId: 'ticket-stale', order: 1,
  },
  {
    id: 'wf-5',
    name: 'Tag inbound email tickets',
    description: 'Adds an "Email" tag to any ticket that came in via the email channel.',
    tags: ['Reporting'],
    conditions: [
      { field: 'Entry Point', operator: 'is', value: 'Email' },
    ],
    actions: [
      { verb: 'Add tag', target: 'Email', icon: 'label' },
    ],
    stop: false,
    disabled: false,
    categoryId: 'tickets', triggerId: 'ticket-updated', order: 1,
  },
  {
    id: 'wf-6',
    name: 'Open ticket when an asset is added',
    description: 'When IT registers a new device, file a ticket so it gets imaged and assigned.',
    tags: ['Provisioning'],
    conditions: [],
    actions: [
      { verb: 'Create ticket',  target: 'Image and deploy new asset {{asset.name}}', icon: 'add_box' },
      { verb: 'Assign to team', target: 'Hardware',                                   icon: 'groups' },
    ],
    stop: false,
    disabled: false,
    categoryId: 'assets', triggerId: 'asset-added', order: 1,
  },
  {
    id: 'wf-7',
    name: 'Warn 30 days before warranty expiry',
    description: 'Creates an approval task for procurement 30 days before a warranty lapses.',
    tags: ['Procurement'],
    conditions: [],
    actions: [
      { verb: 'Create task', target: 'Renew warranty for {{asset.name}}', icon: 'task_alt' },
    ],
    stop: false,
    disabled: false,
    categoryId: 'assets', triggerId: 'warranty-expired', order: 1,
  },
  {
    id: 'wf-8',
    name: 'Welcome new users',
    description: 'Creates an onboarding ticket and tags the new user when their account is created.',
    tags: ['Onboarding'],
    conditions: [],
    actions: [
      { verb: 'Create ticket', target: 'Onboard {{user.name}}', icon: 'add_box' },
      { verb: 'Add tag',       target: 'Onboarding',           icon: 'label' },
    ],
    stop: false,
    disabled: false,
    categoryId: 'users', triggerId: 'user-created', order: 1,
  },
];

export function workflowsFor(category: string, trigger: string): Workflow[] {
  return WORKFLOWS
    .filter(w => w.categoryId === category && w.triggerId === trigger)
    .sort((a, b) => a.order - b.order);
}

export function countFor(category: string, trigger: string): number {
  return WORKFLOWS.filter(w => w.categoryId === category && w.triggerId === trigger).length;
}

export function workflowById(id: string): Workflow | null {
  return WORKFLOWS.find(w => w.id === id) ?? null;
}
