import { AGENTE, RIVAL } from '../config/agente.js';
import { TURNOS_MAX } from '../config/debate.js';
import { generarTurno } from './gemini.service.js';
import { enviarAlRival } from './webhook.service.js';
import { guardarHistorialFinal } from './historial.service.js';
import { estado } from './estado.service.js';

const LINEA = '='.repeat(60);

export const contarTurnos = (historial, autor) =>
    historial.filter((turno) => turno.autor === autor).length;

// El debate esta completo cuando LOS DOS lados ya hablaron TURNOS_MAX veces.
export const debateCompleto = (historial) =>
    contarTurnos(historial, AGENTE.autor) >= TURNOS_MAX
    && contarTurnos(historial, RIVAL.autor) >= TURNOS_MAX;

export const crearHistorialInicial = (tema) => {
    // Siempre en el mismo orden (IA-A primero) para que el texto sea igual en los dos backends.
    const [uno, otro] = [AGENTE, RIVAL].sort((x, y) => x.autor.localeCompare(y.autor));
    return [
        {
            autor: 'moderador',
            texto: `Tema del debate: "${tema}". `
                + `${uno.autor} (${uno.nombre}) defiende la postura ${uno.postura}. `
                + `${otro.autor} (${otro.nombre}) defiende la postura ${otro.postura}. `
                + `Cada IA defiende SIEMPRE su propia postura, desde el primer turno hasta el ultimo. `
                + `Quien plantea el tema no habla primero: abre el debate la otra IA y despues se alternan.`
        }
    ];
};

const construirContenidos = (historial, aclaracion) => {
    const contenidos = [];

    for (const { autor, texto } of historial) {
        const role = autor === AGENTE.autor ? 'model' : 'user';
        const contenido = role === 'user' ? `[${autor}]: ${texto}` : texto;

        const ultimo = contenidos.at(-1);
        if (ultimo && ultimo.role === role) {
            ultimo.parts[0].text += `\n\n${contenido}`;      // mismo rol seguido: se junta
        } else {
            contenidos.push({ role, parts: [{ text: contenido }] });
        }
    }

    // Recordatorio de rol en CADA turno: evita que el modelo se confunda de bando.
    const soloTema = historial.length === 1 && historial[0].autor === 'moderador';
    contenidos.at(-1).parts[0].text +=
        `\n\n[recordatorio del sistema]: tu eres ${AGENTE.nombre} (${AGENTE.autor}) y defiendes UNICAMENTE la postura ${AGENTE.postura}. `
        + `Tu rival es ${RIVAL.nombre} (${RIVAL.autor}) y defiende ${RIVAL.postura}. `
        + (soloTema
            ? `El moderador solo planteo el tema y todavia nadie hablo: abre el debate TU con tu mejor argumento ${AGENTE.postura}. `
            : `Contraargumenta lo ultimo que dijo ${RIVAL.nombre}. `)
        + `Habla siempre en primera persona como ${AGENTE.nombre}; nunca adoptes ni concedas la postura ${RIVAL.postura}.`;

    // Indicacion puntual del humano para este turno (no se guarda en el historial).
    if (aclaracion) {
        contenidos.at(-1).parts[0].text +=
            `\n\n[moderador - indicacion para tu proximo turno]: ${aclaracion}`;
    }

    return contenidos;
};

// Gemini a veces firma el turno ("[IA-B] (NOVA) dice: ..."). Se quita esa firma
// para que el chat no muestre a un agente hablando con la etiqueta de otro.
const limpiarFirma = (texto) => {
    const limpio = texto.replace(/^\s*(\[[^\]]*\]\s*)+(\([^)]*\)\s*)?(dice\s*:\s*)?/i, '').trim();
    return limpio || texto;
};

// Genera el turno de este agente y devuelve el historial actualizado.
export const generarTurnoPropio = async (historial, aclaracion) => {
    const texto = limpiarFirma(await generarTurno(construirContenidos(historial, aclaracion)));

    const turno = { autor: AGENTE.autor, texto };
    const historialActualizado = [...historial, turno];

    const numero = contarTurnos(historialActualizado, AGENTE.autor);
    console.log(`\n[${AGENTE.nombre}] Turno ${numero}/${TURNOS_MAX}:`);
    console.log(texto);

    return { turno, historial: historialActualizado };
};

