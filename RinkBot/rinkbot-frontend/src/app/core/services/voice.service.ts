import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

const VOICE_KEY = 'rinkbot_tts_voice_name';

// Códigos de error STT con mensajes en español
const STT_ERROR_MESSAGES: Record<string, string> = {
  'not-allowed':   'Permiso de micrófono denegado. Permite el acceso en la barra del navegador.',
  'no-speech':     'No se detectó voz. Intenta de nuevo.',
  'network':       'Error de red en el reconocimiento de voz.',
  'audio-capture': 'No se encontró micrófono. Verifica que esté conectado.',
};

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly zone = inject(NgZone);

  // ── Soporte del navegador ────────────────────────────────
  private readonly SR: new () => SpeechRecognition =
    (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

  private readonly sttAvailable = !!this.SR && window.isSecureContext;
  private readonly ttsAvailable = 'speechSynthesis' in window;

  // ── Signals públicos ─────────────────────────────────────
  readonly isListening = signal(false);
  readonly isSpeaking  = signal(false);

  // Referencia al reconocedor activo (para stopListening)
  private currentRecognizer: SpeechRecognition | null = null;

  // ── API pública ──────────────────────────────────────────

  /**
   * Devuelve true si STT y TTS están disponibles.
   * STT requiere Chrome/Edge en contexto seguro (HTTPS o localhost).
   */
  isSupported(): boolean {
    return this.sttAvailable && this.ttsAvailable;
  }

  /**
   * Activa el micrófono y emite el transcript final cuando el usuario
   * deja de hablar. Completa automáticamente tras cada utterance.
   * Lanza error con mensaje descriptivo si el navegador no soporta la API
   * o el usuario deniega el permiso.
   */
  startListening(): Observable<string> {
    return new Observable<string>((observer) => {
      if (!this.sttAvailable) {
        observer.error(
          !this.SR
            ? 'El navegador no soporta reconocimiento de voz. Usa Chrome o Edge.'
            : 'El micrófono requiere HTTPS o localhost (contexto seguro).'
        );
        return;
      }

      const recognizer: SpeechRecognition = new this.SR();
      recognizer.lang            = 'es-ES';
      recognizer.interimResults  = false; // solo resultados finales
      recognizer.continuous      = false;
      recognizer.maxAlternatives = 1;

      this.currentRecognizer = recognizer;

      recognizer.onstart = () =>
        this.zone.run(() => this.isListening.set(true));

      recognizer.onresult = (e: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) transcript += e.results[i][0].transcript;
        }
        transcript = transcript.trim();
        if (transcript) this.zone.run(() => observer.next(transcript));
      };

      recognizer.onerror = (e: SpeechRecognitionErrorEvent) =>
        this.zone.run(() => {
          this.isListening.set(false);
          if (e.error === 'aborted') return; // cancelación silenciosa
          observer.error(
            STT_ERROR_MESSAGES[e.error] ?? `Error de reconocimiento: ${e.error}`
          );
        });

      recognizer.onend = () =>
        this.zone.run(() => {
          this.isListening.set(false);
          observer.complete();
        });

      try {
        recognizer.start();
      } catch {
        this.isListening.set(false);
        observer.error('No se pudo iniciar el reconocimiento de voz.');
      }

      // Teardown: abortar si el consumidor cancela la suscripción
      return () => {
        try { recognizer.abort(); } catch { /* ignorar */ }
        this.zone.run(() => this.isListening.set(false));
      };
    });
  }

  /** Detiene el reconocimiento activo. */
  stopListening(): void {
    try { this.currentRecognizer?.stop(); } catch { /* ignorar */ }
    this.currentRecognizer = null;
    this.isListening.set(false);
  }

  /**
   * Reproduce texto con SpeechSynthesis en español.
   * Usa la voz guardada en localStorage; si no hay preferencia,
   * intenta elegir automáticamente la mejor voz latina en español.
   */
  speak(text: string): void {
    if (!this.ttsAvailable || !text.trim()) return;

    window.speechSynthesis.cancel(); // detener cualquier reproducción anterior

    const utter     = new SpeechSynthesisUtterance(text);
    utter.lang      = 'es-ES';
    utter.rate      = 1;
    utter.pitch     = 1;
    utter.volume    = 1;

    this.applyVoice(utter);

    utter.onstart = () => this.zone.run(() => this.isSpeaking.set(true));
    utter.onend   = () => this.zone.run(() => this.isSpeaking.set(false));
    utter.onerror = () => this.zone.run(() => this.isSpeaking.set(false));

    window.speechSynthesis.speak(utter);
  }

  /** Detiene cualquier reproducción TTS en curso. */
  stopSpeaking(): void {
    if (!this.ttsAvailable) return;
    window.speechSynthesis.cancel();
    this.isSpeaking.set(false);
  }

  // ── Preferencia de voz ───────────────────────────────────

  /** Voces en español disponibles en el navegador. */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.ttsAvailable) return [];
    return window.speechSynthesis
      .getVoices()
      .filter((v) => v.lang.toLowerCase().startsWith('es'))
      .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
  }

  getSavedVoiceName(): string {
    return localStorage.getItem(VOICE_KEY) ?? '';
  }

  saveVoiceName(name: string): void {
    localStorage.setItem(VOICE_KEY, name);
  }

  // ── Privado ──────────────────────────────────────────────

  private applyVoice(utter: SpeechSynthesisUtterance): void {
    const voices  = window.speechSynthesis.getVoices();
    const saved   = this.getSavedVoiceName();
    const matched = voices.find((v) => v.name === saved) ?? this.pickDefaultVoice(voices);

    if (matched) {
      utter.voice = matched;
      utter.lang  = matched.lang;
    }
  }

  /**
   * Selecciona la mejor voz disponible: prefiere voces de español
   * latinoamericano y, dentro de éstas, voces masculinas.
   * Replica la lógica de pickDefaultLatinoVoice() del proyecto vanilla.
   */
  private pickDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const spanish = voices.filter((v) => v.lang.toLowerCase().startsWith('es'));
    if (!spanish.length) return null;

    const latinoRE = /mexico|méxico|mx|latino|colombia|argentina|chile|peru|perú|venezuela|ecuador|us|united states/i;
    const maleRE   = /male|hombre|raul|raúl|carlos|jorge|miguel|pablo|enrique|luis|diego|andrés|andres|juan|josé|jose|antonio/i;

    const latino = spanish.filter((v) => latinoRE.test(v.name));
    const pool   = latino.length ? latino : spanish;
    const male   = pool.filter((v) => maleRE.test(v.name));

    return male[0] ?? pool[0] ?? null;
  }
}
