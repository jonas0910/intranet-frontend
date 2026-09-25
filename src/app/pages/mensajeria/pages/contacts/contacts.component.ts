import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MessageService } from '../../services/message.service';
import { Contact, ContactListFilters } from '../../models/contact.model';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss']
})
export class ContactsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  contacts: Contact[] = [];
  filteredContacts: Contact[] = [];
  loading = false;
  loadingMore = false;
  selectedContacts: Set<number> = new Set();
  
  // Filters
  filtersForm!: FormGroup;
  activeFilters: ContactListFilters = {
    status: 'all',
    department: '',
    role: '',
    search: '',
    sort: 'name',
    order: 'asc'
  };

  // Filter options
  departments: string[] = [];
  roles: string[] = [];
  statusOptions = [
    { value: 'all', label: 'Todos', icon: 'fas fa-users' },
    { value: 'online', label: 'Conectados', icon: 'fas fa-circle', count: 0 },
    { value: 'active', label: 'Activos', icon: 'fas fa-user-check', count: 0 },
    { value: 'inactive', label: 'Inactivos', icon: 'fas fa-user-times', count: 0 }
  ];

  sortOptions = [
    { value: 'name', label: 'Nombre', icon: 'fas fa-sort-alpha-down' },
    { value: 'department', label: 'Departamento', icon: 'fas fa-building' },
    { value: 'role', label: 'Rol', icon: 'fas fa-user-tag' },
    { value: 'last_seen', label: 'Última Actividad', icon: 'fas fa-clock' }
  ];

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalContacts = 0;
  hasMoreContacts = false;

  constructor(
    private messageService: MessageService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.initializeFilters();
  }

  ngOnInit(): void {
    this.loadContacts();
    this.setupFiltersReactivity();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFilters(): void {
    this.filtersForm = this.fb.group({
      status: ['all'],
      department: [''],
      role: [''],
      search: ['']
    });
  }

  private setupFiltersReactivity(): void {
    // Search filter with debounce
    this.filtersForm.get('search')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe((search: string) => {
      this.activeFilters.search = search;
      this.applyFilters();
    });

    // Other filters reactive
    Object.keys(this.activeFilters).forEach(key => {
      if (key !== 'search') {
        this.filtersForm.get(key)?.valueChanges.pipe(
          takeUntil(this.destroy$)
        ).subscribe((value: any) => {
          (this.activeFilters as any)[key] = value;
          this.applyFilters();
        });
      }
    });
  }

  loadContacts(): void {
    this.loading = true;

    this.messageService.getContacts().subscribe({
      next: (contacts: any) => {
        this.contacts = contacts || [];
        this.extractFilterOptions();
        this.updateStatusCounts();
        this.applyFilters();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading contacts:', error);
        this.loading = false;
      }
    });
  }

  private extractFilterOptions(): void {
    // Extract unique departments
    this.departments = [...new Set(
      this.contacts
        .map(contact => contact.department)
        .filter((dept): dept is string => dept !== undefined && dept !== 'Sin departamento')
    )];

    // Extract unique roles
    this.roles = [...new Set(
      this.contacts.map(contact => contact.role)
    )];
  }

  private updateStatusCounts(): void {
    const onlineCount = this.contacts.filter(c => c.is_online).length;
    const activeCount = this.contacts.filter(c => c.is_active).length;
    const inactiveCount = this.contacts.filter(c => !c.is_active).length;

    this.statusOptions[1].count = onlineCount;  // Online
    this.statusOptions[2].count = activeCount;  // Active
    this.statusOptions[3].count = inactiveCount; // Inactive
  }

  applyFilters(): void {
    let filtered = [...this.contacts];

    // Apply status filter
    if (this.activeFilters.status !== 'all') {
      filtered = filtered.filter(contact => {
        if (this.activeFilters.status === 'online') {
          return contact.is_online;
        } else if (this.activeFilters.status === 'active') {
          return contact.is_active;
        } else if (this.activeFilters.status === 'inactive') {
          return !contact.is_active;
        }
        return true;
      });
    }

    // Apply department filter
    if (this.activeFilters.department) {
      filtered = filtered.filter(contact => 
        contact.department === this.activeFilters.department
      );
    }

    // Apply role filter
    if (this.activeFilters.role) {
      filtered = filtered.filter(contact => 
        contact.role === this.activeFilters.role
      );
    }

    // Apply search filter
    if (this.activeFilters.search) {
      const searchTerm = this.activeFilters.search.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm) ||
        contact.email.toLowerCase().includes(searchTerm) ||
        contact.department?.toLowerCase().includes(searchTerm) ||
        contact.position?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    this.sortContacts(filtered);

    this.filteredContacts = filtered;
    this.totalContacts = filtered.length;
  }

  private sortContacts(contacts: Contact[]): void {
    const { sort, order } = this.activeFilters;
    
    contacts.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sort) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'department':
          valueA = a.department?.toLowerCase() || '';
          valueB = b.department?.toLowerCase() || '';
          break;
        case 'role':
          valueA = a.role.toLowerCase();
          valueB = b.role.toLowerCase();
          break;
        case 'last_seen':
          valueA = new Date(a.last_seen || a.joined_at);
          valueB = new Date(b.last_seen || b.joined_at);
          break;
        default:
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }

      if (valueA < valueB) return order === 'asc' ? -1 : 1;
      if (valueA > valueB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  onSortChange(sortBy: string): void {
    if (this.activeFilters.sort === sortBy) {
      this.activeFilters.order = this.activeFilters.order === 'asc' ? 'desc' : 'asc';
    } else {
      this.activeFilters.sort = sortBy as any;
      this.activeFilters.order = 'asc';
    }
    this.applyFilters();
  }

  toggleContactSelection(contactId: number): void {
    if (this.selectedContacts.has(contactId)) {
      this.selectedContacts.delete(contactId);
    } else {
      this.selectedContacts.add(contactId);
    }
  }

  selectAllContacts(): void {
    if (this.selectedContacts.size === this.filteredContacts.length) {
      this.selectedContacts.clear();
    } else {
      this.filteredContacts.forEach(contact => {
        this.selectedContacts.add(contact.id);
      });
    }
  }

  clearSelection(): void {
    this.selectedContacts.clear();
  }

  getStatusBadgeClass(status: string, isActive: boolean): string {
    if (!isActive) return 'badge-secondary';
    
    switch (status) {
      case 'active': return 'badge-success';
      case 'away': return 'badge-warning';
      case 'busy': return 'badge-danger';
      default: return 'badge-info';
    }
  }

  getStatusIcon(status: string, isActive: boolean): string {
    if (!isActive) return 'fas fa-user-times';
    
    switch (status) {
      case 'active': return 'fas fa-user-check';
      case 'away': return 'fas fa-user-clock';
      case 'busy': return 'fas fa-user-slash';
      default: return 'fas fa-user';
    }
  }

  getOnlineIndicatorClass(isOnline: boolean): string {
    return isOnline ? 'status-online' : 'status-offline';
  }

  onRefresh(): void {
    this.loadContacts();
  }

  onExportContacts(): void {
    console.log('📥 Exportando contactos...');
    
    // Prepare data for export
    const dataToExport = this.filteredContacts.map(contact => ({
      Nombre: contact.name,
      Email: contact.email,
      Departamento: contact.department || 'N/A',
      Cargo: contact.position || 'N/A',
      Rol: contact.role,
      Estado: contact.is_active ? 'Activo' : 'Inactivo',
      'En Línea': contact.is_online ? 'Sí' : 'No'
    }));

    // Convert to CSV
    const headers = Object.keys(dataToExport[0] || {}).join(',');
    const rows = dataToExport.map(row => 
      Object.values(row).map(val => `"${val}"`).join(',')
    ).join('\n');
    const csv = `${headers}\n${rows}`;

    // Download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contactos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`${dataToExport.length} contacto(s) exportado(s) exitosamente`);
  }

  onSendBulkMessage(): void {
    if (this.selectedContacts.size === 0) {
      alert('Selecciona al menos un contacto');
      return;
    }

    const selectedIds = Array.from(this.selectedContacts);
    console.log('📧 Enviar mensaje masivo a:', selectedIds);
    
    // Navigate to compose with pre-selected recipients
    this.router.navigate(['/mensajeria/compose'], {
      state: { recipientIds: selectedIds }
    });
  }

  sendContactRequest(contact: Contact, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const message = prompt(`Mensaje opcional para ${contact.name}:`);
    
    this.messageService.sendContactRequest(contact.id, message || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Solicitud enviada');
          alert(`Solicitud enviada a ${contact.name}`);
        },
        error: (error) => {
          console.error('❌ Error enviando solicitud:', error);
          alert('Error al enviar la solicitud');
        }
      });
  }

  blockContact(contact: Contact, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (confirm(`¿Bloquear a ${contact.name}? No podrá enviarte mensajes.`)) {
      this.messageService.blockContact(contact.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('🚫 Contacto bloqueado');
            alert(`${contact.name} ha sido bloqueado`);
            this.loadContacts();
          },
          error: (error) => {
            console.error('❌ Error bloqueando contacto:', error);
            alert('Error al bloquear el contacto');
          }
        });
    }
  }

  viewContactDetails(contact: Contact, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    // TODO: Show contact details modal
    console.log('👤 Ver detalles de:', contact.name);
    alert(`Detalles de ${contact.name}:\n\nEmail: ${contact.email}\nDepartamento: ${contact.department || 'N/A'}\nCargo: ${contact.position || 'N/A'}`);
  }

  /**
   * Start a conversation with a contact
   */
  startChat(contact: Contact, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!contact.is_active) {
      console.warn('Cannot start chat with inactive user');
      return;
    }

    console.log('💬 Iniciando conversación con:', contact.name);

    // Create or get existing individual conversation with this contact
    this.messageService.createIndividualConversation(contact.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversation) => {
          console.log('✅ Conversación creada/recuperada:', conversation);

          // Navigate to direct chat with the conversation ID
          this.router.navigate(['/mensajeria/chat'], {
            queryParams: {
              conversationId: conversation.id,
              conversationTitle: conversation.title || `Chat con ${contact.name}`,
              contactId: contact.id,
              contactName: contact.name
            }
          });
        },
        error: (error) => {
          console.error('❌ Error al crear conversación:', error);
          alert('No se pudo iniciar la conversación. Por favor, intenta nuevamente.');
        }
      });
  }
}