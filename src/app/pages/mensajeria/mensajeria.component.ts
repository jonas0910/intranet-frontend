import {
    Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MensajeriaService } from './services/mensajeria.service';
import { SystemLayoutComponent } from '../../shared/components/system-layout/system-layout.component';

@Component({
    selector: 'app-mensajeria',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, SystemLayoutComponent],
    templateUrl: './mensajeria.component.html',
    styleUrl: './mensajeria.component.scss'
})
export class MensajeriaComponent implements OnInit, OnDestroy {
    private authService = inject(AuthService);
    private mensajeriaService = inject(MensajeriaService);
    private cdr = inject(ChangeDetectorRef);
    private destroy$ = new Subject<void>();

    @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

    // ─── Auth ────────────────────────────────────────────────────────────────────
    usuarioActual: any = null;

    // ─── Conversaciones ───────────────────────────────────────────────────────────
    conversaciones: any[] = [];
    cargandoConvs = false;
    busquedaConv = '';
    isOnlineHidden: boolean = false;

    // ─── Conversación activa ──────────────────────────────────────────────────────
    convActiva: any = null;
    mensajes: any[] = [];
    cargandoMsgs = false;
    paginaMsgs = 1;
    hayMasMsgs = false;

    // ─── Input mensaje ────────────────────────────────────────────────────────────
    textoMensaje = '';
    enviando = false;

    // ─── Typing ───────────────────────────────────────────────────────────────────
    typingMap = new Map<number, { nombre: string; timeout: any }>();
    typingUsuarios: string[] = [];
    private typingTimer: any;

    // ─── Modal nueva conv ─────────────────────────────────────────────────────────
    mostrarModalNueva = false;
    contactos: any[] = [];
    busquedaContacto = '';
    contactosFiltrados: any[] = [];
    tipoNueva: 'individual' | 'group' = 'individual';
    tituloGrupo = '';
    contactosSeleccionados: any[] = [];
    cargandoContactos = false;
    creandoConv = false;
    mostrarMediaMenu = false;

    // ─── Multimedia / Overlay ─────────────────────────────────────────────────────
    showUploadOverlay = false;
    uploadType: 'image' | 'file' | 'audio' = 'file';
    selectedFiles: File[] = [];
    previews: any[] = [];
    mensajeAdjunto = '';
    isDragging = false;
    
    // Lightbox
    lightboxVisible = false;
    lightboxUrl = '';

    abrirLightbox(url: string): void {
        this.lightboxUrl = url;
        this.lightboxVisible = true;
    }

    cerrarLightbox(): void {
        this.lightboxVisible = false;
    }
    
    // Audio recording
    mediaRecorder: MediaRecorder | null = null;
    audioChunks: Blob[] = [];
    isRecording = false;
    recordingTime = 0;
    recordingInterval: any;
    audioUrlPre: string | null = null;
    @ViewChild('audioPreview') audioPreview!: ElementRef<HTMLAudioElement>;

    // ─── WS estado ────────────────────────────────────────────────────────────
    wsConectado = false;
    onlineUsers = new Set<number>();

    // ─── Panel de detalles ───────────────────────────────────────────────────
    mostrarDetalles = false;

    toggleDetalles(): void {
        this.mostrarDetalles = !this.mostrarDetalles;
    }

    // ─── Computed ─────────────────────────────────────────────────────────────────
    get convsFiltradas(): any[] {
        if (!this.busquedaConv.trim()) return this.conversaciones;
        const q = this.busquedaConv.toLowerCase();
        return this.conversaciones.filter(c =>
            this.getDisplayName(c).toLowerCase().includes(q)
        );
    }

    ngOnInit(): void {
        this.usuarioActual = this.authService.getCurrentUser();
        if (!this.usuarioActual) {
            const stored = localStorage.getItem('user');
            if (stored) this.usuarioActual = JSON.parse(stored);
        }

        this.cargarConversaciones();
        this.cargarUnreadCount();
        this.mensajeriaService.cargarPreferencias();

        if (this.usuarioActual?.id) {
            this.mensajeriaService.conectarWS(this.usuarioActual.id);
        }

        this.mensajeriaService.wsMessages$
            .pipe(takeUntil(this.destroy$))
            .subscribe(msg => this.dispatchWsEvent(msg));

        this.mensajeriaService.onlineUsers
            .pipe(takeUntil(this.destroy$))
            .subscribe(users => this.onlineUsers = users);

        this.mensajeriaService.isOnlineHidden
            .pipe(takeUntil(this.destroy$))
            .subscribe(hidden => this.isOnlineHidden = hidden);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.mensajeriaService.desconectarWS();
    }

