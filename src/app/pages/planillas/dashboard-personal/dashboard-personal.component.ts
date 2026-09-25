import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../../services/auth.service';
import { 
  DashboardPersonalService, 
  PersonalEmployeeInfo, 
  PersonalStats, 
  MonthlyTotal, 
  PersonalDashboardData 
} from '../../../services/dashboard-personal.service';

@Component({
  selector: 'app-dashboard-personal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-personal.component.html',
  styleUrls: ['./dashboard-personal.component.scss']
})
export class DashboardPersonalComponent implements OnInit {
  dashboardData: PersonalDashboardData | null = null;
  loading = false;
  error: string | null = null;
  selectedYear = new Date().getFullYear();
  availableYears: number[] = [];
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardPersonalService
  ) {
    this.generateAvailableYears();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.empleado?.id) {
      this.loadPersonalDashboard();
    } else {
      this.error = 'No se encontró información del empleado';
    }
  }

  private generateAvailableYears(): void {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 5; year--) {
      this.availableYears.push(year);
    }
  }

  loadPersonalDashboard(): void {
    if (!this.currentUser?.empleado?.id) {
      this.error = 'No se encontró información del empleado';
      return;
    }

    this.loading = true;
    this.error = null;

    this.dashboardService.getPersonalDashboard(this.currentUser!.empleado!.id, this.selectedYear)
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading personal dashboard:', error);
          this.error = 'Error al cargar el dashboard personal';
          this.loading = false;
        }
      });
  }

  onYearChange(): void {
    this.loadPersonalDashboard();
  }

  formatCurrency(amount: number | null | undefined): string {
    if (amount == null) return 'S/ 0.00';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-PE');
  }

  getMonthName(monthNumber: string): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[parseInt(monthNumber) - 1] || monthNumber;
  }
}