// Cierra el debate de este lado: mensaje en consola + archivo JSON.
const finalizarDebate = async (historial, motivo) => {
    // El debate termino: se libera el estado para que cualquiera pueda iniciar otro.
    estado.enCurso = false;
    estado.inicie = false;
    estado.pendiente = null;
    estado.historial = historial;
    estado.terminado = true;

    console.log(`\n${LINEA}`);
    console.log(`[${AGENTE.nombre}] DEBATE FINALIZADO (${motivo})`);
    console.log(`[${AGENTE.nombre}] Turnos: ${AGENTE.autor}=${contarTurnos(historial, AGENTE.autor)}, `
        + `${RIVAL.autor}=${contarTurnos(historial, RIVAL.autor)} (maximo ${TURNOS_MAX} por lado)`);
    console.log(LINEA);

    await guardarHistorialFinal(historial, motivo);
};

// Manda el turno al rival. Si con este turno el debate queda completo, se lo
// avisa al rival (terminado: true) y cierra tambien este lado.
export const entregarAlRival = async (historial) => {
    const completo = debateCompleto(historial);
    let entregado = true;

    try {
        await enviarAlRival({ historial, terminado: completo });
    } catch (error) {
        entregado = false;
        console.error(`[${AGENTE.nombre}] no se pudo entregar el turno a ${RIVAL.nombre}. Esta encendido?`);
    }

    if (completo) {
        await finalizarDebate(historial, 'debate completo');
    } else if (!entregado) {
        await finalizarDebate(historial, `${RIVAL.nombre} inalcanzable`);
    }
};

// Genera el turno propio y lo entrega al rival.
export const responderTurno = async (historial, aclaracion) => {
    let resultado;
    estado.generando = true;
    try {
        resultado = await generarTurnoPropio(historial, aclaracion);
    } catch (error) {
        console.error(`[${AGENTE.nombre}] no se pudo generar el turno: ${error.message}`);
        // Se le avisa al rival (si se puede) para que no se quede esperando.
        await enviarAlRival({ historial, terminado: true }).catch(() => {});
        await finalizarDebate(historial, 'error al generar el turno');
        return;
    } finally {
        estado.generando = false;
    }

    // Se guarda ya el turno propio para que el chat lo muestre de inmediato,
    // sin esperar a que termine de entregarse al rival.
    estado.historial = resultado.historial;

    await entregarAlRival(resultado.historial);
};

// Procesa un webhook entrante del rival.
export const procesarWebhook = async ({ historial, terminado }) => {
    // Llego el primer turno de un debate NUEVO (el rival abrio): se olvida el
    // estado del debate anterior. Sin esto, "terminado" quedaba en true y el
    // chat se bloqueaba mostrando "debate finalizado" aunque hubiera turno pendiente.
    const esDebateNuevo = historial[0]?.autor === 'moderador' && historial.length <= 2;
    if (esDebateNuevo && terminado !== true) {
        estado.terminado = false;
        estado.generando = false;
        estado.pendiente = null;
    }

    // Se guarda de una vez para que el chat muestre el turno del rival, sin
    // importar en que modo estemos ni si ya vamos a cerrar el debate.
    estado.historial = historial;

    if (!terminado) estado.enCurso = true;

    // El rival cerro el debate (o ya cumplimos nuestra cuota): solo cerramos.
    if (terminado || contarTurnos(historial, AGENTE.autor) >= TURNOS_MAX) {
        estado.pendiente = null;
        await finalizarDebate(historial, terminado ? `cierre avisado por ${RIVAL.nombre}` : 'cuota de turnos cumplida');
        return;
    }

    // MODO MANUAL: se guarda el turno del rival y se espera la orden.
    if (estado.modo === 'manual') {
        estado.pendiente = historial;
        console.log(`\n[${AGENTE.nombre}] turno de ${RIVAL.nombre} recibido. Modo MANUAL: esperando orden (POST /responder).`);
        return;
    }

    // MODO AUTO
    await responderTurno(historial);
};

// Responde al turno que quedo pendiente (modo manual).
export const responderPendiente = async (aclaracion) => {
    const historial = estado.pendiente;
    if (!historial) return false;

    estado.pendiente = null;
    await responderTurno(historial, aclaracion);
    return true;
};
