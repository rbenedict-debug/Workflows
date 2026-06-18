import { Component, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs';

type NavSection = 'tickets' | 'assets' | 'users' | 'analytics' | 'settings';

interface SettingsItem {
  id: string;
  label: string;
  section: string;
  isSubheader?: boolean;
  subheaderParent?: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit, OnDestroy {
  subNavOpen = true;
  activeNav: NavSection = 'tickets';

  private _scrollCleanup: (() => void) | null = null;
  private _routerSub: Subscription;

  constructor(private readonly router: Router) {
    // Pre-boot script in index.html already applied the saved theme to <html>
    this.theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    this._syncNavFromUrl(router.url);
    this._routerSub = router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(e => {
      this._syncNavFromUrl((e as NavigationEnd).urlAfterRedirects);
      if (this.activeNav === 'settings') setTimeout(() => this._setupSettingsScrollbar(), 0);
    });
  }

  private _syncNavFromUrl(url: string): void {
    const segment = url.split('/')[1]?.split('?')[0];
    const valid: NavSection[] = ['tickets', 'assets', 'users', 'analytics', 'settings'];
    if (!segment) {
      this.activeNav = 'tickets';
    } else {
      this.activeNav = valid.includes(segment as NavSection) ? (segment as NavSection) : 'tickets';
    }
  }

  ngAfterViewInit(): void {
    if (this.activeNav === 'settings') setTimeout(() => this._setupSettingsScrollbar(), 0);
  }

  ngOnDestroy(): void {
    this._scrollCleanup?.();
    this._routerSub.unsubscribe();
  }

  setNav(section: NavSection): void {
    this.subNavOpen = true;
    this.router.navigate([section]);
  }

  get activeNavLabel(): string {
    const labels: Record<NavSection, string> = {
      tickets: 'Tickets', assets: 'Assets',
      users: 'Users', analytics: 'Analytics', settings: 'Settings',
    };
    return labels[this.activeNav];
  }

  private _setupSettingsScrollbar(): void {
    this._scrollCleanup?.();
    this._scrollCleanup = null;

    const scroll = document.querySelector('.settings-subnav__scroll') as HTMLElement;
    const track  = document.querySelector('.settings-subnav__track') as HTMLElement;
    const thumb  = document.querySelector('.settings-subnav__thumb') as HTMLElement;
    if (!scroll || !track || !thumb) return;

    let hideTimer: ReturnType<typeof setTimeout>;

    const updateThumb = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroll;
      if (scrollHeight <= clientHeight + 1) return;
      const thumbH = Math.max(32, (clientHeight / scrollHeight) * clientHeight);
      const maxScroll = scrollHeight - clientHeight;
      const thumbT = maxScroll > 0 ? (scrollTop / maxScroll) * (clientHeight - thumbH) : 0;
      thumb.style.height = Math.round(thumbH) + 'px';
      thumb.style.top    = Math.round(thumbT) + 'px';
    };
    updateThumb();

    const show = () => { clearTimeout(hideTimer); track.style.opacity = '1'; track.style.pointerEvents = 'auto'; };
    const hide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => { track.style.opacity = '0'; track.style.pointerEvents = 'none'; }, 150); };

    const onMouseMove = (e: MouseEvent) => {
      const rect = scroll.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top  && e.clientY <= rect.bottom;
      inside ? show() : hide();
    };

    scroll.addEventListener('scroll', updateThumb);
    document.addEventListener('mousemove', onMouseMove);

    let isDragging = false;
    const onThumbEnter = () => { thumb.style.background = 'var(--color-text-primary)'; };
    const onThumbLeave = () => { if (!isDragging) thumb.style.background = ''; };
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      const dragStartY = e.clientY;
      const dragStartTop = scroll.scrollTop;
      const thumbH = parseInt(thumb.style.height);
      const maxScroll = scroll.scrollHeight - scroll.clientHeight;
      const trackH = scroll.clientHeight - thumbH;
      isDragging = true;
      show();
      thumb.style.background = 'var(--color-text-primary)';
      const onMove = (e: PointerEvent) => {
        if (trackH <= 0) return;
        const delta = e.clientY - dragStartY;
        scroll.scrollTop = Math.max(0, Math.min(maxScroll, dragStartTop + (delta / trackH) * maxScroll));
      };
      const onUp = () => {
        isDragging = false;
        thumb.style.background = '';
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        hide();
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    };

    thumb.addEventListener('mouseenter', onThumbEnter);
    thumb.addEventListener('mouseleave', onThumbLeave);
    thumb.addEventListener('pointerdown', onPointerDown);

    this._scrollCleanup = () => {
      scroll.removeEventListener('scroll', updateThumb);
      document.removeEventListener('mousemove', onMouseMove);
      thumb.removeEventListener('mouseenter', onThumbEnter);
      thumb.removeEventListener('mouseleave', onThumbLeave);
      thumb.removeEventListener('pointerdown', onPointerDown);
      clearTimeout(hideTimer);
    };
  }

  // ── Theme / profile menu ─────────────────────────────────────────────────
  profileMenuOpen = false;
  theme: 'light' | 'dark' = 'light';

  setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('onflo-theme', theme);
    this.profileMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  closeProfileMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.profileMenuOpen) return;
    if (!(event.target as HTMLElement).closest('.profile-menu')) {
      this.profileMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  closeProfileMenuOnEscape(): void {
    this.profileMenuOpen = false;
  }

  // ── Tickets ──────────────────────────────────────────────────────────────
  ticketsNavItem = 'inbox';
  ticketSavedViewsExpanded = true;
  savedSearchesExpanded = false;
  ticketSavedViews = [
    { id: 'sv1', name: 'My Open Tickets', ticketCount: 12 },
    { id: 'sv2', name: 'Team Escalations', ticketCount: 4 },
    { id: 'sv3', name: 'VIP Customers', ticketCount: 0 },
  ];

  // ── Assets ───────────────────────────────────────────────────────────────
  assetsNavItem = 'overview';

  // ── Analytics ────────────────────────────────────────────────────────────
  analyticsNavItem = 'service-overview';
  comparisonExpanded = false;
  analyticsSavedViewsExpanded = false;
  analyticsSavedViews = [
    { id: 'av1', name: 'Q1 District Summary' },
    { id: 'av2', name: 'IT Dept Breakdown' },
  ];

  // ── Settings ─────────────────────────────────────────────────────────────
  settingsNavItem = 'district-profile';
  settingsSearchQuery = '';

  settingsExpanded: Record<string, boolean> = {
    'global': true,
    'integration-hub': false,
    'workflows': false,
    'tickets-settings': false,
    'assets-settings': false,
    'call-center': false,
    'activity-log': false,
    'communications': false,
    'tags': false,
    'portals': false,
    'topics-manager': false,
  };

  toggleSettings(key: string): void {
    if (this.settingsSearchQuery) return;
    this.settingsExpanded[key] = !this.settingsExpanded[key];
  }

  private readonly _settingsSectionLabels: Record<string, string> = {
    'global':           'Global',
    'integration-hub':  'Integration Hub',
    'workflows':        'Workflows',
    'tickets-settings': 'Tickets',
    'assets-settings':  'Assets',
    'call-center':      'Call Center',
  };

  private readonly _settingsItems: SettingsItem[] = [
    // Global
    { id: 'district-profile',       label: 'District Profile',       section: 'global' },
    { id: 'activity-log',           label: 'Activity Log',           section: 'global',           isSubheader: true },
    { id: 'activity-log-onflo',     label: 'Onflo',                  section: 'global',           subheaderParent: 'activity-log' },
    { id: 'activity-log-assets',    label: 'Assets',                 section: 'global',           subheaderParent: 'activity-log' },
    { id: 'ai-training',            label: 'AI Training Resources',  section: 'global' },
    { id: 'chatbot',                label: 'Chatbot',                section: 'global' },
    { id: 'communications',         label: 'Communications',         section: 'global',           isSubheader: true },
    { id: 'cs-score-templates',     label: 'CS Score Templates',     section: 'global',           subheaderParent: 'communications' },
    { id: 'email',                  label: 'Email',                  section: 'global',           subheaderParent: 'communications' },
    { id: 'response-templates',     label: 'Response Templates',     section: 'global',           subheaderParent: 'communications' },
    { id: 'departments',            label: 'Departments',            section: 'global' },
    { id: 'keyword-alerts',         label: 'Keyword Alerts',         section: 'global' },
    { id: 'languages',              label: 'Languages',              section: 'global' },
    { id: 'live-agent',             label: 'Live Agent',             section: 'global' },
    { id: 'locations',              label: 'Locations',              section: 'global' },
    { id: 'tags',                   label: 'Tags',                   section: 'global',           isSubheader: true },
    { id: 'tags-tickets',           label: 'Tickets',                section: 'global',           subheaderParent: 'tags' },
    { id: 'tags-assets',            label: 'Assets',                 section: 'global',           subheaderParent: 'tags' },
    { id: 'user-management',        label: 'User Management',        section: 'global' },
    // Integration Hub
    { id: 'api-tokens',             label: 'API Tokens',             section: 'integration-hub' },
    { id: 'webhooks',               label: 'Webhooks',               section: 'integration-hub' },
    { id: 'marketplace',            label: 'Marketplace',            section: 'integration-hub' },
    { id: 'installed-apps',         label: 'Installed Apps',         section: 'integration-hub' },
    // Workflows
    { id: 'workflows-tickets',      label: 'Tickets',                section: 'workflows' },
    { id: 'workflows-assets',       label: 'Assets',                 section: 'workflows' },
    { id: 'lookup-tables',          label: 'Lookup Tables',          section: 'workflows' },
    // Tickets Settings
    { id: 'portals',                label: 'Portals',                section: 'tickets-settings', isSubheader: true },
    { id: 'portals-it-service',     label: 'IT Service',             section: 'tickets-settings', subheaderParent: 'portals' },
    { id: 'portals-landing-page',   label: 'Landing Page / Tab',     section: 'tickets-settings', subheaderParent: 'portals' },
    { id: 'forms',                  label: 'Forms',                  section: 'tickets-settings' },
    { id: 'saved-exports',          label: 'Saved Exports',          section: 'tickets-settings' },
    { id: 'slas',                   label: 'SLAs',                   section: 'tickets-settings' },
    { id: 'ticket-schedules',       label: 'Ticket Schedules',       section: 'tickets-settings' },
    { id: 'topics-manager',         label: 'Topics Manager',         section: 'tickets-settings', isSubheader: true },
    { id: 'topics',                 label: 'Topics',                 section: 'tickets-settings', subheaderParent: 'topics-manager' },
    { id: 'success-messages',       label: 'Success Messages',       section: 'tickets-settings', subheaderParent: 'topics-manager' },
    // Assets Settings
    { id: 'archived-assets',        label: 'Archived Assets',        section: 'assets-settings' },
    { id: 'asset-fields',           label: 'Asset Fields',           section: 'assets-settings' },
    { id: 'asset-hierarchy',        label: 'Asset Hierarchy',        section: 'assets-settings' },
    { id: 'funding-sources',        label: 'Funding Sources',        section: 'assets-settings' },
    { id: 'manufacturers',          label: 'Manufacturers',          section: 'assets-settings' },
    { id: 'models',                 label: 'Models',                 section: 'assets-settings' },
    { id: 'purchase-order-details', label: 'Purchase Order Details', section: 'assets-settings' },
    { id: 'statuses',               label: 'Statuses',               section: 'assets-settings' },
    { id: 'suppliers',              label: 'Suppliers',              section: 'assets-settings' },
    // Call Center
    { id: 'business-hours',         label: 'Business Hours',         section: 'call-center' },
    { id: 'calendar',               label: 'Calendar',               section: 'call-center' },
    { id: 'call-notes',             label: 'Call Notes',             section: 'call-center' },
    { id: 'contact-numbers',        label: 'Contact Numbers',        section: 'call-center' },
    { id: 'greetings',              label: 'Greetings',              section: 'call-center' },
    { id: 'ivr',                    label: 'IVR',                    section: 'call-center' },
    { id: 'queues',                 label: 'Queues',                 section: 'call-center' },
    { id: 'texting',                label: 'Texting',                section: 'call-center' },
  ];

  get settingsFilteredIds(): Set<string> | null {
    const q = this.settingsSearchQuery.toLowerCase().trim();
    if (!q) return null;

    const matchingSectionKeys = new Set(
      Object.entries(this._settingsSectionLabels)
        .filter(([, label]) => label.toLowerCase().includes(q))
        .map(([key]) => key)
    );
    const matchingSubheaderIds = new Set(
      this._settingsItems
        .filter(item => item.isSubheader && item.label.toLowerCase().includes(q))
        .map(item => item.id)
    );

    const result = new Set<string>();
    for (const item of this._settingsItems) {
      if (
        item.label.toLowerCase().includes(q) ||
        matchingSectionKeys.has(item.section) ||
        (item.subheaderParent !== undefined && matchingSubheaderIds.has(item.subheaderParent))
      ) {
        result.add(item.id);
      }
    }
    return result;
  }

  get settingsSectionVis() {
    const f = this.settingsFilteredIds;
    if (!f) {
      return { global: true, integrationHub: true, workflows: true,
               ticketsSettings: true, assetsSettings: true, callCenter: true };
    }
    const hasAny = (section: string) =>
      this._settingsItems.some(item => item.section === section && f.has(item.id));
    return {
      global:          hasAny('global'),
      integrationHub:  hasAny('integration-hub'),
      workflows:       hasAny('workflows'),
      ticketsSettings: hasAny('tickets-settings'),
      assetsSettings:  hasAny('assets-settings'),
      callCenter:      hasAny('call-center'),
    };
  }
}
