import { SYSTEM_PROMPT } from '../config/prompt.js';
import { MAX_TOKENS_RESPUESTA, MAX_INTENTOS_GEMINI, TIMEOUT_GEMINI_MS } from '../config/debate.js';

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Un solo intento contra Gemini. Si falla, lanza un error marcado como
// "reintentable" cuando vale la pena volver a probar (saturacion, red, etc.).
const llamarGemini = async (contents) => {
    let response;

    try {
        response = await fetch(process.env.GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.GEMINI_API_KEY
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents,   // ya viene como [{ role, parts }] desde construirContenidos
                generationConfig: { maxOutputTokens: MAX_TOKENS_RESPUESTA }
            }),
            signal: AbortSignal.timeout(TIMEOUT_GEMINI_MS)
        });
    } catch (error) {
        // Falla de red o timeout
        const err = new Error(`no se pudo conectar con Gemini: ${error.message}`);
        err.reintentable = true;
        throw err;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const mensaje = data?.error?.message || `Gemini respondio con status ${response.status}`;
        const err = new Error(mensaje);
        err.reintentable = [429, 500, 503].includes(response.status)
            || /high demand|overloaded/i.test(mensaje);
        throw err;
    }

    // Se juntan las partes de texto (ignorando las de "pensamiento", si vinieran).
    const partes = data?.candidates?.[0]?.content?.parts || [];
    const texto = partes
        .filter((parte) => !parte.thought)
        .map((parte) => parte.text || '')
        .join('')
        .trim();

    if (!texto) {
        const err = new Error('Gemini no devolvio un turno valido');
        err.reintentable = true;
        throw err;
    }

    return texto;
};

export const generarTurno = async (contents, intentos = MAX_INTENTOS_GEMINI) => {
    for (let intento = 1; intento <= intentos; intento++) {
        try {
            return await llamarGemini(contents);
        } catch (error) {
            const ultimoIntento = intento === intentos;

            if (!error.reintentable || ultimoIntento) {
                throw error;
            }

            const espera = 1000 * 2 ** (intento - 1);   // 1s, 2s, 4s...
            console.log(`reintentando Gemini en ${espera / 1000}s (intento ${intento + 1} de ${intentos}): ${error.message}`);
            await esperar(espera);
        }
    }
};
