import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, timer } from 'rxjs';
import { takeUntil, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { SystemPatternIntegrationService, SistemaFormData, SistemaIntegrado } from '../../../services/system-pattern-integration.service';
import { PatternService, SistemaPattern } from '../../../services/pattern.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-sistema-integrado-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sistema-integrado-form.component.html',
  styleUrls: ['./sistema-integrado-form.component.css']
})
export class SistemaIntegradoFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Propiedades del formulario
  sistemaForm!: FormGroup;
  loading = false;
  saving = false;
  isEditing = false;
  sistemaId: number | null = null;
  
  // Propiedades para patrones
  patronesDisponibles: SistemaPattern[] = [];
  patronSeleccionado: SistemaPattern | null = null;
  mostrarVistaPrevia = false;
  
  // Opciones
  categorias = ['sistema_interno', 'sistema_externo', 'sistema_legacy', 'sistema_cloud'];
  providersSSO = ['basic', 'saml2', 'oauth2', 'ldap'];

  constructor(
    private fb: FormBuilder,
    private systemPatternService: SystemPatternIntegrationService,
    private patternService: PatternService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadAvailablePatterns();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Inicializar formulario
  initializeForm(): void {
    this.sistemaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      codigo: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      url_base: ['', [Validators.required, Validators.pattern('https?://.+')]],
      activo: [true],
      sso_habilitado: [false],
      sso_force: [false],
      sso_provider: ['basic'],
      categoria: ['sistema_interno'],
      patron_file: [null],
      patron_id: [''],
      usar_patron_existente: [false]
    });

    // Escuchar cambios en el tipo de patrón
    this.sistemaForm.get('usar_patron_existente')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(usarExistente => {
        if (usarExistente) {
          this.sistemaForm.get('patron_file')?.disable();
          this.sistemaForm.get('patron_id')?.enable();
        } else {
          this.sistemaForm.get('patron_file')?.enable();
          this.sistemaForm.get('patron_id')?.disable();
        }
      });

    // Escuchar cambios en el patrón seleccionado
    this.sistemaForm.get('patron_id')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(patronId => {
        if (patronId) {
          this.loadSelectedPattern(patronId);
        } else {
          this.patronSeleccionado = null;
        }
      });
  }

  // Cargar patrones disponibles
  loadAvailablePatterns(): void {
    this.loading = true;
    this.patternService.getAllPatterns()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patrones) => {
          this.patronesDisponibles = patrones;
          console.log('✅ Patrones disponibles cargados:', patrones.length);
        },
        error: (error) => {
          console.error('❌ Error al cargar patrones:', error);
          this.notificationService.error('Error al cargar patrones disponibles');
        },
        complete: () => {
          this.loading = false;
        }
      });
  }

  // Cargar patrón seleccionado
  loadSelectedPattern(patronId: string): void {
    this.patternService.getPatternById(patronId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patron) => {
          this.patronSeleccionado = patron;
          if (patron) {
            // Pre-llenar campos del formulario con datos del patrón
            this.sistemaForm.patchValue({
              nombre: patron.nombre,
              codigo: patron.codigo,
              descripcion: patron.descripcion,
              url_base: patron.configuracion.url_base
            });
          }
        },
        error: (error) => {
          console.error('❌ Error al cargar patrón:', error);
          this.notificationService.error('Error al cargar patrón seleccionado');
        }
      });
  }

  // Manejar archivo de patrón
  onPatternFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.sistemaForm.patchValue({ patron_file: file });
      this.previewPatternFile(file);
    }
  }

  // Vista previa del archivo de patrón
  previewPatternFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const patronData = JSON.parse(e.target.result);
        this.patronSeleccionado = patronData;
        this.mostrarVistaPrevia = true;
        
        // Pre-llenar campos del formulario
        this.sistemaForm.patchValue({
          nombre: patronData.nombre,
          codigo: patronData.codigo,
          descripcion: patronData.descripcion,
          url_base: patronData.configuracion?.url_base || ''
        });
        
        this.notificationService.success('Patrón cargado correctamente');
      } catch (error) {
        this.notificationService.error('Error al procesar archivo JSON');
      }
    };
    reader.readAsText(file);
  }

  // Generar código automático
  generateCode(): void {
    const nombre = this.sistemaForm.get('nombre')?.value;
    if (nombre) {
      const codigo = nombre.split(' ')
        .map((word: string) => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 6);
      this.sistemaForm.patchValue({ codigo });
    }
  }

  // Validar formulario
  validateForm(): boolean {
    if (this.sistemaForm.invalid) {
      this.markFormGroupTouched(this.sistemaForm);
      this.notificationService.error('Por favor, completa todos los campos requeridos');
      return false;
    }
    return true;
  }

  // Marcar todos los campos como touched
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  // Guardar sistema integrado
  saveSistema(): void {
    console.log('🔄 Iniciando proceso de guardado...');
    console.log('📋 Estado del formulario:', {
      valid: this.sistemaForm.valid,
      invalid: this.sistemaForm.invalid,
      touched: this.sistemaForm.touched,
      dirty: this.sistemaForm.dirty,
      errors: this.sistemaForm.errors
    });
    
    if (!this.validateForm()) {
      console.log('❌ Validación del formulario falló');
      return;
    }

    this.saving = true;
    const formData = this.sistemaForm.value;
    console.log('📝 Datos del formulario:', formData);
    console.log('🔍 Campos específicos:', {
      nombre: formData.nombre,
      codigo: formData.codigo,
      descripcion: formData.descripcion,
      url_base: formData.url_base,
      usar_patron_existente: formData.usar_patron_existente,
      patron_id: formData.patron_id,
      patron_file: formData.patron_file
    });
    
    // Preparar datos del sistema
    const sistemaData: SistemaFormData = {
      nombre: formData.nombre,
      codigo: formData.codigo,
      descripcion: formData.descripcion,
      url_base: formData.url_base,
      activo: formData.activo,
      sso_habilitado: formData.sso_habilitado,
      sso_force: formData.sso_force
    };

    // Agregar patrón según el tipo seleccionado
    if (formData.usar_patron_existente && formData.patron_id) {
      sistemaData.patron_id = formData.patron_id;
      console.log('📋 Usando patrón existente:', formData.patron_id);
    } else if (formData.patron_file) {
      sistemaData.patron_file = formData.patron_file;
      console.log('📁 Usando archivo de patrón:', formData.patron_file.name);
    } else {
      console.log('🔧 Creando patrón básico');
    }
    
    console.log('💾 Datos del sistema preparados:', sistemaData);

    if (this.isEditing && this.sistemaId) {
      // Actualizar sistema existente con timeout
      this.systemPatternService.updateIntegratedSystem(this.sistemaId, sistemaData)
        .pipe(
          takeUntil(this.destroy$),
          timeout(30000), // 30 segundos de timeout
          catchError(error => {
            console.error('❌ Error al actualizar sistema:', error);
            this.notificationService.error('Error al actualizar el sistema: ' + (error.message || 'Tiempo de espera agotado'));
            this.saving = false;
            return of(null);
          })
        )
        .subscribe({
          next: (sistema) => {
            if (sistema) {
              console.log('✅ Sistema actualizado exitosamente:', sistema);
              this.notificationService.success('Sistema actualizado correctamente');
              this.router.navigate(['/sistemas']);
            }
          },
          error: (error) => {
            console.error('❌ Error crítico al actualizar sistema:', error);
            this.notificationService.error('Error crítico al actualizar el sistema');
            this.saving = false;
          },
          complete: () => {
            this.saving = false;
          }
        });
    } else {
      // Crear nuevo sistema con timeout
      console.log('🚀 Iniciando creación de sistema...');
      this.systemPatternService.createIntegratedSystem(sistemaData)
        .pipe(
          takeUntil(this.destroy$),
          timeout(30000), // 30 segundos de timeout
          catchError(error => {
            console.error('❌ Error al crear sistema:', error);
            let errorMessage = 'Error al crear el sistema.';
            
            if (error.message) {
              if (error.message.includes('Estructura de patrón inválida')) {
                errorMessage = 'La estructura del patrón no es válida. Verifique el archivo o seleccione un patrón existente.';
              } else if (error.message.includes('timeout')) {
                errorMessage = 'El proceso de guardado tardó demasiado. Intente nuevamente.';
              } else {
                errorMessage = error.message;
              }
            }
            
            this.notificationService.error(errorMessage);
            this.saving = false;
            return of(null);
          })
        )
        .subscribe({
          next: (sistema) => {
            console.log('📨 Respuesta recibida en el componente:', sistema);
            if (sistema) {
              console.log('✅ Sistema creado exitosamente:', sistema);
              this.notificationService.success('Sistema creado correctamente');
              console.log('🧭 Navegando a /sistemas...');
              this.router.navigate(['/sistemas']);
            } else {
              console.log('⚠️ Sistema es null o undefined');
              this.notificationService.error('No se pudo crear el sistema');
            }
          },
          error: (error) => {
            console.error('❌ Error crítico al crear sistema:', error);
            console.error('❌ Detalles del error:', {
              message: error.message,
              stack: error.stack,
              name: error.name
            });
            this.notificationService.error('Error crítico al crear el sistema');
            this.saving = false;
          },
          complete: () => {
            console.log('🏁 Proceso de guardado completado');
            this.saving = false;
          }
        });
    }
  }

  // Resetear formulario y navegar de vuelta
  resetForm(): void {
    this.sistemaForm.reset({
      activo: true,
      sso_habilitado: false,
      sso_force: false,
      sso_provider: 'basic',
      categoria: 'sistema_interno',
      usar_patron_existente: false
    });
    this.patronSeleccionado = null;
    this.mostrarVistaPrevia = false;
    this.isEditing = false;
    this.sistemaId = null;
    
    // Navegar de vuelta a la lista de sistemas
    this.router.navigate(['/sistemas']);
  }

  // Cargar sistema para edición
  loadSistemaForEdit(sistema: SistemaIntegrado): void {
    this.isEditing = true;
    this.sistemaId = sistema.id;
    
    this.sistemaForm.patchValue({
      nombre: sistema.nombre,
      codigo: sistema.codigo,
      descripcion: sistema.descripcion,
      url_base: sistema.url_base,
      activo: sistema.activo,
      sso_habilitado: sistema.sso_habilitado,
      sso_force: sistema.sso_force
    });

    // Cargar patrón asociado
    this.patronSeleccionado = sistema.patron_data;
    this.mostrarVistaPrevia = true;
  }

  // Obtener menús del patrón seleccionado
  getMenusFromPattern(): any[] {
    return this.patronSeleccionado?.menus || [];
  }

  // Obtener total de menús
  getTotalMenus(): number {
    return this.getMenusFromPattern().length;
  }

  // Obtener menús activos
  getActiveMenus(): number {
    return this.getMenusFromPattern().filter(m => m.estado_default).length;
  }

  // Validar campo específico
  isFieldInvalid(fieldName: string): boolean {
    const field = this.sistemaForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  // Obtener mensaje de error para campo
  getFieldError(fieldName: string): string {
    const field = this.sistemaForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['pattern']) return 'Formato inválido';
    }
    return '';
  }

  // Obtener estado SSO del patrón seleccionado
  getSSOStatus(): string {
    if (!this.patronSeleccionado || !this.patronSeleccionado.sso_config) {
      return 'No configurado';
    }
    return this.patronSeleccionado.sso_config.habilitado ? 'Sí' : 'No';
  }

  // Obtener provider SSO del patrón seleccionado
  getSSOProvider(): string {
    if (!this.patronSeleccionado || !this.patronSeleccionado.sso_config) {
      return 'No configurado';
    }
    return this.patronSeleccionado.sso_config.provider || 'No configurado';
  }
}
