import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminLTEStabilizerService } from '../../services/adminlte-stabilizer.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-stable-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stable-loading-container" *ngIf="showLoading">
      <div class="stable-loading-content">
        <div class="stable-loading-spinner">
          <div class="spinner-border text-primary" role="status">
            <span class="sr-only">Cargando...</span>
          </div>
        </div>
        <div class="stable-loading-text">
          <h5>{{ loadingText }}</h5>
          <p class="text-muted">{{ loadingSubtext }}</p>
        </div>
        <div class="stable-loading-progress" *ngIf="showProgress">
          <div class="progress">
            <div class="progress-bar progress-bar-striped progress-bar-animated" 
                 [style.width.%]="progressValue" 
                 role="progressbar" 
                 [attr.aria-valuenow]="progressValue" 
                 aria-valuemin="0" 
                 aria-valuemax="100">
              {{ progressValue }}%
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stable-loading-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.95);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.3s ease-in-out;
    }

    .stable-loading-container.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .stable-loading-content {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      min-width: 300px;
    }

    .stable-loading-spinner {
      margin-bottom: 1rem;
    }

    .stable-loading-text h5 {
      margin-bottom: 0.5rem;
      color: #333;
    }

    .stable-loading-progress {
      margin-top: 1rem;
    }

    .progress {
      height: 8px;
      border-radius: 4px;
    }

    .progress-bar {
      border-radius: 4px;
    }

    /* Animación suave para el spinner */
    .spinner-border {
      width: 3rem;
      height: 3rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .stable-loading-content {
        margin: 1rem;
        min-width: auto;
      }
    }
  `]
})
export class StableLoadingComponent implements OnInit, OnDestroy {
  @Input() showLoading = true;
  @Input() loadingText = 'Inicializando sistema...';
  @Input() loadingSubtext = 'Por favor espere mientras se configura la interfaz';
  @Input() showProgress = false;
  @Input() progressValue = 0;

  private destroy$ = new Subject<void>();
  private progressInterval: any;
  private safetyTimeout: any;

  constructor(private adminLTEStabilizer: AdminLTEStabilizerService) {}

  ngOnInit(): void {
    this.startSafetyTimeout();

    this.adminLTEStabilizer.getStabilizationState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        if (state.isInitializing) {
          this.showLoading = true;
          this.loadingText = 'Inicializando AdminLTE...';
          this.loadingSubtext = 'Configurando interfaz de usuario';
          this.startProgressSimulation();
          this.startSafetyTimeout();
        } else if (state.isStable) {
          this.loadingText = 'Sistema listo';
          this.loadingSubtext = 'Inicialización completada';
          this.progressValue = 100;
          this.hideLoadingAfterDelay(300);
        } else if (state.hasErrors) {
          this.hideLoadingAfterDelay(500);
        }
      });
  }

  private startSafetyTimeout(): void {
    if (this.safetyTimeout) clearTimeout(this.safetyTimeout);
    this.safetyTimeout = setTimeout(() => {
      if (this.showLoading) {
        this.showLoading = false;
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
          this.progressInterval = null;
        }
      }
    }, 1500);
  }

  private startProgressSimulation(): void {
    this.progressValue = 0;
    this.showProgress = true;
    
    this.progressInterval = setInterval(() => {
      if (this.progressValue < 90) {
        this.progressValue += Math.random() * 10;
      }
    }, 200);
  }

  private hideLoadingAfterDelay(delay = 1000): void {
    setTimeout(() => {
      this.showLoading = false;
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
      }
    }, delay);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    
    if (this.safetyTimeout) {
      clearTimeout(this.safetyTimeout);
    }
  }
}
