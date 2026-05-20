import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Chat } from '../models/chat.model';
import { Message } from '../models/message.model';
import { environment } from '../../../environments/environment';

export interface ChatApiResponse {
  ok: boolean;
  reply: string;
}

interface ChatListResponse {
  ok: boolean;
  chats: Chat[];
}

interface ChatDetailResponse {
  ok: boolean;
  chat: Chat;
}

interface SaveChatPayload {
  tipo_chat: string;
  titulo?: string;
  chat_json: Message[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  send(message: string, tipo_chat = 'texto'): Observable<ChatApiResponse> {
    return this.http.post<ChatApiResponse>(`${this.base}/api/chat`, {
      message,
      tipo_chat,
      save: false,
    });
  }

  list(limit = 50): Observable<ChatListResponse> {
    return this.http.get<ChatListResponse>(`${this.base}/api/chats`, {
      params: { limit: String(limit) },
    });
  }

  get(id: number): Observable<ChatDetailResponse> {
    return this.http.get<ChatDetailResponse>(`${this.base}/api/chats/${id}`);
  }

  save(payload: SaveChatPayload): Observable<{ ok: boolean; saved: Chat }> {
    return this.http.post<{ ok: boolean; saved: Chat }>(
      `${this.base}/api/chats`,
      payload
    );
  }

  setFavorite(id: number, favorito: boolean): Observable<{ ok: boolean; chat: Chat }> {
    return this.http.patch<{ ok: boolean; chat: Chat }>(
      `${this.base}/api/chats/${id}/favorite`,
      { favorito }
    );
  }

  delete(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/api/chats/${id}`);
  }
}
