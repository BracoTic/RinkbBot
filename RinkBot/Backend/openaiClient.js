// Backend/openaiClient.js
// Lazy singleton — se instancia una sola vez, la primera vez que se usa.
// Lee process.env en el momento de la llamada, no al cargar el módulo,
// por lo que dotenv ya habrá corrido sin importar el orden de imports ESM.
import OpenAI from "openai";

let _client = null;

export function getOpenAIClient() {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}
