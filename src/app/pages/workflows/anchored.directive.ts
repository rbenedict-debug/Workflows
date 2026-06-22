import { Directive, ElementRef, Input, AfterViewInit, OnDestroy, NgZone } from '@angular/core';

/**
 * Positions the host element as a fixed-position dropdown anchored to a trigger,
 * so it escapes ancestor overflow clipping (the elevated section cards + the
 * scrolling form canvas). Flips above when there's no room below, and clamps into
 * the viewport on smaller screens. Repositions on scroll/resize (rAF-throttled).
 *
 * Design-mode utility — pure DOM positioning, no Angular Material / CDK.
 */
@Directive({
  selector: '[wfAnchored]',
  standalone: true,
})
export class WfAnchoredDirective implements AfterViewInit, OnDestroy {
  /** Element the dropdown anchors to (usually the field/button that opens it). */
  @Input('wfAnchored') trigger: HTMLElement | null = null;
  /** `stretch` matches the trigger width; `end` right-aligns to it; `start` left-aligns. */
  @Input() anchoredAlign: 'stretch' | 'start' | 'end' = 'stretch';
  /** Gap (px) between trigger and panel. */
  @Input() anchoredGap = 4;
  /** Whether THIS element owns the scroll. False when an inner element (e.g. a
   *  nested ds-menu with its own shadow) is the scroll container. */
  @Input() anchoredScroll = true;

  private rafId = 0;
  private readonly schedule = () => {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => { this.rafId = 0; this.position(); });
  };

  constructor(private el: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.position();
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.schedule, true);
      window.addEventListener('resize', this.schedule);
    });
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('scroll', this.schedule, true);
    window.removeEventListener('resize', this.schedule);
  }

  private position(): void {
    const panel = this.el.nativeElement;
    const trigger = this.trigger;
    if (!trigger) return;

    const t = trigger.getBoundingClientRect();
    const gap = this.anchoredGap;
    const margin = 8; // min distance from any viewport edge
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    panel.style.position = 'fixed';
    panel.style.zIndex = '1000';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.margin = '0';
    if (this.anchoredScroll) panel.style.maxHeight = 'none';
    if (this.anchoredAlign === 'stretch') panel.style.width = `${t.width}px`;

    // Natural size (after width is applied).
    const ph = panel.offsetHeight;
    const pw = panel.offsetWidth;

    // Vertical: prefer below; flip above when below lacks room and above has more.
    const below = vh - t.bottom - gap - margin;
    const above = t.top - gap - margin;
    let top: number;
    let maxH: number;
    if (ph <= below || below >= above) {
      top = t.bottom + gap;
      maxH = below;
    } else {
      maxH = above;
      top = t.top - gap - Math.min(ph, maxH);
    }
    panel.style.top = `${Math.max(margin, top)}px`;
    if (this.anchoredScroll) {
      panel.style.maxHeight = `${Math.max(0, maxH)}px`;
      panel.style.overflowY = 'auto';
    }

    // Horizontal: align to trigger, then clamp into the viewport.
    let left = this.anchoredAlign === 'end' ? t.right - pw : t.left;
    left = Math.min(left, vw - margin - pw);
    left = Math.max(margin, left);
    panel.style.left = `${left}px`;
  }
}
