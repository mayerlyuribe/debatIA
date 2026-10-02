// Parametros del debate. Se leen del .env (dotenv se carga en index.js
// con "import 'dotenv/config'" antes de que este archivo se evalue).

export const PORT = process.env.PORT || 8000;
// 0.0.0.0 acepta conexiones de cualquier interfaz: es lo que pide Render y lo
// que permite debatir entre dos PCs. Para probar solo en esta PC, pon HOST=127.0.0.1.
export const HOST = process.env.HOST || '0.0.0.0';

// Turnos que hablara CADA participante antes de cerrar el debate.
export const TURNOS_MAX = Math.max(1, parseInt(process.env.TURNOS_MAX, 10) || 6);

// Modo de respuesta: "auto" responde solo al recibir el turno del rival;
// "manual" espera la orden en POST /responder.
export const MODO_INICIAL = process.env.MODO === 'manual' ? 'manual' : 'auto';

// Gemini
export const MAX_TOKENS_RESPUESTA = 220;    // margen ajustado para ~60 palabras
export const MAX_INTENTOS_GEMINI = 3;
export const TIMEOUT_GEMINI_MS = 60_000;

// Webhook al rival (el rival responde 200 de inmediato, asi que es corto)
export const MAX_INTENTOS_WEBHOOK = 3;
export const TIMEOUT_WEBHOOK_MS = 15_000;
