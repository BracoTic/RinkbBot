import { Injectable } from '@angular/core';
import { Message } from '../models/message.model';

const MAX = 100;

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly TEXT_KEY = 'rinkbot_chat_log';
  private readonly VOICE_KEY = 'rinkbot_voice_log';

  load(type: 'texto' | 'voz'): Message[] {
    const key = type === 'texto' ? this.TEXT_KEY : this.VOICE_KEY;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  save(type: 'texto' | 'voz', log: Message[]): void {
    const key = type === 'texto' ? this.TEXT_KEY : this.VOICE_KEY;
    const trimmed = log.length > MAX ? log.slice(-MAX) : log;
    localStorage.setItem(key, JSON.stringify(trimmed));
  }

  push(type: 'texto' | 'voz', message: Message): Message[] {
    const log = this.load(type);
    log.push(message);
    this.save(type, log);
    return log;
  }

  clear(type: 'texto' | 'voz'): void {
    const key = type === 'texto' ? this.TEXT_KEY : this.VOICE_KEY;
    localStorage.removeItem(key);
  }
}
