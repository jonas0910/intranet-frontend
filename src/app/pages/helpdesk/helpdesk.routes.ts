import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';

export const HELPDESK_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./helpdesk-portal/helpdesk-portal.component').then(m => m.HelpdeskPortalComponent),
    canActivate: [authGuard],
    data: { title: 'Helpdesk', breadcrumb: 'Portal' },
  },
  {
    path: 'mis-tickets',
    loadComponent: () => import('./tickets-list/tickets-list.component').then(m => m.TicketsListComponent),
    canActivate: [authGuard],
    data: { title: 'Mis tickets', breadcrumb: 'Mis tickets', soloMisTickets: true },
  },
  {
    path: 'tickets',
    loadComponent: () => import('./tickets-list/tickets-list.component').then(m => m.TicketsListComponent),
    canActivate: [authGuard],
    data: { title: 'Tickets', breadcrumb: 'Tickets', soloMisTickets: false },
  },
  {
    path: 'tickets/nuevo',
    loadComponent: () => import('./tickets-list/tickets-list.component').then(m => m.TicketsListComponent),
    canActivate: [authGuard],
    data: { title: 'Nuevo ticket', breadcrumb: 'Nuevo', openNewModal: true },
  },
  {
    path: 'tickets/:id',
    loadComponent: () => import('./ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent),
    canActivate: [authGuard],
    data: { title: 'Detalle ticket', breadcrumb: 'Detalle' },
  },
  {
    path: 'base-conocimientos',
    loadComponent: () => import('./kb-list/kb-list.component').then(m => m.KbListComponent),
    canActivate: [authGuard],
    data: { title: 'Base de conocimientos', breadcrumb: 'Base de conocimientos' },
  },
  {
    path: 'base-conocimientos/:id',
    loadComponent: () => import('./kb-article/kb-article.component').then(m => m.KbArticleComponent),
    canActivate: [authGuard],
    data: { title: 'Artículo', breadcrumb: 'Artículo' },
  },
];
