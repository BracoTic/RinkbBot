import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpRequest, HttpEventType, HttpResponse } from '@angular/common/http';
import { Observable, map, tap, finalize, filter } from 'rxjs';
import { Chat } from '../models/chat.model';
import { Message } from '../models/message.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  // ── Estado reactivo ──────────────────────────────────────
  private readonly _messages = signal<Message[]>([]);
  private readonly _isLoading = signal(false);

  /** Mensajes de la sesión activa (lectura externa). */
  readonly messages = this._messages.asReadonly();

  /** True mientras hay una petición HTTP en curso. */
  readonly isLoading = this._isLoading.asReadonly();

  // ── Chat activo ──────────────────────────────────────────

  /**
   * Envía un mensaje al backend, actualiza el signal de mensajes
   * y devuelve el texto de la respuesta.
   *
   * POST /api/chat  { message }  →  { response: string }
   */
  sendMessage(text: string, file?: File, imagenPreview?: string): Observable<number | string> {
    this._messages.update((msgs) => [
      ...msgs,
      { role: 'user', content: text, timestamp: new Date(), imagenPreview },
    ]);
    this._isLoading.set(true);

    if (file) {
      const form = new FormData();
      form.append('message', text);
      form.append('imagen', file);
      const req = new HttpRequest('POST', `${this.base}/chat`, form, {
        reportProgress: true,
      });

      return this.http.request<{ response: string }>(req).pipe(
        filter(event =>
          event.type === HttpEventType.UploadProgress ||
          event.type === HttpEventType.Response
        ),
        map(event => {
          if (event.type === HttpEventType.UploadProgress) {
            return Math.round(100 * (event.loaded / (event.total ?? event.loaded)));
          }
          return (event as HttpResponse<{ response: string }>).body!.response;
        }),
        tap(val => {
          if (typeof val === 'string') {
            this._messages.update(msgs => [
              ...msgs,
              { role: 'assistant', content: val, timestamp: new Date() },
            ]);
          }
        }),
        finalize(() => this._isLoading.set(false))
      );
    }

    // JSON path (no file) — unchanged behavior
    return this.http.post<{ response: string }>(`${this.base}/chat`, { message: text }).pipe(
      map(res => res.response),
      tap(response =>
        this._messages.update(msgs => [
          ...msgs,
          { role: 'assistant', content: response, timestamp: new Date() },
        ])
      ),
      finalize(() => this._isLoading.set(false))
    );
  }

  /** Vacía la conversación activa. */
  clearMessages(): void {
    this._messages.set([]);
  }

  // ── Historial (BD) ───────────────────────────────────────

  /**
   * GET /api/chats?limit=50
   * Devuelve el array de chats guardados del usuario.
   */
  loadHistory(): Observable<Chat[]> {
    return this.http
      .get<{ chats: Chat[] }>(`${this.base}/chats`, {
        params: { limit: '50' },
      })
      .pipe(map((res) => res.chats));
  }

  /**
   * POST /api/chats  { titulo, tipo_chat, chat_json }
   * Guarda la conversación activa en la base de datos.
   */
  saveChat(titulo: string, messages: Message[]): Observable<Chat> {
    return this.http
      .post<{ saved: Chat }>(`${this.base}/chats`, {
        titulo,
        tipo_chat: 'texto',
        chat_json: messages,
      })
      .pipe(map((res) => res.saved));
  }

  /** DELETE /api/chats/:id */
  deleteChat(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/chats/${id}`);
  }

  /** PATCH /api/chats/:id/favorite  { favorito } */
  setFavorite(id: number, favorito: boolean): Observable<Chat> {
    return this.http
      .patch<{ ok: boolean; chat: Chat }>(`${this.base}/chats/${id}/favorite`, { favorito })
      .pipe(map(res => res.chat));
  }

  /** Carga solo los chats marcados como favoritos. */
  loadFavorites(): Observable<Chat[]> {
    return this.http
      .get<{ chats: Chat[] }>(`${this.base}/chats`, { params: { limit: '100' } })
      .pipe(map(res => res.chats.filter(c => c.favorito)));
  }
}
