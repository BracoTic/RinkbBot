import {
  Component, inject, signal, ViewChild, ElementRef,
  effect, OnDestroy, ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService }              from '../../core/services/auth.service';
import { ChatService }              from '../../core/services/chat.service';
import { VoiceService }             from '../../core/services/voice.service';
import { UserPreferencesService }   from '../../core/services/user-preferences.service';
import { Chat as ChatRecord }       from '../../core/models/chat.model';
import { Message }                  from '../../core/models/message.model';
import { AppLang }                  from '../../core/services/user-preferences.service';

export type Section = 'welcome' | 'options' | 'chat' | 'voice';
export type PanelId =
  | 'mensajes' | 'tiempo' | 'favoritos' | 'ajustes'
  | 'soporte'  | 'notificaciones' | 'reunion' | 'hseq' | 'inicio'
  | null;

marked.use({ breaks: true, gfm: true });

@Component({
  selector: 'app-chat',
  imports: [FormsModule, DatePipe],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat implements OnDestroy {
  private readonly auth     = inject(AuthService);
  readonly chatSvc          = inject(ChatService);
  readonly voiceSvc         = inject(VoiceService);
  readonly prefsSvc         = inject(UserPreferencesService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly hostEl    = inject(ElementRef<HTMLElement>);

  @ViewChild('messagesEl')    messagesEl?: ElementRef<HTMLDivElement>;
  @ViewChild('avatarFileInput') avatarFileInputEl?: ElementRef<HTMLInputElement>;

  readonly user = this.auth.getUser();

  // ── Secciones ────────────────────────────────────────────
  readonly activeSection = signal<Section>('welcome');

  // ── Paneles ──────────────────────────────────────────────
  readonly openPanel = signal<PanelId>(null);

  // ── Modales ──────────────────────────────────────────────
  readonly showAccount   = signal(false);
  readonly showSaveModal = signal(false);

  // ── Historial / Mensajes ─────────────────────────────────
  readonly historyChats   = signal<ChatRecord[]>([]);
  readonly loadingHistory = signal(false);
  readonly selectedChat   = signal<ChatRecord | null>(null);

  // ── Actividad reciente (panel tiempo) ────────────────────
  readonly selectedRecentChat = signal<ChatRecord | null>(null);

  // ── Favoritos ────────────────────────────────────────────
  readonly favoriteChats   = signal<ChatRecord[]>([]);
  readonly loadingFavorites = signal(false);
  readonly selectedFavChat  = signal<ChatRecord | null>(null);

  // ── Inputs ───────────────────────────────────────────────
  inputText = '';
  saveTitle = '';

  // ── Imagen adjunta ───────────────────────────────────────
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  fileError = '';

  // ── Upload progress ───────────────────────────────────────
  readonly uploadProgress = signal<number | null>(null);

  // ── Error ────────────────────────────────────────────────
  readonly apiError = signal('');

  // ── Voz ──────────────────────────────────────────────────
  voiceError = '';
  private voiceSub: Subscription | null = null;
  private sendSub:  Subscription | null = null;

  // ── Avatar upload ────────────────────────────────────────
  readonly avatarPreview = signal<string | null>(null);

  constructor() {
    // Aplicar tema (dark/light) reactivamente desde prefs
    effect(() => {
      this.hostEl.nativeElement.setAttribute(
        'data-theme', this.prefsSvc.isDark() ? 'dark' : ''
      );
    });

    // Auto-scroll al llegar mensajes nuevos
    effect(() => {
      this.chatSvc.messages();
      setTimeout(() => {
        const el = this.messagesEl?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      }, 0);
    });
  }

  // ── Secciones ────────────────────────────────────────────

  showSection(s: Section): void { this.activeSection.set(s); }

  // ── Paneles ──────────────────────────────────────────────

  togglePanel(name: PanelId): void {
    const current = this.openPanel();
    if (current === name) {
      this.openPanel.set(null);
    } else {
      this.openPanel.set(name);
      if (name === 'mensajes')  { this.loadHistory(); }
      if (name === 'tiempo')    { this.loadHistory(); this.selectedRecentChat.set(null); }
      if (name === 'favoritos') { this.loadFavorites(); this.selectedFavChat.set(null); }
    }
  }

  closePanel(): void { this.openPanel.set(null); }

  // ── Chat de texto ────────────────────────────────────────

  send(): void {
    const text = this.inputText.trim();
    if (!text || this.chatSvc.isLoading()) return;
    const file    = this.selectedFile ?? undefined;
    const preview = this.imagePreview  ?? undefined;
    this.inputText    = '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.fileError    = '';
    this.apiError.set('');
    if (file) this.uploadProgress.set(0);
    if (this.activeSection() !== 'chat') this.showSection('chat');
    this.sendSub = this.chatSvc.sendMessage(text, file, preview).subscribe({
      next: (val) => {
        if (typeof val === 'number') this.uploadProgress.set(val);
      },
      error: (err: HttpErrorResponse) => {
        this.uploadProgress.set(null);
        if (err.status === 401) this.auth.logout();
        else this.apiError.set('No se pudo obtener respuesta. Intenta de nuevo.');
      },
      complete: () => this.uploadProgress.set(null),
    });
  }

  onFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.fileError = 'La imagen no debe superar 10 MB';
      return;
    }
    this.fileError = '';
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => (this.imagePreview = e.target!.result as string);
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.fileError    = '';
  }

  onEnter(e: Event): void {
    const ke = e as KeyboardEvent;
    if (!ke.shiftKey) { e.preventDefault(); this.send(); }
  }

  newChat(): void {
    this.chatSvc.clearMessages();
    this.showSection('welcome');
  }

  // ── Guardar chat ─────────────────────────────────────────

  openSaveModal(): void {
    const msgs = this.chatSvc.messages();
    if (!msgs.length) return;
    const first = msgs.find(m => m.role === 'user');
    this.saveTitle = first ? first.content.slice(0, 80) : '';
    this.showSaveModal.set(true);
  }

  confirmSave(): void {
    const msgs = this.chatSvc.messages();
    if (!msgs.length) return;
    this.chatSvc.saveChat(this.saveTitle.trim() || 'Chat sin título', msgs)
      .subscribe({ next: () => this.showSaveModal.set(false), error: () => {} });
  }

  // ── Historial (mensajes + tiempo) ────────────────────────

  loadHistory(): void {
    this.loadingHistory.set(true);
    this.chatSvc.loadHistory().subscribe({
      next:  chats => { this.historyChats.set(chats); this.loadingHistory.set(false); },
      error: ()    => this.loadingHistory.set(false),
    });
  }

  openChat(chat: ChatRecord): void         { this.selectedChat.set(chat); }
  backToList(): void                        { this.selectedChat.set(null); }
  openRecentChat(chat: ChatRecord): void    { this.selectedRecentChat.set(chat); }
  backFromRecent(): void                    { this.selectedRecentChat.set(null); }

  removeChat(id: number): void {
    this.chatSvc.deleteChat(id).subscribe({
      next: () => {
        this.historyChats.update(list => list.filter(c => c.id !== id));
        if (this.selectedChat()?.id === id) this.selectedChat.set(null);
        if (this.selectedRecentChat()?.id === id) this.selectedRecentChat.set(null);
        this.favoriteChats.update(list => list.filter(c => c.id !== id));
        if (this.selectedFavChat()?.id === id) this.selectedFavChat.set(null);
      },
      error: () => {},
    });
  }

  chatMessages(chat: ChatRecord): Message[] {
    if (!chat.chat_json) return [];
    return Array.isArray(chat.chat_json) ? chat.chat_json : [];
  }

  // ── Favoritos ────────────────────────────────────────────

  loadFavorites(): void {
    this.loadingFavorites.set(true);
    this.chatSvc.loadFavorites().subscribe({
      next:  chats => { this.favoriteChats.set(chats); this.loadingFavorites.set(false); },
      error: ()    => this.loadingFavorites.set(false),
    });
  }

  openFavChat(chat: ChatRecord): void { this.selectedFavChat.set(chat); }
  backFromFav(): void                  { this.selectedFavChat.set(null); }

  toggleFavorite(chat: ChatRecord): void {
    const newVal = !chat.favorito;
    this.chatSvc.setFavorite(chat.id, newVal).subscribe({
      next: updated => {
        // Actualizar historyChats
        this.historyChats.update(list =>
          list.map(c => c.id === updated.id ? { ...c, favorito: updated.favorito } : c)
        );
        // Si se desmarcó, quitarlo de favoriteChats
        if (!newVal) {
          this.favoriteChats.update(list => list.filter(c => c.id !== updated.id));
          if (this.selectedFavChat()?.id === updated.id) this.selectedFavChat.set(null);
        } else {
          this.favoriteChats.update(list =>
            list.some(c => c.id === updated.id) ? list : [updated, ...list]
          );
        }
      },
      error: () => {},
    });
  }

  // ── Avatar upload ────────────────────────────────────────

  triggerAvatarInput(): void {
    this.avatarFileInputEl?.nativeElement.click();
  }

  onAvatarFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.resizeAvatar(file, 160).then(dataUrl => this.avatarPreview.set(dataUrl));
  }

  saveAvatar(): void {
    const preview = this.avatarPreview();
    if (preview) {
      this.prefsSvc.update({ avatarUrl: preview });
      this.avatarPreview.set(null);
    }
  }

  cancelAvatarChange(): void {
    this.avatarPreview.set(null);
    if (this.avatarFileInputEl) this.avatarFileInputEl.nativeElement.value = '';
  }

  // Redimensiona y recorta la imagen a un cuadrado de `size`px.
  private resizeAvatar(file: File, size: number): Promise<string> {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas  = document.createElement('canvas');
          canvas.width  = size;
          canvas.height = size;
          const ctx     = canvas.getContext('2d')!;
          const side    = Math.min(img.width, img.height);
          const sx      = (img.width  - side) / 2;
          const sy      = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  // ── Configuración (ajustes) ──────────────────────────────

  toggleDark(): void {
    this.prefsSvc.update({ darkMode: !this.prefsSvc.isDark() });
  }

  setLang(lang: AppLang): void {
    this.prefsSvc.update({ lang });
  }

  toggleNotifications(): void {
    this.prefsSvc.update({ notificationsEnabled: !this.prefsSvc.prefs().notificationsEnabled });
  }

  toggleAutoSave(): void {
    this.prefsSvc.update({ autoSave: !this.prefsSvc.prefs().autoSave });
  }

  // ── Voz ──────────────────────────────────────────────────

  toggleVoice(): void {
    if (this.voiceSvc.isListening()) { this.voiceSvc.stopListening(); return; }
    this.voiceError = '';
    if (this.activeSection() !== 'voice') this.showSection('voice');

    this.voiceSub = this.voiceSvc.startListening().subscribe({
      next: transcript => {
        this.chatSvc.sendMessage(transcript).subscribe({
          next: reply => { if (typeof reply === 'string') this.voiceSvc.speak(reply); },
          error: () => {},
        });
      },
      error: (err: string) => { this.voiceError = err; },
    });
  }

  // ── Markdown ─────────────────────────────────────────────

  md(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(marked.parse(text) as string);
  }

  // ── Auth ─────────────────────────────────────────────────

  logout(): void { this.auth.logout(); }

  // ── Lifecycle ────────────────────────────────────────────

  ngOnDestroy(): void {
    this.voiceSub?.unsubscribe();
    this.sendSub?.unsubscribe();
    this.voiceSvc.stopSpeaking();
  }
}
