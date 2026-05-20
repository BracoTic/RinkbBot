import { Message } from './message.model';

/** Registro de historial de GET /api/chats y GET /api/chats/:id */
export interface Chat {
  id:         number;
  titulo:     string;
  tipo_chat:  string;
  chat_json:  Message[];
  created_at: Date;
  favorito?:  boolean;
}
