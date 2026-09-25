import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="content-wrapper">
      <div class="content-header">
        <div class="container-fluid">
          <div class="row mb-2">
            <div class="col-sm-6">
              <h1 class="m-0">Test Menu - Frontend</h1>
            </div>
          </div>
        </div>
      </div>

      <div class="content">
        <div class="container-fluid">
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Información del Sistema</h3>
                </div>
                <div class="card-body">
                  <h5>Estado del Frontend:</h5>
                  <p>✅ Componente funcionando correctamente</p>
                  <p>✅ Angular ejecutándose</p>
                  <p>✅ AdminLTE cargado</p>
                  
                  <h5 class="mt-3">Enlaces al Backend:</h5>
                  <div class="row">
                    <div class="col-md-6">
                      <a href="http://localhost:8000/admin/menus" target="_blank" class="btn btn-primary btn-block mb-2">
                        <i class="fas fa-list"></i> Lista de Menús
                      </a>
                      <a href="http://localhost:8000/admin/menus/create" target="_blank" class="btn btn-success btn-block mb-2">
                        <i class="fas fa-plus"></i> Crear Menú
                      </a>
                    </div>
                    <div class="col-md-6">
                      <a href="http://localhost:8000/admin/menu-system-tools" target="_blank" class="btn btn-info btn-block mb-2">
                        <i class="fas fa-tools"></i> Herramientas
                      </a>
                      <a href="http://localhost:8000/test-menu" target="_blank" class="btn btn-warning btn-block mb-2">
                        <i class="fas fa-bug"></i> Debug Backend
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TestMenuComponent {
  constructor() {
    console.log('TestMenuComponent inicializado');
  }
}
