import { MODO_INICIAL } from '../config/debate.js';

// Estado en memoria: modo actual y turno del rival esperando respuesta.
export const estado = {
    modo: MODO_INICIAL,
    pendiente: null,     // historial que espera que le ordenes responder
    enCurso: false,      // hay un debate activo
    inicie: false,       // este agente fue quien abrio el debate
    historial: [],       // ultimo historial conocido (para pintar el chat completo)
    terminado: false,    // si el debate ya cerro de este lado
    generando: false     // true mientras se le esta pidiendo el turno a Gemini (para el "escribiendo...")
};
