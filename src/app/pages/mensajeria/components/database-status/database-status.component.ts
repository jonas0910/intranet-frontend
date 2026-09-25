import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DatabaseConfigService, DatabaseStatus } from '../../services/database-config.service';

@Component({
  selector: 'app-database-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="database-status" [class.connected]="status.connected" [class.disconnected]="!status.connected">
      <div class="status-header">
        <div class="status-indicator">
          <i class="fas fa-database" [class.text-success]="status.connected" [class.text-danger]="!status.connected"></i>
          <span class="status-text">{{ status.connected ? 'Conectado' : 'Desconectado' }}</span>
        </div>
        <button 
          class="btn btn-sm btn-outline-primary"
          (click)="checkConnection()"
          [disabled]="checking">
          <i class="fas fa-sync-alt" [class.fa-spin]="checking"></i>
          Verificar
        </button>
      </div>

      <div class="status-details" *ngIf="status.message">
        <p class="status-message">{{ status.message }}</p>
        <small class="text-muted">
          Última verificación: {{ formatTime(status.lastCheck) }}
        </small>
      </div>

      <div class="table-status" *ngIf="status.tables.length > 0">
        <h6>Tablas del Sistema de Mensajería:</h6>
        <div class="table-list">
          <div class="table-item" *ngFor="let table of status.tables">
            <i class="fas fa-table text-primary"></i>
            <span>{{ table }}</span>
          </div>
        </div>
      </div>

      <div class="database-actions" *ngIf="!status.connected || !isMessagingReady">
        <button 
          class="btn btn-success btn-sm mr-2"
          (click)="runMigrations()"
          [disabled]="runningMigrations">
          <i class="fas fa-cogs" [class.fa-spin]="runningMigrations"></i>
          Ejecutar Migraciones
        </button>
        
        <button 
          class="btn btn-info btn-sm mr-2"
          (click)="seedDatabase()"
          [disabled]="seeding">
          <i class="fas fa-seedling" [class.fa-spin]="seeding"></i>
          Cargar Datos Iniciales
        </button>
        
        <button 
          class="btn btn-warning btn-sm"
          (click)="createSampleData()"
          [disabled]="creatingSample">
          <i class="fas fa-plus" [class.fa-spin]="creatingSample"></i>
          Crear Datos de Prueba
        </button>
      </div>

      <div class="alert alert-info mt-3" *ngIf="!status.connected">
        <i class="fas fa-info-circle mr-2"></i>
        <strong>Configuración Requerida:</strong>
        <ul class="mb-0 mt-2">
          <li>Verificar que el servidor de base de datos esté ejecutándose</li>
          <li>Verificar la configuración de conexión en <code>.env</code></li>
          <li>Ejecutar las migraciones para crear las tablas necesarias</li>
        </ul>
      </div>
    </div>
  `,
  styleUrls: ['./database-status.component.scss']
})
export class DatabaseStatusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  status: DatabaseStatus = {
    connected: false,
    message: 'Verificando conexión...',
    lastCheck: new Date(),
    tables: []
  };
  
  checking = false;
  runningMigrations = false;
  seeding = false;
  creatingSample = false;
  isMessagingReady = false;

  constructor(private databaseConfigService: DatabaseConfigService) {}

  ngOnInit(): void {
    // Subscribe to database status updates
    this.databaseConfigService.status$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.status = status;
      });

    // Check if messaging system is ready
    this.databaseConfigService.isMessagingReady()
      .pipe(takeUntil(this.destroy$))
      .subscribe(ready => {
        this.isMessagingReady = ready;
      });

    // Initial connection check
    this.checkConnection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkConnection(): void {
    this.checking = true;
    
    this.databaseConfigService.checkConnection()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.checking = false;
        },
        error: (err) => {
          console.error('Connection check failed:', err);
          this.checking = false;
        }
      });
  }

  runMigrations(): void {
    this.runningMigrations = true;
    
    this.databaseConfigService.runMigrations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Migrations completed:', response);
          this.runningMigrations = false;
          this.checkConnection(); // Recheck status after migrations
        },
        error: (err) => {
          console.error('Migration failed:', err);
          this.runningMigrations = false;
        }
      });
  }

  seedDatabase(): void {
    this.seeding = true;
    
    this.databaseConfigService.seedDatabase()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Database seeded:', response);
          this.seeding = false;
          this.checkConnection(); // Recheck status after seeding
        },
        error: (err) => {
          console.error('Seeding failed:', err);
          this.seeding = false;
        }
      });
  }

  createSampleData(): void {
    this.creatingSample = true;
    
    this.databaseConfigService.createSampleData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Sample data created:', response);
          this.creatingSample = false;
          this.checkConnection(); // Recheck status after creating sample data
        },
        error: (err) => {
          console.error('Sample data creation failed:', err);
          this.creatingSample = false;
        }
      });
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleString();
  }
}
