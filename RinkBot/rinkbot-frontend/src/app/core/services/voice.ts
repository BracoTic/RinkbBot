import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type RecordingState = 'idle' | 'listening' | 'processing';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly zone = inject(NgZone);

  private readonly VOICE_KEY = 'rinkbot_tts_voice_name';

  readonly isSecureContext = window.isSecureContext;
  readonly sttSupported: boolean;
  readonly ttsSupported = 'speechSynthesis' in window;

  private recognizer: SpeechRecognition | null = null;
  private _state$ = new BehaviorSubject<RecordingState>('idle');
  private _hint$ = new BehaviorSubject<string>('');

  readonly state$ = this._state$.asObservable();
  readonly hint$ = this._hint$.asObservable();

  constructor() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    this.sttSupported = !!SR && this.isSecureContext;

    if (this.sttSupported) {
      this.recognizer = new SR();
      this.recognizer!.lang = 'es-ES';
      this.recognizer!.interimResults = true;
      this.recognizer!.continuous = false;
    }
  }

  get state(): RecordingState {
    return this._state$.value;
  }

  startListening(onFinal: (transcript: string) => void): void {
    if (!this.sttSupported || !this.recognizer) return;

    this.recognizer.onstart = () =>
      this.zone.run(() => {
        this._state$.next('listening');
        this._hint$.next('🎙️ Escuchando... habla ahora.');
      });

    this.recognizer.onerror = (e: SpeechRecognitionErrorEvent) =>
      this.zone.run(() => {
        this._state$.next('idle');
        const msgs: Record<string, string> = {
          'not-allowed': '⚠️ Permiso de micrófono denegado.',
          'no-speech': '🔇 No se detectó voz. Intenta de nuevo.',
          'network': '⚠️ Error de red en el reconocimiento de voz.',
          'audio-capture': '⚠️ No se encontró micrófono.',
        };
        if (e.error !== 'aborted') {
          this._hint$.next(msgs[e.error] ?? `⚠️ Error: ${e.error}`);
        }
      });

    this.recognizer.onend = () =>
      this.zone.run(() => {
        if (this._state$.value === 'listening') {
          this._state$.next('idle');
          this._hint$.next('Rinkbot te escucha con tu micrófono.');
        }
      });

    this.recognizer.onresult = (e: SpeechRecognitionEvent) => {
      const last = e.results[e.results.length - 1];
      if (!last.isFinal) return;
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      text = text.trim();
      if (text) {
        this.zone.run(() => {
          this._state$.next('processing');
          this._hint$.next('⌛ Consultando a Rinkbot...');
          onFinal(text);
        });
      }
    };

    try {
      this.recognizer.abort();
      this.recognizer.start();
    } catch {
      this._state$.next('idle');
    }
  }

  stopListening(): void {
    this.recognizer?.stop();
  }

  setReady(): void {
    this._state$.next('idle');
    this._hint$.next('✅ Rinkbot respondió. Toca la nota para escucharla.');
  }

  speak(text: string, onEnd?: () => void): SpeechSynthesisUtterance | null {
    if (!this.ttsSupported) return null;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.rate = 1;
    utter.pitch = 1;
    this.applySelectedVoice(utter);
    if (onEnd) utter.onend = onEnd;
    window.speechSynthesis.speak(utter);
    return utter;
  }

  stopSpeaking(): void {
    if (this.ttsSupported) window.speechSynthesis.cancel();
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!this.ttsSupported) return [];
    return window.speechSynthesis.getVoices().filter((v) =>
      v.lang.toLowerCase().startsWith('es')
    );
  }

  getSavedVoiceName(): string {
    return localStorage.getItem(this.VOICE_KEY) ?? '';
  }

  saveVoiceName(name: string): void {
    localStorage.setItem(this.VOICE_KEY, name);
  }

  private applySelectedVoice(utter: SpeechSynthesisUtterance): void {
    const desired = this.getSavedVoiceName();
    if (!desired) return;
    const voice = window.speechSynthesis.getVoices().find((v) => v.name === desired);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    }
  }
}
