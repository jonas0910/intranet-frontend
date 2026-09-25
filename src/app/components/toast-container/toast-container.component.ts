import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToastService, Toast } from '../../services/toast.service';
import { DesignSystemService, ToastConfig } from '../../services/design-system.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss'],
  animations: [
    trigger('toastIn', [
      transition(':enter', [
        style({ opacity: 0, transform: '{{ enterFrom }}' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translate(0, 0)' }))
      ], { params: { enterFrom: 'translateX(100%)', leaveTo: 'translateX(100%)', leaveDurationMs: 180 } }),
      transition(':leave', [
        animate('{{ leaveDurationMs }}ms ease-in', style({ opacity: 0, transform: '{{ leaveTo }}' }))
      ], { params: { enterFrom: 'translateX(100%)', leaveTo: 'translateX(100%)', leaveDurationMs: 180 } })
    ])
  ]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  tc!: ToastConfig;
  private subscription = new Subscription();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(
    private toastService: ToastService,
    private ds: DesignSystemService
  ) {
    this.tc = this.ds.getToastFor(this.ds.activeSubsystem);
  }

  ngOnInit(): void {
    this.tc = this.ds.getToastFor(this.ds.activeSubsystem);
    this.subscription.add(this.ds.activeSubsystemChanges$?.subscribe(subsystem => {
      this.tc = this.ds.getToastFor(subsystem || 'global');
    }));
    this.subscription.add(this.ds.toastChanges.subscribe(cfg => {
      this.tc = this.ds.getToastFor(this.ds.activeSubsystem);
    }));
    this.subscription.add(
      this.toastService.toasts$.subscribe(toast => {
        this.toasts.push(toast);
        if (toast.autoClose) {
          const t = setTimeout(() => this.removeToast(toast.id), toast.duration);
          this.timers.set(toast.id, t);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.timers.forEach(t => clearTimeout(t));
    this.timers.clear();
  }

  removeToast(id: string): void {
    const t = this.timers.get(id);
    if (t) {
      clearTimeout(t);
      this.timers.delete(id);
    }
    this.toasts = this.toasts.filter(x => x.id !== id);
  }

  /** Toasts normales (sin variant broadcast). */
  get normalToasts(): Toast[] {
    return this.toasts.filter(t => t.variant !== 'broadcast');
  }

  /** Toasts de comunicado en pantalla (centrado, ancho, marquee). */
  get broadcastToasts(): Toast[] {
    return this.toasts.filter(t => t.variant === 'broadcast');
  }

  /** Valor numérico para border-radius del toast (evita error en template con ??). */
  get toastBorderRadius(): number {
    return this.tc?.borderRadius != null ? this.tc.borderRadius : 6;
  }

  get toastWidth(): number {
    return this.tc?.toastWidth ?? 380;
  }

  get toastMaxWidth(): number {
    return this.tc?.toastMaxWidth ?? 520;
  }

  /** Opacidad del toast (0–1). Más bajo = más transparente. */
  get toastOpacity(): number {
    const v = this.tc?.toastOpacity ?? 0.92;
    return Math.min(1, Math.max(0.1, v));
  }

  get progressBarColor(): string {
    return this.tc?.progressBarColor ?? 'rgba(255, 193, 7, 0.95)';
  }

  /** Parámetros para la animación del toast (slide-right o slide-up). La duración de salida es proporcional al tiempo de visibilidad. */
  getToastAnimationParams(toast: Toast): { enterFrom: string; leaveTo: string; leaveDurationMs: number } {
    const up = (this.tc?.toastAnimation ?? 'slide-right') === 'slide-up';
    const visibilityMs = toast.duration ?? 3000;
    const leaveDurationMs = Math.min(1200, Math.max(200, Math.round(visibilityMs * 0.25)));
    return up
      ? { enterFrom: 'translateY(100%)', leaveTo: 'translateY(-50vh)', leaveDurationMs }
      : { enterFrom: 'translateX(100%)', leaveTo: 'translateX(100%)', leaveDurationMs: 180 };
  }

  getIconClass(type: string): string {
    const icons: Record<string, string> = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || icons['info'];
  }

  getHeaderBg(type: string): string {
    if (!this.tc) return '#17a2b8';
    switch (type) {
      case 'success': return this.tc.successBg;
      case 'error': return this.tc.errorBg;
      case 'warning': return this.tc.warningBg;
      case 'info': return this.tc.infoBg;
      default: return this.tc.infoBg;
    }
  }

  getHeaderText(type: string): string {
    return this.tc?.warningText && type === 'warning' ? this.tc.warningText : '#fff';
  }

  getBorderColor(type: string): string {
    if (!this.tc) return '#17a2b8';
    switch (type) {
      case 'success': return this.tc.successBorder;
      case 'error': return this.tc.errorBorder;
      case 'warning': return this.tc.warningBorder;
      case 'info': return this.tc.infoBorder;
      default: return this.tc.infoBorder;
    }
  }
}
