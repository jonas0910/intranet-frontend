import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { CustomEchoWebSocketService } from '../../../services/custom-echo-websocket.service';
import { WebSocketMessageBridgeService } from '../../../services/websocket-message-bridge.service';
import { BadgeService } from '../../../services/badge.service';
import { AuthService } from '../../../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class MensajeriaService {
    private apiUrl = `${environment.apiUrl}/v1/mensajeria`;

    // WebSocket
    private wsEvents$ = new Subject<{ event: string; data: any; channel?: string }>();
    wsMessages$ = this.wsEvents$.asObservable();
    private currentUserId: number | null = null;
    private subscribedChannels = new Set<string>();
    public onlineUsers = new BehaviorSubject<Set<number>>(new Set());
    public isOnlineHidden = new BehaviorSubject<boolean>(false);
    private destroying = false;

    // Badge contador
    unreadCount$ = new BehaviorSubject<number>(0);

    constructor(
        private http: HttpClient,
        private echoWs: CustomEchoWebSocketService,
        private wsBridge: WebSocketMessageBridgeService,
        private badgeService: BadgeService,
        private authService: AuthService
    ) {
        // Suscribirse al túnel principal para reenviar eventos a los componentes de mensajería
        this.wsBridge.messages$.subscribe(msg => {
            if (msg) {
                this.wsEvents$.next(msg);
                this.handleGlobalPresence(msg);
            }
        });

        // Sincronizar unreadCount$ local con BadgeService global
        this.unreadCount$.subscribe(count => {
            this.badgeService.updateCounter('unreadMessages', count);
            this.badgeService.updateCounter('unreadConversations', count);
        });

        // Escuchar cambios de sesión para resetear el estado de presencia al cerrar sesión
        this.authService.currentUser$.subscribe(user => {
            if (!user) {
                this.desconectarWS();
                this.resetEstado();
            }
        });

        // Sincronizar estado de visibilidad con el servicio WebSocket
        this.isOnlineHidden.subscribe(hidden => {
            this.echoWs.setOnlineHidden(hidden);
        });
    }

    public resetEstado(): void {
        this.onlineUsers.next(new Set());
        this.currentUserId = null;
        this.subscribedChannels.clear();
        this.unreadCount$.next(0);
    }

    private handleGlobalPresence(msg: any): void {
        const users = this.onlineUsers.value;
        let changed = false;

        switch (msg.event) {
            case 'user.status.changed':
            case 'user.status':
                if (msg.data?.status === 'online') {
                    users.add(+msg.data.user_id);
                } else {
                    users.delete(+msg.data.user_id);
                }
                changed = true;
                break;
            case 'user.connected':
                if (msg.data?.online_users && Array.isArray(msg.data.online_users)) {
                    msg.data.online_users.forEach((uid: any) => users.add(+uid));
                } else if (msg.data?.user_id) {
                    users.add(+msg.data?.user_id);
                }
                changed = true;
                break;
            case 'user.disconnected':
                users.delete(+msg.data?.user_id);
                changed = true;
                break;
        }

        if (changed) {
            this.onlineUsers.next(new Set(users));
        }
    }

    // ─── HTTP Methods ────────────────────────────────────────────────────────────

    getConversaciones(): Observable<any> {
        return this.http.get(`${this.apiUrl}/conversations`);
    }

    crearConversacionIndividual(participantId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/conversations/individual`, { user_id: participantId });
    }

    crearConversacionGrupal(data: { title: string; participant_ids: number[] }): Observable<any> {
        return this.http.post(`${this.apiUrl}/conversations/group`, {
            title: data.title,
            participants: data.participant_ids   // backend espera 'participants'
        });
    }

    getMensajes(conversationId: number, page = 1): Observable<any> {
        return this.http.get(`${this.apiUrl}/conversations/${conversationId}/messages?page=${page}`);
    }

    enviarMensaje(conversationId: number, content: string, subject = '', conversationType = 'individual', file?: File): Observable<any> {
        // message_type debe coincidir con conversation_type (individual|group|department)
        const messageType = ['group', 'department', 'broadcast'].includes(conversationType)
            ? conversationType
            : 'individual';

        if (file) {
            const formData = new FormData();
            formData.append('conversation_id', conversationId.toString());
            formData.append('content', content);
            formData.append('subject', subject);
            formData.append('message_type', messageType);
            formData.append('attachments[]', file);
            return this.http.post(`${this.apiUrl}/messages`, formData);
        }

        return this.http.post(`${this.apiUrl}/messages`, {
            conversation_id: conversationId,
            content,
            subject,
            message_type: messageType
        });
    }

    marcarLeido(messageId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/messages/${messageId}/read`, {}).pipe(
            tap(() => this.refreshUnreadCount())
        );
    }

    marcarConversacionLeida(conversationId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/conversations/${conversationId}/mark-read`, {}).pipe(
            tap(() => this.refreshUnreadCount())
        );
    }

    refreshUnreadCount(): void {
        this.getUnreadCount().subscribe(res => {
            // El usuario prefiere contar conversaciones con mensajes no leídos en el badge principal
            const msgCount = res.count ?? res.data?.unread_count ?? res.unread_count ?? 0;
            const convCount = res.data?.unread_conversations_count ?? res.unread_conversations_count ?? (msgCount > 0 ? 1 : 0);
            
            this.unreadCount$.next(convCount);
            // Actualizar el servicio de badges global (usamos convCount para que el badge de la campana/sobre sea igual a la lista)
            this.badgeService.updateCounter('unreadMessages', convCount);
            this.badgeService.updateCounter('unreadConversations', convCount);
        });
    }

    getContactos(): Observable<any> {
        return this.http.get(`${this.apiUrl}/contacts`);
    }

    getUnreadCount(): Observable<any> {
        return this.http.get(`${this.apiUrl}/unread-count`);
    }

    // ─── WebSocket Methods ───────────────────────────────────────────────────────

    conectarWS(userId: number): void {
        this.destroying = false;
        this.currentUserId = userId;
        // Delegar la conexión al Echo WebSocket Global
        this.echoWs.connect();
    }

    desconectarWS(): void {
        this.destroying = true;
        this.subscribedChannels.forEach(canal => {
            this.echoWs.leave(canal);
        });
        this.subscribedChannels.clear();
        this.echoWs.disconnectUser();
        this.resetEstado();
    }

    suscribirConversacion(id: number): void {
        const canal = `conversation.${id}`;
        if (!this.subscribedChannels.has(canal)) {
            this.subscribedChannels.add(canal);
            this.echoWs.channel(canal);
        }
    }

    desuscribirConversacion(id: number): void {
        const canal = `conversation.${id}`;
        this.subscribedChannels.delete(canal);
        this.echoWs.leave(canal);
    }

    enviarTyping(conversationId: number, userId: number, userName: string): void {
        this.echoWs.sendTypingIndicator(conversationId, true);
    }

    enviarTypingStop(conversationId: number, userId: number): void {
        this.echoWs.sendTypingIndicator(conversationId, false);
    }

    getMessagingPreferences(): Observable<any> {
        return this.http.get(`${this.apiUrl}/notifications/messaging-preferences`);
    }

    updateMessagingPreferences(hidden: boolean): Observable<any> {
        // Actualizar inmediatamente el estado local para evitar UI flicker
        this.isOnlineHidden.next(hidden);

        return this.http.put(`${this.apiUrl}/notifications/messaging-preferences`, {
            is_online_hidden: hidden
        }).pipe(
            tap((res: any) => {
                if (res.success) {
                    this.isOnlineHidden.next(res.data.is_online_hidden);
                    if (hidden) {
                        this.echoWs.disconnectUser(); // Avisar al servidor que el usuario deja de estar “en línea” para presencia
                        // Forzar removerse del set de onlineUsers localmente
                        const currentUserId = this.authService.getCurrentUser()?.id;
                        if (currentUserId) {
                            const users = this.onlineUsers.value;
                            if (users.has(currentUserId)) {
                                users.delete(currentUserId);
                                this.onlineUsers.next(new Set(users));
                            }
                        }
                    } else {
                        // Al volver a ser visible, nos conectamos
                        this.echoWs.connectUser();
                    }
                }
            })
        );
    }

    cargarPreferencias(): void {
        this.getMessagingPreferences().subscribe(res => {
            if (res.success && res.data) {
                this.isOnlineHidden.next(res.data.is_online_hidden);
            }
        });
    }
}
