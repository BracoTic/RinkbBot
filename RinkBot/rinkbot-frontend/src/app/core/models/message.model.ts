/** Unidad de conversación de POST /api/chat y almacenada en chat_json */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imagenPreview?: string;  // base64 data URL — solo para display local, no se persiste
}