    // ─── WS Dispatch ─────────────────────────────────────────────────────────────
    private dispatchWsEvent(msg: any): void {
        switch (msg.event) {
            case 'connection.established':
                this.wsConectado = true;
                break;
            case 'message.received':
                this.manejarMensajeEntrante(msg.data);
                break;
            case 'user.typing':
                this.manejarTyping(msg.data);
                break;
            case 'user.typing.stop':
                this.manejarTypingStop(msg.data);
                break;
        }
        this.cdr.detectChanges();
    }

    // ─── Cargar Conversaciones ────────────────────────────────────────────────────
    cargarConversaciones(): void {
        this.cargandoConvs = true;
        this.mensajeriaService.getConversaciones()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    // ConversationCollection devuelve { data: { data:[...], links, meta } }
                    this.conversaciones = res.data?.data ?? res.data ?? [];
                    this.cargandoConvs = false;
                    this.actualizarPresenceInicial();
                },
                error: () => { this.cargandoConvs = false; }
            });
    }

    private actualizarPresenceInicial(): void {
        const online = this.mensajeriaService.onlineUsers.value;
        this.conversaciones.forEach(c => {
            const participants = c.active_participants || c.participants || [];
            participants.forEach((p: any) => {
                if (p.is_online) online.add(+p.id);
            });
        });
        this.mensajeriaService.onlineUsers.next(new Set(online));
    }

    cargarUnreadCount(): void {
        this.mensajeriaService.getUnreadCount()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    // unreadCount devuelve { success: true, count: N }
                    const n = res.count ?? res.data?.unread_count ?? res.unread_count ?? 0;
                    this.mensajeriaService.unreadCount$.next(n);
                },
                error: () => { }
            });
    }

    // ─── Seleccionar conversación ─────────────────────────────────────────────────
    seleccionarConversacion(conv: any): void {
        if (this.convActiva?.id) {
            this.mensajeriaService.desuscribirConversacion(this.convActiva.id);
        }
        this.convActiva = conv;
        this.mensajes = [];
        this.paginaMsgs = 1;
        this.typingUsuarios = [];
        this.typingMap.clear();
        this.mostrarDetalles = false; // cerrar detalles al cambiar de conv
        this.cargarMensajes(conv.id);
        this.mensajeriaService.suscribirConversacion(conv.id);
        // Marcar como leído en backend y resetear badge local
        if (conv.unread_count > 0) {
            this.mensajeriaService.marcarConversacionLeida(conv.id).subscribe();
            const total = (this.mensajeriaService.unreadCount$.value || 0) - conv.unread_count;
            this.mensajeriaService.unreadCount$.next(Math.max(0, total));
            conv.unread_count = 0;
        }
    }

    // ─── Cargar mensajes ──────────────────────────────────────────────────────────
    cargarMensajes(convId: number, page = 1): void {
        this.cargandoMsgs = true;
        this.mensajeriaService.getMensajes(convId, page)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    // getConversationMessages devuelve ASC (más antiguo primero)
                    // No hace falta invertir — el orden ya es correcto para mostrar en chat
                    const lista = res.data?.data ?? res.data ?? res.messages ?? [];
                    if (page === 1) {
                        this.mensajes = Array.isArray(lista) ? lista : [];
                        setTimeout(() => this.scrollToBottom(), 60);
                    } else {
                        const container = this.messagesContainer?.nativeElement;
                        const prevScrollHeight = container?.scrollHeight || 0;
                        this.mensajes = [...(Array.isArray(lista) ? lista : []), ...this.mensajes];
                        setTimeout(() => {
                            if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
                        }, 0);
                    }
                    const meta = res.meta || res.data?.meta || res.pagination;
                    this.hayMasMsgs = meta ? meta.current_page < meta.last_page : false;
                    this.cargandoMsgs = false;
                },
                error: () => { this.cargandoMsgs = false; }
            });
    }

    cargarMasMensajes(): void {
        if (!this.hayMasMsgs || this.cargandoMsgs || !this.convActiva) return;
        this.paginaMsgs++;
        this.cargarMensajes(this.convActiva.id, this.paginaMsgs);
    }

    // ─── Enviar mensaje ───────────────────────────────────────────────────────────
    enviarMensaje(): void {
        const content = this.textoMensaje.trim();
        if (!content || !this.convActiva || this.enviando) return;
        this.enviando = true;
        this.textoMensaje = '';

        this.mensajeriaService.enviarMensaje(this.convActiva.id, content, '', this.convActiva.conversation_type)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    const msg = res.data || res;
                    this.mensajes.push(msg);
                    this.enviando = false;
                    this.scrollToBottom();
                    this.actualizarPreviewConv(this.convActiva.id, content);
                },
                error: () => {
                    this.textoMensaje = content;
                    this.enviando = false;
                }
            });
    }

    // ─── Multimedia Logic ────────────────────────────────────────────────────────
    toggleMediaMenu(): void {
        this.mostrarMediaMenu = !this.mostrarMediaMenu;
    }

    abrirCarga(type: 'image' | 'file' | 'audio'): void {
        this.uploadType = type;
        this.showUploadOverlay = true;
        this.mostrarMediaMenu = false;
        this.selectedFiles = [];
        this.previews = [];
        this.mensajeAdjunto = '';
        this.limpiarGrabacion();
    }

    cerrarCarga(): void {
        this.showUploadOverlay = false;
        this.limpiarGrabacion();
    }

    onFileSelected(e: any): void {
        const files = e.target.files;
        if (files) this.handleFiles(files);
    }

    handleFiles(fileList: FileList | File[]): void {
        const files = Array.from(fileList);
        this.selectedFiles = [...this.selectedFiles, ...files];
        
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e: any) => {
                    this.previews.push({ type: 'image', url: e.target.result, name: file.name });
                    this.cdr.detectChanges();
                };
                reader.readAsDataURL(file);
            } else {
                this.previews.push({ type: 'file', name: file.name });
            }
        });
    }

    removerArchivo(index: number): void {
        this.selectedFiles.splice(index, 1);
        this.previews.splice(index, 1);
    }

    async enviarMultimedia(): Promise<void> {
        if ((this.selectedFiles.length === 0 && !this.audioUrlPre) || !this.convActiva || this.enviando) return;
        this.enviando = true;

        const filesToSend = [...this.selectedFiles];
        if (this.audioUrlPre && this.audioChunks.length > 0) {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
            filesToSend.push(audioFile);
        }

        const comment = this.mensajeAdjunto.trim();
        
        // El usuario quiere que cada archivo sea un mensaje independiente
        for (let i = 0; i < filesToSend.length; i++) {
            const file = filesToSend[i];
            const textToLink = i === 0 ? comment : ''; // Solo el primer mensaje lleva el comentario? 
            // O mejor repetir el comentario si el usuario lo puso. 
            // Según especificación: "podra abajo escribir algo opcionalmente para acompañar al archivo"
            
            try {
                const res = await this.mensajeriaService.enviarMensaje(
                    this.convActiva.id, 
                    textToLink || 'Archivo adjunto', 
                    '', 
                    this.convActiva.conversation_type, 
                    file
                ).toPromise();
                
                const msg = res.data || res;
                this.mensajes.push(msg);
                this.actualizarPreviewConv(this.convActiva.id, textToLink || 'Archivo adjunto');
            } catch (err) {
                console.error('Error enviando archivo:', file.name, err);
            }
        }

        this.enviando = false;
        this.showUploadOverlay = false;
        this.selectedFiles = [];
        this.previews = [];
        this.audioUrlPre = null;
        this.audioChunks = [];
        this.scrollToBottom();
    }

    // ─── Audio Recording ────────────────────────────────────────────────────────
    async iniciarGrabacion(): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.recordingTime = 0;
            this.isRecording = true;

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.audioUrlPre = URL.createObjectURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
                this.cdr.detectChanges();
            };

            this.mediaRecorder.start();
            this.recordingInterval = setInterval(() => {
                this.recordingTime++;
            }, 1000);

        } catch (err) {
            alert('No se pudo acceder al micrófono');
            console.error(err);
        }
    }

    detenerGrabacion(): void {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            clearInterval(this.recordingInterval);
        }
    }

    limpiarGrabacion(): void {
        this.audioUrlPre = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordingTime = 0;
        clearInterval(this.recordingInterval);
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }

    formatTime(sec: number): string {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    onDragOver(e: DragEvent): void {
        e.preventDefault();
        this.isDragging = true;
    }

    onDragLeave(e: DragEvent): void {
        e.preventDefault();
        this.isDragging = false;
    }

    onDrop(e: DragEvent): void {
        e.preventDefault();
        this.isDragging = false;
        const files = e.dataTransfer?.files;
        if (files) this.handleFiles(files);
    }

    onEnterKey(e: KeyboardEvent): void {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.enviarMensaje();
        }
    }

    // ─── Typing ───────────────────────────────────────────────────────────────────
    onTyping(): void {
        clearTimeout(this.typingTimer);
        if (this.convActiva && this.usuarioActual) {
            this.mensajeriaService.enviarTyping(this.convActiva.id, this.usuarioActual.id, this.usuarioActual.name);
            this.typingTimer = setTimeout(() => {
                this.mensajeriaService.enviarTypingStop(this.convActiva.id, this.usuarioActual.id);
            }, 2500);
        }
    }

    private manejarTyping(data: any): void {
        if (!data || +data.user_id === this.usuarioActual?.id) return;
        const uid = +data.user_id;
        const existing = this.typingMap.get(uid);
        if (existing) clearTimeout(existing.timeout);
        const timeout = setTimeout(() => {
            this.typingMap.delete(uid);
            this.typingUsuarios = Array.from(this.typingMap.values()).map(v => v.nombre);
        }, 3000);
        this.typingMap.set(uid, { nombre: data.user_name || 'Alguien', timeout });
        this.typingUsuarios = Array.from(this.typingMap.values()).map(v => v.nombre);
    }

    private manejarTypingStop(data: any): void {
        if (!data) return;
        const uid = +data.user_id;
        const existing = this.typingMap.get(uid);
        if (existing) { clearTimeout(existing.timeout); this.typingMap.delete(uid); }
        this.typingUsuarios = Array.from(this.typingMap.values()).map(v => v.nombre);
    }

    // ─── Mensaje entrante WS ──────────────────────────────────────────────────────
    private manejarMensajeEntrante(data: any): void {
        if (!data) return;
        // El broadcaster de Laravel envía { message: {...}, conversation: {...} }
        const msg = data.message ?? data;
        const convId = msg.conversation_id ?? data.conversation?.id;
        if (!convId) return;

        // Si el mensaje es del usuario actual, YA fue añadido via respuesta HTTP → ignorar
        if (+msg.sender_id === +this.usuarioActual?.id) return;

        if (convId === this.convActiva?.id) {
            if (!this.mensajes.find(m => String(m.id) === String(msg.id))) {
                this.mensajes.push(msg);
                setTimeout(() => this.scrollToBottom(), 30);
            }
            if (msg.id) this.mensajeriaService.marcarLeido(msg.id).subscribe();
        } else {
            const actual = this.mensajeriaService.unreadCount$.value;
            this.mensajeriaService.unreadCount$.next(actual + 1);
            const conv = this.conversaciones.find(c => c.id === convId);
            if (conv) conv.unread_count = (conv.unread_count || 0) + 1;
        }
        this.actualizarPreviewConv(convId, msg.content);
    }

    private actualizarPreviewConv(convId: number, content: string): void {
        const conv = this.conversaciones.find(c => c.id === convId);
        if (conv) {
            conv.last_message = { content };
            conv.updated_at = new Date().toISOString();
            // Subir al tope
            this.conversaciones = [conv, ...this.conversaciones.filter(c => c.id !== convId)];
        }
    }

    // ─── Modal nueva conv ─────────────────────────────────────────────────────────
    abrirModalNueva(): void {
        this.mostrarModalNueva = true;
        this.tipoNueva = 'individual';
        this.tituloGrupo = '';
        this.busquedaContacto = '';
        this.contactosSeleccionados = [];
        if (this.contactos.length === 0) this.cargarContactos();
        else this.contactosFiltrados = this.contactos;
    }

    cerrarModalNueva(): void {
        this.mostrarModalNueva = false;
    }

    cargarContactos(): void {
        this.cargandoContactos = true;
        this.mensajeriaService.getContactos()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    this.contactos = res.data || res || [];
                    this.contactosFiltrados = this.contactos;
                    this.cargandoContactos = false;
                },
                error: () => { this.cargandoContactos = false; }
            });
    }

    onBusquedaContacto(): void {
        const q = this.busquedaContacto.toLowerCase();
        this.contactosFiltrados = this.contactos.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q)
        );
    }

    crearConvIndividual(contacto: any): void {
        if (this.creandoConv) return;
        this.creandoConv = true;
        this.mensajeriaService.crearConversacionIndividual(contacto.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    const conv = res.data || res;
                    const existe = this.conversaciones.find(c => c.id === conv.id);
                    if (!existe) this.conversaciones.unshift(conv);
                    this.seleccionarConversacion(conv);
                    this.mostrarModalNueva = false;
                    this.creandoConv = false;
                },
                error: () => { this.creandoConv = false; }
            });
    }

    crearConvGrupal(): void {
        if (!this.tituloGrupo.trim() || this.contactosSeleccionados.length < 1 || this.creandoConv) return;
        this.creandoConv = true;
        this.mensajeriaService.crearConversacionGrupal({
            title: this.tituloGrupo,
            participant_ids: this.contactosSeleccionados.map(c => c.id)
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    const conv = res.data || res;
                    this.conversaciones.unshift(conv);
                    this.seleccionarConversacion(conv);
                    this.mostrarModalNueva = false;
                    this.creandoConv = false;
                },
                error: () => { this.creandoConv = false; }
            });
    }

    toggleContactoGrupo(c: any): void {
        const idx = this.contactosSeleccionados.findIndex(x => x.id === c.id);
        if (idx > -1) this.contactosSeleccionados.splice(idx, 1);
        else this.contactosSeleccionados.push(c);
    }

    isContactoSeleccionado(c: any): boolean {
        return this.contactosSeleccionados.some(x => x.id === c.id);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────────
    getDisplayName(conv: any): string {
        // Preferir display_title calculado por el backend (ya resuelve el nombre del otro usuario)
        if (conv.display_title) return conv.display_title;
        if (conv.conversation_type === 'individual') {
            const otro = (conv.active_participants || conv.participants)
                ?.find((p: any) => (p.id ?? p.user_id) !== this.usuarioActual?.id);
            return otro?.name || conv.title || 'Conversación';
        }
        return conv.title || 'Grupo';
    }

    getAvatar(conv: any): string {
        return (this.getDisplayName(conv).charAt(0) || '?').toUpperCase();
    }

    getOtroUserId(conv: any): number {
        if (conv.conversation_type !== 'individual') return -1;
        const otro = conv.participants?.find((p: any) => p.user_id !== this.usuarioActual?.id);
        return otro?.user_id || -1;
    }

    esMio(msg: any): boolean {
        return +msg.sender_id === this.usuarioActual?.id;
    }

    isOnline(userId: number): boolean {
        return this.onlineUsers.has(userId);
    }

    formatHora(fecha: string): string {
        if (!fecha) return '';
        return new Date(fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    }

    formatFechaConv(fecha: string): string {
        if (!fecha) return '';
        const d = new Date(fecha);
        const now = new Date();
        const isHoy = d.toDateString() === now.toDateString();
        if (isHoy) return this.formatHora(fecha);
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) return dias[d.getDay()];
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    trackMsg(index: number, msg: any): any {
        return msg.id || index;
    }

    scrollToBottom(): void {
        const el = this.messagesContainer?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
    }

    onTextareaInput(e: Event): void {
        const ta = e.target as HTMLTextAreaElement;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
        this.onTyping();
    }

    togglePrivacyMode(): void {
        const newValue = !this.isOnlineHidden;
        this.mensajeriaService.updateMessagingPreferences(newValue).subscribe();
    }
}
