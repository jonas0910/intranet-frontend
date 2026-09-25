import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlanillasMenuService, PlanillasMenuItem } from '../../services/planillas-menu.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-planillas-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Menú Dinámico de Planillas -->
    <li class="nav-item" *ngIf="menuItems.length > 0">
      <a href="#" class="nav-link">
        <i class="nav-icon fas fa-money-check-alt"></i>
        <p>
          💰 Planillas
          <i class="fas fa-angle-left right"></i>
        </p>
      </a>
      <ul class="nav nav-treeview">
        <li class="nav-item" *ngFor="let item of menuItems">
          <a [routerLink]="[item.url]" class="nav-link" routerLinkActive="active">
            <i class="far fa-circle nav-icon" [ngClass]="item.icono"></i>
            <p>{{ item.nombre }}</p>
          </a>
        </li>
      </ul>
    </li>
  `,
  styles: [`
    .nav-item {
      position: relative;
    }
    
    .nav-link {
      display: flex;
      align-items: center;
      padding: 0.5rem 1rem;
      color: #c2c7d0;
      text-decoration: none;
      transition: all 0.3s ease;
    }
    
    .nav-link:hover {
      color: #fff;
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    .nav-link.active {
      color: #fff;
      background-color: #007bff;
    }
    
    .nav-icon {
      width: 1.25rem;
      margin-right: 0.5rem;
      text-align: center;
    }
    
    .nav-treeview {
      padding-left: 1rem;
    }
    
    .nav-treeview .nav-item {
      margin-left: 0.5rem;
    }
  `]
})
export class PlanillasMenuComponent implements OnInit, OnDestroy {
  @Input() permisosUsuario: string[] = [];
  
  menuItems: PlanillasMenuItem[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private planillasMenuService: PlanillasMenuService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPlanillasMenu();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPlanillasMenu(): void {
    this.planillasMenuService.obtenerMenuPlanillas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (menu) => {
          // Filtrar menú según permisos del usuario
          this.menuItems = this.planillasMenuService.filtrarMenuPorPermisos(
            menu, 
            this.permisosUsuario
          );
          
          // Ordenar por orden
          this.menuItems.sort((a, b) => a.orden - b.orden);
          
          console.log('Menú de Planillas cargado:', this.menuItems);
        },
        error: (error) => {
          console.error('Error cargando menú de Planillas:', error);
          // En caso de error, usar menú de ejemplo
          this.menuItems = this.planillasMenuService['obtenerMenuPlanillasEjemplo']();
        }
      });
  }
}
