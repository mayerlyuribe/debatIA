import { AGENTE, RIVAL } from '../config/agente.js';
import { TURNOS_MAX } from '../config/debate.js';
import { getRivalWebhookUrl, guardarRivalWebhookUrl } from '../services/config.service.js';
import { enviarAlRival } from '../services/webhook.service.js';
import {
    crearHistorialInicial,
    contarTurnos,
    responderTurno,
    procesarWebhook,
    responderPendiente
} from '../services/debate.service.js';
import { estado } from '../services/estado.service.js';

// POST /iniciar -> quien inicia SOLO plantea el tema (como moderador) y se lo manda
// al rival. El rival es quien responde primero; despues se alternan los turnos.
export const iniciarDebate = async (req, res) => {
    const { tema, forzar } = req.body;

    // Cualquiera de los dos puede iniciar, pero no si ya hay un debate en curso.
    if (estado.enCurso && forzar !== true) {
        return res.status(409).json({
            msg: 'ya hay un debate en curso. Usa "forzar": true o POST /reiniciar si quedo trabado'
        });
    }

    if (!getRivalWebhookUrl()) {
        return res.status(400).json({
            msg: `falta la URL de ${RIVAL.nombre}: configurala en el panel (ajustes -> Rival) antes de iniciar`
        });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${AGENTE.nombre}] planteando el tema: "${tema}" (responde primero ${RIVAL.nombre})`);
    console.log('='.repeat(60));

    const historial = crearHistorialInicial(tema);

    estado.enCurso = true;
    estado.inicie = true;
    estado.pendiente = null;
    estado.terminado = false;
    estado.generando = false;
    estado.historial = historial;

    try {
        await enviarAlRival({ historial, terminado: false });
    } catch (error) {
        estado.enCurso = false;
        estado.inicie = false;
        estado.historial = [];
        console.error(`[${AGENTE.nombre}] no se pudo entregar el tema a ${RIVAL.nombre}: ${error.message}`);
        return res.status(502).json({
            msg: `no se pudo entregar el tema a ${RIVAL.nombre} (${error.message}). Revisa que este encendido y la URL del rival`
        });
    }

    res.status(200).json({ msg: `tema enviado: ${RIVAL.nombre} responde primero`, tema });
};

// POST /webhook  -> recibe el historial del rival.
export const recibirWebhook = (req, res) => {
    const { historial, terminado } = req.body;
    const ultimo = historial[historial.length - 1];

    // El primer mensaje del debate es solo la pregunta del moderador (sin
    // turnos todavia); despues de eso, el ultimo turno siempre tiene que ser
    // del rival, o este agente terminaria hablando dos veces seguidas.
    const esPreguntaInicial = historial.length === 1 && ultimo.autor === 'moderador';
    if (!esPreguntaInicial && ultimo.autor !== RIVAL.autor) {
        return res.status(400).json({
            msg: `el ultimo turno del historial debe ser de ${RIVAL.autor}`
        });
    }

    // Choque real: yo ya plantee MI tema y el rival tambien planteo el suyo (llega otro
    // mensaje de solo-tema). La respuesta normal a mi tema trae un turno del rival, asi
    // que nunca cuenta como choque.
    const choque = estado.inicie && terminado !== true && esPreguntaInicial;
    if (choque) {
        console.log(`[${AGENTE.nombre}] ${RIVAL.nombre} tambien inicio un debate a la vez. Se rechaza el suyo.`);
        return res.status(409).json({
            msg: `${AGENTE.nombre} ya inicio un debate. Inicie solo uno de los dos lados (o use POST /reiniciar).`
        });
    }

    console.log(`\n[${AGENTE.nombre}] webhook recibido de ${RIVAL.nombre}${terminado === true ? ' (cierre del debate)' : ''}.`);

    // Se confirma la recepcion ya, para no dejar al rival esperando.
    res.status(200).json({ recibido: true });

    procesarWebhook({ historial, terminado: terminado === true }).catch((error) => {
        console.error(`[${AGENTE.nombre}] error inesperado procesando el webhook:`, error);
    });
};

// POST /reiniciar -> limpia el estado si un debate quedo trabado.
export const reiniciarEstado = (req, res) => {
    estado.pendiente = null;
    estado.enCurso = false;
    estado.inicie = false;
    estado.historial = [];
    estado.terminado = false;
    console.log(`[${AGENTE.nombre}] estado reiniciado.`);
    res.json({ msg: 'estado reiniciado' });
};

// POST /responder -> ordena responder el turno pendiente (modo manual).
// Body opcional: { "aclaracion": "texto" } para orientar la respuesta.
export const responderManual = (req, res) => {
    if (!estado.pendiente) {
        return res.status(409).json({ msg: 'no hay ningun turno pendiente por responder' });
    }

    const aclaracion = typeof req.body?.aclaracion === 'string'
        ? req.body.aclaracion.trim()
        : '';

    res.status(200).json({ msg: 'generando respuesta', aclaracion: aclaracion || null });

    responderPendiente(aclaracion).catch((error) => {
        console.error(`[${AGENTE.nombre}] error inesperado en respuesta manual:`, error);
    });
};

// GET /pendiente -> ver si hay turno esperando y que dijo el rival.
export const obtenerPendiente = (req, res) => {
    const pendiente = estado.pendiente;
    res.json({
        modo: estado.modo,
        hayPendiente: Boolean(pendiente),
        ultimoTurnoRival: pendiente ? pendiente.at(-1) : null
    });
};

// GET /historial -> la conversacion completa conocida hasta ahora (para el chat).
export const obtenerHistorial = (req, res) => {
    res.json({
        agente: AGENTE.nombre,
        autor: AGENTE.autor,
        rival: RIVAL.nombre,
        historial: estado.historial || [],
        terminado: Boolean(estado.terminado),
        modo: estado.modo,
        hayPendiente: Boolean(estado.pendiente),
        generando: Boolean(estado.generando)
    });
};

// POST /modo -> cambia entre auto y manual sin reiniciar.
export const cambiarModo = (req, res) => {
    estado.modo = req.body.modo;
    console.log(`[${AGENTE.nombre}] modo cambiado a: ${estado.modo.toUpperCase()}`);
    res.json({ msg: 'modo actualizado', modo: estado.modo });
};

// GET /rival -> devuelve la URL del rival configurada en este momento.
export const obtenerRival = (req, res) => {
    res.json({
        rival: RIVAL.nombre,
        rivalWebhookUrl: getRivalWebhookUrl()
    });
};

// POST /rival -> cambia la URL del rival y la guarda para que sobreviva reinicios.
export const actualizarRival = async (req, res, next) => {
    try {
        const rivalWebhookUrl = await guardarRivalWebhookUrl(req.body.rivalWebhookUrl);
        console.log(`[${AGENTE.nombre}] URL del rival actualizada: ${rivalWebhookUrl}`);
        res.json({ msg: 'URL del rival actualizada', rival: RIVAL.nombre, rivalWebhookUrl });
    } catch (error) {
        next(error);
    }
};

// GET /salud
export const obtenerSalud = (req, res) => {
    res.json({
        msg: 'ok',
        agente: AGENTE.nombre,
        autor: AGENTE.autor,
        postura: AGENTE.postura,
        modo: estado.modo,
        hayPendiente: Boolean(estado.pendiente),
        debateEnCurso: estado.enCurso,
        turnosMax: TURNOS_MAX,
        rival: { nombre: RIVAL.nombre, webhook: getRivalWebhookUrl() }
    });
};
