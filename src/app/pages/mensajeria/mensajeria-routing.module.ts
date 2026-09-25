import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { MensajeriaMainComponent } from './mensajeria-main.component';
import { InboxComponent } from './pages/inbox/inbox.component';
import { ComposeComponent } from './pages/compose/compose.component';
import { ConversationsComponent } from './pages/conversations/conversations.component';
import { DirectChatComponent } from './pages/direct-chat/direct-chat.component';
import { FacebookChatComponent } from './pages/direct-chat/facebook-chat.component';
import { ConfiguracionComponent } from './pages/configuracion/configuracion.component';
import { ContactsComponent } from './pages/contacts/contacts.component';
import { ContactRequestsComponent } from './pages/contact-requests/contact-requests.component';
import { BlockedContactsComponent } from './pages/blocked-contacts/blocked-contacts.component';
import { GroupsComponent } from './pages/groups/groups.component';
import { ChannelsComponent } from './pages/channels/channels.component';
import { ArchivedComponent } from './pages/archived/archived.component';
import { ComunicadosComponent } from '../comunicados/comunicados.component';

// Guards
import { authGuard } from '../../guards/auth.guard';
import { PermissionGuard } from '../../guards/permission.guard';

const routes: Routes = [
  {
    path: '',
    component: MensajeriaMainComponent,
    canActivate: [authGuard],
    data: { 
      permission: 'messaging.read',
      breadcrumb: 'Mensajería'
    },
    children: [
      {
        path: '',
        redirectTo: 'inbox',
        pathMatch: 'full'
      },
      {
        path: 'inbox',
        component: InboxComponent,
        data: { 
          breadcrumb: 'Bandeja de Entrada',
          folder: 'inbox'
        }
      },
      {
        path: 'sent',
        component: InboxComponent,
        data: { 
          breadcrumb: 'Enviados',
          folder: 'sent'
        }
      },
      {
        path: 'drafts',
        component: InboxComponent,
        data: { 
          breadcrumb: 'Borradores',
          folder: 'drafts'
        }
      },
      {
        path: 'trash',
        component: InboxComponent,
        data: { 
          breadcrumb: 'Papelera',
          folder: 'trash'
        }
      },
      {
        path: 'archive',
        component: InboxComponent,
        data: { 
          breadcrumb: 'Archivo',
          folder: 'archive'
        }
      },
      {
        path: 'compose',
        component: ComposeComponent,
        canActivate: [authGuard],
        data: { 
          permission: 'messaging.send',
          breadcrumb: 'Redactar Mensaje'
        }
      },
      {
        path: 'conversations',
        component: ConversationsComponent,
        data: { 
          breadcrumb: 'Conversaciones'
        }
      },
      {
        path: 'conversation/:id',
        component: ConversationsComponent,
        data: { 
          breadcrumb: 'Conversación'
        }
      },
      {
        path: 'chat',
        component: DirectChatComponent,
        data: { 
          breadcrumb: 'Chat Directo'
        }
      },
      {
        path: 'facebook-chat',
        component: FacebookChatComponent,
        data: { 
          breadcrumb: 'Chat Facebook'
        }
      },
      {
        path: 'contacts',
        component: ContactsComponent,
        data: { 
          breadcrumb: 'Gestión de Contactos'
        }
      },
      {
        path: 'contact-requests',
        component: ContactRequestsComponent,
        data: { 
          breadcrumb: 'Solicitudes de Contacto'
        }
      },
      {
        path: 'blocked',
        component: BlockedContactsComponent,
        data: { 
          breadcrumb: 'Contactos Bloqueados'
        }
      },
      {
        path: 'groups',
        component: GroupsComponent,
        data: { 
          breadcrumb: 'Grupos'
        }
      },
      {
        path: 'channels',
        component: ChannelsComponent,
        data: { 
          breadcrumb: 'Canales'
        }
      },
      {
        path: 'archived',
        component: ArchivedComponent,
        data: { 
          breadcrumb: 'Archivados'
        }
      },
      {
        path: 'comunicados',
        component: ComunicadosComponent,
        data: { 
          breadcrumb: 'Comunicados'
        }
      },
      {
        path: 'comunicados/crear',
        component: ComunicadosComponent,
        data: { 
          breadcrumb: 'Crear Comunicado'
        }
      },
      {
        path: 'comunicados/importantes',
        component: ComunicadosComponent,
        data: { 
          breadcrumb: 'Comunicados Importantes'
        }
      },
      {
        path: 'comunicados/mis-comunicados',
        component: ComunicadosComponent,
        data: { 
          breadcrumb: 'Mis Comunicados'
        }
      },
      {
        path: 'configuracion',
        component: ConfiguracionComponent,
        canActivate: [authGuard],
        data: { 
          permission: 'messaging.admin',
          breadcrumb: 'Configuración'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MensajeriaRoutingModule { }