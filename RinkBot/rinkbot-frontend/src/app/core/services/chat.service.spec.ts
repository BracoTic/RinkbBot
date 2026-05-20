import { TestBed }          from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { ChatService } from './chat.service';
import { Chat }        from '../models/chat.model';
import { Message }     from '../models/message.model';

// ─────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────
const mockChat: Chat = {
  id:         1,
  titulo:     'Chat de prueba',
  tipo_chat:  'texto',
  chat_json:  [],
  created_at: new Date('2025-01-01'),
};

const mockMessages: Message[] = [
  { role: 'user',      content: 'Hola',      timestamp: new Date() },
  { role: 'assistant', content: 'Hola a ti', timestamp: new Date() },
];

// ─────────────────────────────────────────────────────────────
describe('ChatService', () => {
  let service:     ChatService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ChatService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service     = TestBed.inject(ChatService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  // ── Creación y estado inicial ────────────────────────────────
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('initialises with an empty messages signal', () => {
    expect(service.messages()).toEqual([]);
  });

  it('initialises with isLoading = false', () => {
    expect(service.isLoading()).toBe(false);
  });

  // ── sendMessage() ───────────────────────────────────────────
  describe('sendMessage()', () => {
    it('sends POST /api/chat with the correct body', () => {
      service.sendMessage('hola mundo').subscribe();

      const req = httpTesting.expectOne('/api/chat');

      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ message: 'hola mundo' });

      req.flush({ response: 'ok' });
    });

    it('appends the user message to the signal BEFORE the HTTP response', () => {
      service.sendMessage('primera pregunta').subscribe();

      // El mensaje de usuario se añade de forma síncrona, antes del flush
      expect(service.messages().length).toBe(1);
      expect(service.messages()[0]).toEqual(
        expect.objectContaining({ role: 'user', content: 'primera pregunta' })
      );

      httpTesting.expectOne('/api/chat').flush({ response: 'respuesta' });
    });

    it('appends the assistant reply to the signal AFTER the HTTP response', () => {
      let emitted = '';
      service.sendMessage('pregunta').subscribe(r => (emitted = r));

      httpTesting.expectOne('/api/chat').flush({ response: 'respuesta del bot' });

      expect(emitted).toBe('respuesta del bot');
      expect(service.messages().length).toBe(2);
      expect(service.messages()[1]).toEqual(
        expect.objectContaining({ role: 'assistant', content: 'respuesta del bot' })
      );
    });

    it('sets isLoading to true while the request is in flight', () => {
      service.sendMessage('test').subscribe();

      expect(service.isLoading()).toBe(true);

      httpTesting.expectOne('/api/chat').flush({ response: 'ok' });
    });

    it('resets isLoading to false after a successful response', () => {
      service.sendMessage('test').subscribe();

      httpTesting.expectOne('/api/chat').flush({ response: 'ok' });

      expect(service.isLoading()).toBe(false);
    });

    it('resets isLoading to false even on HTTP error (finalize)', () => {
      service.sendMessage('test').subscribe({ error: () => {} });

      httpTesting
        .expectOne('/api/chat')
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(service.isLoading()).toBe(false);
    });
  });

  // ── clearMessages() ─────────────────────────────────────────
  describe('clearMessages()', () => {
    it('empties the messages signal', () => {
      service.sendMessage('algo').subscribe();
      httpTesting.expectOne('/api/chat').flush({ response: 'ok' });
      expect(service.messages().length).toBeGreaterThan(0);

      service.clearMessages();

      expect(service.messages()).toEqual([]);
    });
  });

  // ── loadHistory() ───────────────────────────────────────────
  describe('loadHistory()', () => {
    it('sends GET /api/chats', () => {
      service.loadHistory().subscribe();

      const req = httpTesting.expectOne(r => r.url === '/api/chats');
      expect(req.request.method).toBe('GET');

      req.flush({ chats: [] });
    });

    it('sends the limit=50 query parameter', () => {
      service.loadHistory().subscribe();

      const req = httpTesting.expectOne(r => r.url === '/api/chats');
      expect(req.request.params.get('limit')).toBe('50');

      req.flush({ chats: [] });
    });

    it('unwraps the chats array from the response envelope', () => {
      let result: Chat[] = [];
      service.loadHistory().subscribe(chats => (result = chats));

      httpTesting
        .expectOne(r => r.url === '/api/chats')
        .flush({ chats: [mockChat] });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
      expect(result[0].titulo).toBe('Chat de prueba');
    });

    it('returns an empty array when there are no saved chats', () => {
      let result: Chat[] = [mockChat]; // valor no-vacío para verificar la asignación
      service.loadHistory().subscribe(chats => (result = chats));

      httpTesting
        .expectOne(r => r.url === '/api/chats')
        .flush({ chats: [] });

      expect(result).toEqual([]);
    });
  });

  // ── saveChat() ──────────────────────────────────────────────
  describe('saveChat()', () => {
    it('sends POST /api/chats with titulo, tipo_chat and chat_json', () => {
      service.saveChat('Mi chat', mockMessages).subscribe();

      const req = httpTesting.expectOne('/api/chats');

      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        titulo:    'Mi chat',
        tipo_chat: 'texto',
        chat_json: mockMessages,
      });

      req.flush({ saved: mockChat });
    });

    it('unwraps the saved chat from the response envelope', () => {
      let saved: Chat | undefined;
      service.saveChat('Mi chat', mockMessages).subscribe(c => (saved = c));

      httpTesting.expectOne('/api/chats').flush({ saved: mockChat });

      expect(saved?.id).toBe(1);
      expect(saved?.titulo).toBe('Chat de prueba');
    });
  });

  // ── deleteChat() ────────────────────────────────────────────
  describe('deleteChat()', () => {
    it('sends DELETE /api/chats/:id with the correct id', () => {
      service.deleteChat(5).subscribe();

      const req = httpTesting.expectOne('/api/chats/5');
      expect(req.request.method).toBe('DELETE');

      req.flush(null);
    });
  });
});
