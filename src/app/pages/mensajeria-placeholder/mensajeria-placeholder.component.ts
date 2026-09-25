import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-mensajeria-placeholder',
  template: `
    <div class="content-wrapper">
      <div class="content-header">
        <div class="container-fluid">
          <div class="row mb-2">
            <div class="col-sm-6">
              <h1 class="m-0">
                <i class="fas fa-envelope mr-2"></i>
                {{ getPageTitle() }}
              </h1>
            </div>
            <div class="col-sm-6">
              <ol class="breadcrumb float-sm-right">
                <li class="breadcrumb-item"><a routerLink="/dashboard">Inicio</a></li>
                <li class="breadcrumb-item"><a routerLink="/mensajeria">Mensajería</a></li>
                <li class="breadcrumb-item active">{{ getPageTitle() }}</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section class="content">
        <div class="container-fluid">
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">{{ getPageTitle() }}</h3>
                </div>
                <div class="card-body">
                  <div class="alert alert-info">
                    <h5><i class="icon fas fa-info"></i> Sistema de Mensajería</h5>
                    <p>{{ getPageDescription() }}</p>
                    <p><strong>Estado:</strong> En desarrollo</p>
                  </div>
                  
                  <div class="row">
                    <div class="col-md-6">
                      <div class="info-box">
                        <span class="info-box-icon bg-info"><i class="fas fa-envelope"></i></span>
                        <div class="info-box-content">
                          <span class="info-box-text">Mensajes</span>
                          <span class="info-box-number">0</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="info-box">
                        <span class="info-box-icon bg-success"><i class="fas fa-comments"></i></span>
                        <div class="info-box-content">
                          <span class="info-box-text">Conversaciones</span>
                          <span class="info-box-number">0</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="mt-3">
                    <h5>Navegación Rápida</h5>
                    <div class="btn-group" role="group">
                      <a routerLink="/mensajeria/inbox" class="btn btn-outline-primary">
                        <i class="fas fa-inbox mr-1"></i> Bandeja de Entrada
                      </a>
                      <a routerLink="/mensajeria/compose" class="btn btn-outline-success">
                        <i class="fas fa-edit mr-1"></i> Redactar
                      </a>
                      <a routerLink="/mensajeria/conversations" class="btn btn-outline-info">
                        <i class="fas fa-comments mr-1"></i> Conversaciones
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .content-wrapper {
      .content-header {
        padding: 15px 0;
        
        h1 {
          font-size: 1.5rem;
          font-weight: 500;
          
          i {
            color: #007bff;
          }
        }
        
        .breadcrumb {
          background: transparent;
          margin-bottom: 0;
          padding: 0;
        }
      }
      
      .content {
        .card {
          box-shadow: 0 0 1px rgba(0,0,0,.125), 0 1px 3px rgba(0,0,0,.2);
          
          .card-header {
            background-color: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            
            .card-title {
              font-weight: 500;
              margin: 0;
            }
          }
        }
        
        .info-box {
          box-shadow: 0 0 1px rgba(0,0,0,.125), 0 1px 3px rgba(0,0,0,.2);
          border-radius: 0.25rem;
          background: #fff;
          display: flex;
          margin-bottom: 1rem;
          min-height: 80px;
          padding: 0.5rem;
          position: relative;
          width: 100%;
          
          .info-box-icon {
            border-radius: 0.25rem;
            align-items: center;
            display: flex;
            font-size: 1.875rem;
            justify-content: center;
            text-align: center;
            width: 70px;
            color: white;
            
            &.bg-info {
              background-color: #17a2b8;
            }
            
            &.bg-success {
              background-color: #28a745;
            }
          }
          
          .info-box-content {
            display: flex;
            flex-direction: column;
            justify-content: center;
            line-height: 1.8;
            margin-left: 10px;
            padding: 5px 10px;
            
            .info-box-text {
              display: block;
              font-size: 14px;
              font-weight: 600;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            
            .info-box-number {
              display: block;
              font-weight: 700;
              font-size: 18px;
            }
          }
        }
      }
    }

    // Responsive adjustments
    @media (max-width: 768px) {
      .content-wrapper {
        .content-header {
          .breadcrumb {
            float: none !important;
            margin-top: 10px;
          }
        }
        
        .btn-group {
          .btn {
            margin-bottom: 5px;
          }
        }
      }
    }
  `]
})
export class MensajeriaPlaceholderComponent implements OnInit {
  private currentSection: string = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Determinar la sección actual basada en la URL
    const url = window.location.pathname;
    if (url.includes('/inbox')) {
      this.currentSection = 'inbox';
    } else if (url.includes('/sent')) {
      this.currentSection = 'sent';
    } else if (url.includes('/drafts')) {
      this.currentSection = 'drafts';
    } else if (url.includes('/compose')) {
      this.currentSection = 'compose';
    } else if (url.includes('/conversations')) {
      this.currentSection = 'conversations';
    } else if (url.includes('/important')) {
      this.currentSection = 'important';
    } else if (url.includes('/trash')) {
      this.currentSection = 'trash';
    } else if (url.includes('/search')) {
      this.currentSection = 'search';
    } else {
      this.currentSection = 'main';
    }
  }

  getPageTitle(): string {
    const titles: { [key: string]: string } = {
      'main': 'Sistema de Mensajería',
      'inbox': 'Bandeja de Entrada',
      'sent': 'Mensajes Enviados',
      'drafts': 'Borradores',
      'compose': 'Redactar Mensaje',
      'conversations': 'Conversaciones',
      'important': 'Mensajes Importantes',
      'trash': 'Papelera',
      'search': 'Búsqueda Avanzada'
    };
    return titles[this.currentSection] || 'Mensajería';
  }

  getPageDescription(): string {
    const descriptions: { [key: string]: string } = {
      'main': 'Bienvenido al sistema de mensajería Notaria. Desde aquí puedes gestionar todos tus mensajes y conversaciones.',
      'inbox': 'Aquí encontrarás todos los mensajes que has recibido.',
      'sent': 'Revisa todos los mensajes que has enviado.',
      'drafts': 'Mensajes guardados como borrador que puedes continuar editando.',
      'compose': 'Redacta un nuevo mensaje para enviar a otros usuarios del sistema.',
      'conversations': 'Gestiona tus conversaciones grupales y chats en tiempo real.',
      'important': 'Mensajes marcados como importantes para acceso rápido.',
      'trash': 'Mensajes eliminados que pueden ser restaurados.',
      'search': 'Busca mensajes específicos usando filtros avanzados.'
    };
    return descriptions[this.currentSection] || 'Funcionalidad de mensajería en desarrollo.';
  }
}