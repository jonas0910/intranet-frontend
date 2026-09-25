import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Inicializar formulario en el constructor para evitar errores de timing
    this.initializeForm();
  }

  ngOnInit(): void {
    // Si ya está logueado, redirigir al dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Aplicar clases de AdminLTE al body
    this.applyLoginBodyClasses();
  }

  ngOnDestroy(): void {
    // Remover clases de login al salir
    this.removeLoginBodyClasses();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false]
    });
  }

  private applyLoginBodyClasses(): void {
    const body = document.body;
    body.className = 'hold-transition login-page';
  }

  private removeLoginBodyClasses(): void {
    const body = document.body;
    body.classList.remove('login-page');
    // Solo aplicar clase base, no las clases completas de AdminLTE
    // Esto se manejará por el app.component.ts basado en la ruta
    body.className = 'hold-transition';
  }

  isFieldInvalid(fieldName: string): boolean {
    if (!this.loginForm) return false;
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  clearError(): void {
    this.errorMessage = '';
  }

  clearSuccess(): void {
    this.successMessage = '';
  }

  onSubmit(): void {
    if (!this.loginForm || this.loginForm.invalid) {
      if (this.loginForm) {
        this.markAllFieldsAsTouched();
      }
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { email, password, remember } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message || 'Inicio de sesión exitoso';
          
          // Redirigir después de un breve delay
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1000);
        } else {
          this.errorMessage = response.message || 'Error en el inicio de sesión';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error de conexión. Intenta nuevamente.';
        console.error('Login error:', error);
      }
    });
  }


  private markAllFieldsAsTouched(): void {
    if (!this.loginForm) return;
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }
}