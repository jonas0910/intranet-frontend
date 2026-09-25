import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MessageService } from './message.service';
import { environment } from '../../../../environments/environment';

describe('MessageService', () => {
  let service: MessageService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MessageService]
    });
    service = TestBed.inject(MessageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getMessages', () => {
    it('should return messages from API', () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            subject: 'Test Message',
            content: 'Test content',
            sender: { id: 1, name: 'Test User' },
            recipients: [{ id: 2, name: 'Recipient' }],
            created_at: '2023-01-01T00:00:00Z'
          }
        ],
        meta: {
          current_page: 1,
          per_page: 10,
          total: 1,
          last_page: 1
        }
      };

      service.getMessages({ page: 1 }).subscribe(response => {
        expect(response.data).toEqual(mockResponse.data);
        expect(response.meta).toEqual(mockResponse.meta);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages?page=1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle API errors gracefully', () => {
      service.getMessages({ page: 1 }).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages?page=1`);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', () => {
      const messageData = {
        conversation_id: 1,
        subject: 'Test Subject',
        content: 'Test content',
        recipients: [{ id: 2, type: 'user' as const }],
        priority: 'normal' as const,
        message_type: 'text' as const
      };

      const mockResponse = {
        success: true,
        message: 'Message sent successfully',
        data: {
          id: 1,
          ...messageData,
          created_at: '2023-01-01T00:00:00Z'
        }
      };

      service.sendMessage(messageData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe(1);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(messageData);
      req.flush(mockResponse);
    });

    it('should handle send message errors', () => {
      const messageData = {
        conversation_id: 1,
        subject: '',
        content: '',
        recipients: [],
        priority: 'normal' as const,
        message_type: 'text' as const
      };

      service.sendMessage(messageData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(422);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages`);
      req.flush({ errors: { subject: ['The subject field is required.'] } }, { 
        status: 422, 
        statusText: 'Validation Error' 
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', () => {
      const messageId = 1;
      const mockResponse = {
        success: true,
        message: 'Message marked as read'
      };

      service.markAsRead(messageId).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages/${messageId}/read`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });
  });

  describe('markAsUnread', () => {
    it('should mark message as unread', () => {
      const messageId = 1;
      const mockResponse = {
        success: true,
        message: 'Message marked as unread'
      };

      service.markAsUnread(messageId).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages/${messageId}/unread`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message', () => {
      const messageId = 1;
      const mockResponse = {
        success: true,
        message: 'Message deleted successfully'
      };

      service.deleteMessage(messageId).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages/${messageId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });
  });

  describe('replyToMessage', () => {
    it('should reply to message', () => {
      const messageId = 1;
      const replyData = {
        content: 'This is a reply',
        priority: 'normal' as const
      };

      const mockResponse = {
        success: true,
        message: 'Reply sent successfully',
        data: {
          id: 2,
          parent_message_id: messageId,
          content: replyData.content
        }
      };

      service.replyToMessage(messageId, replyData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.parent_message_id).toBe(messageId);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages/${messageId}/reply`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(replyData);
      req.flush(mockResponse);
    });
  });

  describe('forwardMessage', () => {
    it('should forward message', () => {
      const messageId = 1;
      const forwardData = {
        recipients: [{ id: 2, type: 'user' as const }, { id: 3, type: 'user' as const }],
        content: 'Forwarded message',
        priority: 'normal' as const
      };

      const mockResponse = {
        success: true,
        message: 'Message forwarded successfully',
        data: {
          id: 3,
          subject: 'FW: Original Subject',
          content: forwardData.content
        }
      };

      service.forwardMessage(messageId, forwardData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.subject).toContain('FW:');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages/${messageId}/forward`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(forwardData);
      req.flush(mockResponse);
    });
  });

  describe('searchMessages', () => {
    it('should search messages', () => {
      const query = 'test search';
      const filters = { folder: 'inbox' };

      const mockResponse = {
        data: [
          {
            id: 1,
            subject: 'Test Search Result',
            content: 'This contains the search term',
            sender: { id: 1, name: 'Test User' }
          }
        ],
        meta: {
          current_page: 1,
          per_page: 10,
          total: 1,
          last_page: 1
        }
      };

      service.searchMessages(query, filters).subscribe(response => {
        expect(response.data).toEqual(mockResponse.data);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages/search?q=${encodeURIComponent(query)}&folder=inbox`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', () => {
      const mockResponse = { count: 5 };

      service.getUnreadCount().subscribe(count => {
        expect(count).toBe(5);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages/unread-count`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getFolderStats', () => {
    it('should return folder statistics', () => {
      const mockResponse = {
        success: true,
        data: {
          inbox: { total: 10, unread: 3 },
          sent: { total: 5, unread: 0 },
          drafts: { total: 2, unread: 0 },
          important: { total: 1, unread: 1 }
        }
      };

      service.getFolderStats().subscribe(stats => {
        expect(stats.inbox.total).toBe(10);
        expect(stats.inbox.unread).toBe(3);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages/statistics`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('bulkOperation', () => {
    it('should perform bulk operations', () => {
      const operation = 'mark_read';
      const messageIds = [1, 2, 3];

      const mockResponse = {
        success: true,
        message: 'Bulk operation completed successfully'
      };

      service.bulkOperation(operation, messageIds).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages/bulk`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        operation,
        message_ids: messageIds
      });
      req.flush(mockResponse);
    });
  });

  describe('getRecentMessages', () => {
    it('should return recent messages', () => {
      const limit = 5;
      const mockResponse = {
        data: [
          {
            id: 1,
            subject: 'Recent Message 1',
            content: 'Content 1',
            sender: { id: 1, name: 'User 1' },
            created_at: '2023-01-01T12:00:00Z'
          },
          {
            id: 2,
            subject: 'Recent Message 2',
            content: 'Content 2',
            sender: { id: 2, name: 'User 2' },
            created_at: '2023-01-01T11:00:00Z'
          }
        ]
      };

      service.getRecentMessages(limit).subscribe(response => {
        expect(response.data.length).toBe(2);
        expect(response.data[0].id).toBe(1);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages/recent?limit=${limit}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('markAsImportant', () => {
    it('should mark message as important', () => {
      const messageId = 1;
      const mockResponse = {
        success: true,
        message: 'Message marked as important'
      };

      service.markAsImportant(messageId).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages/${messageId}/important`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });
  });

  describe('unmarkAsImportant', () => {
    it('should unmark message as important', () => {
      const messageId = 1;
      const mockResponse = {
        success: true,
        message: 'Message unmarked as important'
      };

      service.unmarkAsImportant(messageId).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/v1/mensajeria/messages/${messageId}/unimportant`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });
  });
});



