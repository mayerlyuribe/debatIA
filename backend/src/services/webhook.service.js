import { AGENTE, RIVAL } from '../config/agente.js';
import { MAX_INTENTOS_WEBHOOK, TIMEOUT_WEBHOOK_MS } from '../config/debate.js';
import { getRivalWebhookUrl } from './config.service.js';

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Envia el historial al webhook del rival. "terminado: true" le avisa que el
// debate ya cerro, para que guarde su historial y no genere otro turno.
export const enviarAlRival = async ({ historial, terminado = false }) => {
    let ultimoError;

    for (let intento = 1; intento <= MAX_INTENTOS_WEBHOOK; intento++) {
        try {
            if (intento > 1) {
                console.log(`[${AGENTE.nombre}] reintentando webhook a ${RIVAL.nombre} (intento ${intento} de ${MAX_INTENTOS_WEBHOOK})...`);
                await esperar(500 * (intento - 1));
            }

            const response = await fetch(getRivalWebhookUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ historial, terminado }),
                signal: AbortSignal.timeout(TIMEOUT_WEBHOOK_MS)
            });

            if (!response.ok) {
                throw new Error(`${RIVAL.nombre} respondio con status ${response.status}`);
            }

            console.log(`[${AGENTE.nombre}] webhook entregado a ${RIVAL.nombre}${terminado ? ' (cierre del debate)' : ''}.`);
            return;
        } catch (error) {
            ultimoError = error;
            const detalle = error.name === 'TimeoutError'
                ? 'timeout'
                : `${error.message}${error.cause?.code ? ` (${error.cause.code})` : ''}`;
            console.error(`[${AGENTE.nombre}] fallo el webhook a ${RIVAL.nombre} en el intento ${intento}: ${detalle}`);
        }
    }

    throw ultimoError;
};
