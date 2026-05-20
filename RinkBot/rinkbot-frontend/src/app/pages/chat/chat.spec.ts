import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal }                    from '@angular/core';
import { provideRouter }             from '@angular/router';
import { EMPTY, of }                 from 'rxjs';

import { Chat }         from './chat';
import { AuthService }  from '../../core/services/auth.service';
import { ChatService }  from '../../core/services/chat.service';
import { VoiceService } from '../../core/services/voice.service';
import { Message }      from '../../core/models/message.model';
import { Chat as ChatRecord } from '../../core/models/chat.model';

// ─────────────────────────────────────────────────────────────
// Factories: señales nuevas por cada test → sin estado compartido
// ─────────────────────────────────────────────────────────────
const createChatSvcMock = () => ({
  messages:      signal<Message[]>([]),
  isLoading:     signal(false),
  sendMessage:   vi.fn().mockReturnValue(of('')),
  loadHistory:   vi.fn().mockReturnValue(of([] as ChatRecord[])),
  saveChat:      vi.fn().mockReturnValue(of({} as ChatRecord)),
  deleteChat:    vi.fn().mockReturnValue(of(undefined as void)),
  clearMessages: vi.fn(),
});

const createVoiceMock = () => ({
  isListening:    signal(false),
  isSpeaking:     signal(false),
  isSupported:    vi.fn(() => false),
  startListening: vi.fn(() => EMPTY),
  stopListening:  vi.fn(),
  speak:          vi.fn(),
  stopSpeaking:   vi.fn(),
});

const mockAuth = {
  getUser:    vi.fn(() => null),
  logout:     vi.fn(),
  isLoggedIn: vi.fn(() => false),
  getToken:   vi.fn(() => null),
};

// ─────────────────────────────────────────────────────────────
describe('Chat', () => {
  let fixture:      ComponentFixture<Chat>;
  let component:    Chat;
  let chatSvcMock:  ReturnType<typeof createChatSvcMock>;
  let voiceMock:    ReturnType<typeof createVoiceMock>;

  beforeEach(async () => {
    chatSvcMock = createChatSvcMock();
    voiceMock   = createVoiceMock();

    await TestBed.configureTestingModule({
      imports:   [Chat],
      providers: [
        provideRouter([]),
        { provide: AuthService,  useValue: mockAuth },
        { provide: ChatService,  useValue: chatSvcMock },
        { provide: VoiceService, useValue: voiceMock },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(Chat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ── Creación ──────────────────────────────────────────────
  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  // ── Inyección de servicios ────────────────────────────────
  it('exposes the injected ChatService as chatSvc', () => {
    expect(component.chatSvc).toBeTruthy();
    // Es exactamente el mismo objeto que proveímos
    expect(component.chatSvc).toBe(chatSvcMock);
  });

  it('chatSvc.messages() starts as an empty array', () => {
    expect(component.chatSvc.messages()).toEqual([]);
  });

  it('chatSvc.isLoading() starts as false', () => {
    expect(component.chatSvc.isLoading()).toBe(false);
  });

  it('logout() delegates to AuthService.logout()', () => {
    component.logout();
    expect(mockAuth.logout).toHaveBeenCalledTimes(1);
  });

  it('getUser() result is exposed on component.user', () => {
    // auth.getUser() devuelve null en nuestro mock
    expect(component.user).toBeNull();
  });

  // ── Estado inicial de señales ─────────────────────────────
  it('starts on the "welcome" section', () => {
    expect(component.activeSection()).toBe('welcome');
  });

  it('openPanel() starts as null', () => {
    expect(component.openPanel()).toBeNull();
  });

  it('isDark() starts as false', () => {
    expect(component.isDark()).toBe(false);
  });

  // ── Navegación de secciones ───────────────────────────────
  it('showSection("chat") changes activeSection', () => {
    component.showSection('chat');
    expect(component.activeSection()).toBe('chat');
  });

  it('newChat() clears messages and returns to welcome', () => {
    component.showSection('chat');
    component.newChat();

    expect(chatSvcMock.clearMessages).toHaveBeenCalled();
    expect(component.activeSection()).toBe('welcome');
  });

  // ── Template (welcome inicial) ────────────────────────────
  it('renders the hero logo in the welcome section', () => {
    const img = fixture.nativeElement.querySelector('img.hero-logo') as HTMLImageElement;
    expect(img).not.toBeNull();
  });

  it('renders the "¡Hablemos!" CTA button', () => {
    const btn = fixture.nativeElement.querySelector('button.cta-btn') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent?.trim()).toBe('¡Hablemos!');
  });

  // ── ngOnDestroy ───────────────────────────────────────────
  it('ngOnDestroy() calls voiceSvc.stopSpeaking()', () => {
    component.ngOnDestroy();
    expect(voiceMock.stopSpeaking).toHaveBeenCalledTimes(1);
  });
});
