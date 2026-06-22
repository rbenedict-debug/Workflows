import { Directive, ElementRef, AfterViewInit, NgZone } from '@angular/core';

/**
 * Makes the ds-textarea corner handle actually resize the field. The DS sets
 * `resize: none` on the control and ships a visual handle that its Angular
 * <ds-textarea> component normally wires up (toggling `.is-resizing`). In design
 * mode we wire the drag here — vertical only, matching the handle's s-resize
 * cursor. Pure DOM, no Angular Material / CDK.
 */
@Directive({
  selector: '[wfTextareaResize]',
  standalone: true,
})
export class WfTextareaResizeDirective implements AfterViewInit {
  private static readonly MIN_HEIGHT = 80;

  constructor(private el: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngAfterViewInit(): void {
    const root = this.el.nativeElement;
    const handle = root.querySelector<HTMLElement>('.ds-textarea__resize-handle');
    const control = root.querySelector<HTMLTextAreaElement>('.ds-textarea__control');
    if (!handle || !control) return;

    handle.style.touchAction = 'none';

    this.zone.runOutsideAngular(() => {
      handle.addEventListener('pointerdown', (e: PointerEvent) => {
        e.preventDefault();
        const startY = e.clientY;
        const startH = control.offsetHeight;
        root.classList.add('is-resizing');
        handle.setPointerCapture(e.pointerId);

        const onMove = (ev: PointerEvent) => {
          const h = Math.max(WfTextareaResizeDirective.MIN_HEIGHT, startH + ev.clientY - startY);
          control.style.height = `${h}px`;
        };
        const onUp = () => {
          root.classList.remove('is-resizing');
          handle.removeEventListener('pointermove', onMove);
          handle.removeEventListener('pointerup', onUp);
        };
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp);
      });
    });
  }
}
