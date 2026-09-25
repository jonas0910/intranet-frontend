import { Component, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService, AreaTramiteAsignada } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  @ViewChild('areaModal') areaModalTpl!: TemplateRef<unknown>;

  credentials = {
    email: '',
    password: ''
  };
  
  loading = false;
  error = '';

  /** Áreas asignadas al usuario (≥2 → modal de selección). */
  areasTramite: AreaTramiteAsignada[] = [];
  selectedAreaId = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: NgbModal
  ) {}

  onSubmit(): void {
    if (!this.credentials.email || !this.credentials.password) {
      this.error = 'Por favor, completa todos los campos';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.credentials.email, this.credentials.password).subscribe({
      next: (response) => {
        if (response.success && response.data?.user) {
          const user = response.data.user;
          if (this.authService.userNeedsAreaSelection(user)) {
            this.areasTramite = user.areas_tramite || [];
            this.selectedAreaId = this.authService.getSuggestedAreaIdForModal(this.areasTramite);
            this.loading = false;
            this.modalService.open(this.areaModalTpl, {
              backdrop: 'static',
              keyboard: false,
              centered: true,
              size: 'md'
            }).result.then(
              (areaId: number) => {
                if (areaId) {
                  this.authService.setActiveAreaId(areaId);
                  this.finishLoginNavigation();
                }
              },
              () => { /* modal cerrado sin confirmar: sesión ya válida; usuario puede usar barra de URL */ }
            );
            return;
          }
          this.finishLoginNavigation();
        } else {
          this.error = response.message || 'Error en el login';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error en login:', error);
        console.error('❌ Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error
        });
        
        // Mensaje de error más específico
        if (error.status === 0) {
          this.error = 'Error de conexión. No se puede conectar con el servidor en http://localhost:8000';
        } else if (error.status === 401) {
          this.error = 'Credenciales incorrectas. Verifica tu email y contraseña.';
        } else if (error.status === 422) {
          this.error = error.error?.message || 'Datos de entrada inválidos.';
        } else if (error.status >= 500) {
          this.error = 'Error del servidor. Intenta nuevamente más tarde.';
        } else {
          this.error = error.error?.message || 'Error de conexión. Verifica que el servidor esté funcionando.';
        }
        
        this.loading = false;
      }
    });
  }

  areaLabel(a: AreaTramiteAsignada): string {
    const n = a.nombre || 'Área';
    return a.codigo ? `${n} (${a.codigo})` : n;
  }

  private finishLoginNavigation(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const path = returnUrl && returnUrl.startsWith('/') ? returnUrl : '/dashboard';
    this.loading = false;
    this.router.navigateByUrl(path);
  }
}