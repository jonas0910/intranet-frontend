import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SystemManagementService, OrganizationSetting } from '../../services/system-management.service';
import { DesignSystemService, CrudViewConfig } from '../../services/design-system.service';
import { SystemLayoutComponent } from '../../shared/components/system-layout/system-layout.component';

@Component({
    selector: 'app-organizacion',
    standalone: true,
    imports: [CommonModule, FormsModule, SystemLayoutComponent],
    templateUrl: './organizacion.component.html',
    styleUrls: ['./organizacion.component.scss']
})
export class OrganizacionComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    cv!: CrudViewConfig;

    // Organización
    organizacion: OrganizationSetting = { name: '' };
    logoFile: File | null = null;
    logoPreview: string | null = null;
    guardandoOrganizacion = false;

    constructor(
        private systemService: SystemManagementService,
        private dsService: DesignSystemService
    ) { }

    ngOnInit(): void {
        // Usamos el patrón de diseño general o uno específico para administración
        this.cv = this.dsService.getCrudViewFor('admin');
        this.loadOrganizacion();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ==================== ORGANIZACIÓN ====================
    loadOrganizacion(): void {
        this.systemService.getOrganizationSettings()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success && response.data) {
                        this.organizacion = response.data;
                        if (this.organizacion.logo) {
                            this.logoPreview = 'http://localhost:8000/storage/' + this.organizacion.logo;
                        }
                    }
                }
            });
    }

    onLogoSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.logoFile = file;
            const reader = new FileReader();
            reader.onload = () => {
                this.logoPreview = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    guardarOrganizacion(): void {
        this.guardandoOrganizacion = true;
        const formData = new FormData();
        formData.append('name', this.organizacion.name);
        if (this.organizacion.ruc) formData.append('ruc', this.organizacion.ruc);
        if (this.organizacion.address) formData.append('address', this.organizacion.address);
        if (this.organizacion.phone) formData.append('phone', this.organizacion.phone);
        if (this.organizacion.email) formData.append('email', this.organizacion.email);
        if (this.organizacion.website) formData.append('website', this.organizacion.website);
        if (this.organizacion.responsable_name) formData.append('responsable_name', this.organizacion.responsable_name);
        if (this.organizacion.responsable_cargo) formData.append('responsable_cargo', this.organizacion.responsable_cargo);

        if (this.logoFile) {
            formData.append('logo', this.logoFile);
        }

        this.systemService.updateOrganizationSettings(formData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.organizacion = response.data;
                        alert('Configuración de la organización guardada correctamente');
                    }
                    this.guardandoOrganizacion = false;
                },
                error: (error) => {
                    console.error('Error al guardar organización:', error);
                    alert('Error al guardar la configuración');
                    this.guardandoOrganizacion = false;
                }
            });
    }
}
