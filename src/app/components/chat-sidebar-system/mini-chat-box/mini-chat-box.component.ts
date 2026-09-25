import {
    Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, ChangeDetectorRef, Input, Output, EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { MensajeriaService } from '../../../pages/mensajeria/services/mensajeria.service';
import { ChatSidebarService } from '../chat-sidebar.service';

@Component({
    selector: 'app-mini-chat-box',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './mini-chat-box.component.html',
    styleUrl: './mini-chat-box.component.scss',
    host: {
        '[class.minimized]': 'minimized'
    }
})
export class MiniChatBoxComponent implements OnInit, OnDestroy {
    private authService = inject(AuthService);
    private mensajeriaService = inject(MensajeriaService);
    private chatSidebarService = inject(ChatSidebarService);
    private cdr = inject(ChangeDetectorRef);
    private destroy$ = new Subject<void>();

    @Input() conversation: any;
    @Input() zIndex: number = 1000;
    @Input() minimized: boolean = false;
    @Output() onClose = new EventEmitter<number>();
    @Output() onMinimize = new EventEmitter<number>();

    @ViewChild('miniMessages') miniMessages!: ElementRef<HTMLDivElement>;

    usuarioActual: any = null;
    mensajesMini: any[] = [];
    cargandoMsgs = false;
    textoMini = '';
    enviandoMini = false;

    // Typing
    typingUsuarios: string[] = [];
    typingMap = new Map<number, any>();
    private typingTimer: any;
    mostrarMediaMenu = false;
    mostrarDetalles = false;

    // Multimedia
    showUploadOverlay = false;
    uploadType: 'image' | 'file' | 'audio' = 'file';
    selectedFiles: File[] = [];
    previews: any[] = [];
    mensajeAdjunto = '';
    isDragging = false;
    
    // Audio recording
    mediaRecorder: MediaRecorder | null = null;
    audioChunks: Blob[] = [];
    isRecording = false;
    recordingTime = 0;
    recordingInterval: any;
    audioUrlPre: string | null = null;

    ngOnInit(): void {
        this.usuarioActual = this.authService.getCurrentUser();
        
        if (this.conversation) {
            this.cargarMensajes();
            this.mensajeriaService.suscribirConversacion(this.conversation.id);
        }

        // Suscribir eventos WS
        this.mensajeriaService.wsMessages$
            .pipe(takeUntil(this.destroy$))
            .subscribe(msg => this.dispatchWsEvent(msg));

        // Suscribir a usuarios en línea
        this.mensajeriaService.onlineUsers
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.cdr.detectChanges());
    }

    ngOnDestroy(): void {
        if (this.conversation) {
            this.mensajeriaService.desuscribirConversacion(this.conversation.id);
        }
        this.destroy$.next();
        this.destroy$.complete();
        this.limpiarGrabacion();
    }

    cargarMensajes(): void {
        this.cargandoMsgs = true;
        this.mensajeriaService.getMensajes(this.conversation.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    this.mensajesMini = (res.data || res.messages || []);
                    this.cargandoMsgs = false;
                    setTimeout(() => this.scrollToBottom(), 50);
                    
                    // Marcar leída
                    if (this.conversation.unread_count > 0) {
                        this.mensajeriaService.marcarConversacionLeida(this.conversation.id).subscribe();
                        // Actualizar contador global (esto debería ser manejado por un servicio de notificaciones/mensajería global)
                    }
                },
                error: () => { this.cargandoMsgs = false; }
            });
    }

    private dispatchWsEvent(msg: any): void {
        switch (msg.event) {
            case 'message.received':
                this.handleIncomingMessage(msg.data);
                break;
            case 'user.typing':
                this.handleTyping(msg.data);
                break;
            case 'user.typing.stop':
                this.handleTypingStop(msg.data);
                break;
        }
        this.cdr.detectChanges();
    }

    private handleIncomingMessage(data: any): void {
        if (!data) return;
        const msg = data.message ?? data;
        const convId = msg.conversation_id ?? data.conversation?.id;
        if (convId !== this.conversation.id) return;

        // Si el mensaje es del usuario actual, ya fue añadido via HTTP → ignorar
        if (+msg.sender_id === +this.usuarioActual?.id) return;

        if (!this.mensajesMini.find(m => m.id === msg.id)) {
            this.mensajesMini.push(msg);
            setTimeout(() => this.scrollToBottom(), 40);
        }
        if (msg.id) {
            this.mensajeriaService.marcarLeido(msg.id).subscribe();
            if (!this.minimized) {
                this.conversation.unread_count = 0;
            }
        }
    }

    private handleTyping(data: any): void {
        if (!data || +data.user_id === this.usuarioActual?.id) return;
        if (+data.conversation_id !== this.conversation.id) return;
        const uid = +data.user_id;
        const existing = this.typingMap.get(uid);
        if (existing) clearTimeout(existing);
        const timeout = setTimeout(() => {
            this.typingMap.delete(uid);
            this.typingUsuarios = [];
        }, 3000);
        this.typingMap.set(uid, timeout);
        this.typingUsuarios = [data.user_name || 'Alguien'];
    }

    private handleTypingStop(data: any): void {
        if (!data) return;
        const uid = +data.user_id;
        const t = this.typingMap.get(uid);
        if (t) { clearTimeout(t); this.typingMap.delete(uid); }
        this.typingUsuarios = [];
    }

    enviarMiniMensaje(): void {
        const content = this.textoMini.trim();
        if (!content || !this.conversation || this.enviandoMini) return;
        this.enviandoMini = true;
        this.textoMini = '';
        this.mensajeriaService.enviarMensaje(this.conversation.id, content, '', this.conversation.conversation_type)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    this.mensajesMini.push(res.data || res);
                    this.enviandoMini = false;
                    setTimeout(() => this.scrollToBottom(), 30);
                },
                error: () => { this.textoMini = content; this.enviandoMini = false; }
            });
    }

    closeChat(): void {
        this.onClose.emit(this.conversation.id);
    }

    minimizeChat(): void {
        // Emitir al padre para que el servicio central actualice el estado
        this.onMinimize.emit(this.conversation.id);
        
        // Efecto secundario: si se va a minimizar, cerramos detalles
        if (!this.minimized) {
            this.mostrarDetalles = false;
        }
        
        // Hacer scroll al fondo al restaurar (con pequeño delay por animación)
        if (this.minimized) {
            setTimeout(() => this.scrollToBottom(), 350);
        }
    }

    toggleDetalles(): void {
        this.mostrarDetalles = !this.mostrarDetalles;
        this.cdr.detectChanges();
    }

    scrollToBottom(): void {
        const el = this.miniMessages?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
    }

    getDisplayName(): string {
        const conv = this.conversation;
        if (conv.display_title) return conv.display_title;
        if (conv.conversation_type === 'individual') {
            const otro = (conv.active_participants || conv.participants)
                ?.find((p: any) => (p.id ?? p.user_id) !== this.usuarioActual?.id);
            return otro?.name || conv.title || 'Conversación';
        }
        return conv.title || 'Grupo';
    }

    getAvatar(): string {
        return (this.getDisplayName().charAt(0) || '?').toUpperCase();
    }

    esMio(msg: any): boolean {
        return +msg.sender_id === this.usuarioActual?.id;
    }

    getOtroUserId(): number {
        if (!this.conversation || this.conversation.conversation_type !== 'individual') return -1;
        const otro = (this.conversation.active_participants || this.conversation.participants)
            ?.find((p: any) => (p.id ?? p.user_id) !== this.usuarioActual?.id);
        return otro?.id ?? otro?.user_id ?? -1;
    }

    isOnline(userId: number): boolean {
        return this.mensajeriaService.onlineUsers.value.has(userId);
    }

    formatHora(fecha: string): string {
        if (!fecha) return '';
        return new Date(fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    }

    // Multimedia Logic (Copy from chat-bubble)
    toggleMediaMenu(): void { this.mostrarMediaMenu = !this.mostrarMediaMenu; }
    abrirCarga(type: 'image' | 'file' | 'audio'): void {
        this.uploadType = type;
        this.showUploadOverlay = true;
        this.mostrarMediaMenu = false;
        this.selectedFiles = [];
        this.previews = [];
        this.mensajeAdjunto = '';
        this.limpiarGrabacion();
    }
    cerrarCarga(): void { this.showUploadOverlay = false; this.limpiarGrabacion(); }
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
            } else { this.previews.push({ type: 'file', name: file.name }); }
        });
    }
    removerArchivo(index: number): void {
        this.selectedFiles.splice(index, 1);
        this.previews.splice(index, 1);
    }
    async enviarMultimedia(): Promise<void> {
        if ((this.selectedFiles.length === 0 && !this.audioUrlPre) || !this.conversation || this.enviandoMini) return;
        this.enviandoMini = true;
        const filesToSend = [...this.selectedFiles];
        if (this.audioUrlPre && this.audioChunks.length > 0) {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
            filesToSend.push(audioFile);
        }
        const comment = this.mensajeAdjunto.trim();
        for (let i = 0; i < filesToSend.length; i++) {
            const file = filesToSend[i];
            const textToLink = i === 0 ? comment : '';
            try {
                const res = await this.mensajeriaService.enviarMensaje(
                    this.conversation.id, textToLink || 'Archivo adjunto', '', this.conversation.conversation_type, file
                ).toPromise();
                this.mensajesMini.push(res.data || res);
            } catch (err) { console.error('Error mini-upload:', err); }
        }
        this.enviandoMini = false;
        this.showUploadOverlay = false;
        this.selectedFiles = [];
        this.previews = [];
        this.audioUrlPre = null;
        this.audioChunks = [];
        setTimeout(() => this.scrollToBottom(), 50);
    }

    async iniciarGrabacion(): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.recordingTime = 0;
            this.isRecording = true;
            this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.audioChunks.push(e.data); };
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.audioUrlPre = URL.createObjectURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
                this.cdr.detectChanges();
            };
            this.mediaRecorder.start();
            this.recordingInterval = setInterval(() => { this.recordingTime++; }, 1000);
        } catch (err) { alert('No microphone access'); }
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
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
    }
    formatTime(sec: number): string {
        const m = Math.floor(sec / 60); const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    onDragOver(e: DragEvent): void { e.preventDefault(); this.isDragging = true; }
    onDragLeave(e: DragEvent): void { e.preventDefault(); this.isDragging = false; }
    onDrop(e: DragEvent): void {
        e.preventDefault(); this.isDragging = false;
        const files = e.dataTransfer?.files;
        if (files) this.handleFiles(files);
    }
    onMiniEnter(e: KeyboardEvent): void {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.enviarMiniMensaje(); }
    }
    onMiniTyping(): void {
        clearTimeout(this.typingTimer);
        if (this.conversation && this.usuarioActual) {
            this.mensajeriaService.enviarTyping(this.conversation.id, this.usuarioActual.id, this.usuarioActual.name);
            this.typingTimer = setTimeout(() => {
                this.mensajeriaService.enviarTypingStop(this.conversation.id, this.usuarioActual.id);
            }, 2500);
        }
    }

    trackMsg(index: number, msg: any): any { return msg.id || index; }
}
