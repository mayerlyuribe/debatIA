// Configuracion editable en tiempo de ejecucion. La URL del rival se guarda en
// rival.json (junto al .env) y se cambia desde el panel del frontend sin tocar
// archivos ni reiniciar el backend. Ya no se lee de ninguna variable del .env.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUTA_RIVAL = path.join(__dirname, '../../rival.json');

let rivalWebhookUrl = '';

// Solo http o https (sirve para localhost, IP de red, Render, tuneles, etc.).
export const esUrlRivalValida = (valor) => {
    try {
        const url = new URL(valor);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

// Si el usuario pega solo la base (https://app.onrender.com), se completa la ruta del webhook.
const RUTA_WEBHOOK = '/api/v1/debate/webhook';
export const normalizarUrlRival = (valor) => {
    const url = new URL(valor.trim());
    if (url.pathname === '/' || url.pathname === '') url.pathname = RUTA_WEBHOOK;
    return url.toString();
};

// Se llama una vez al arrancar. Si existe rival.json usa esa URL; si no,
// queda vacia y se configura desde el panel.
export const cargarConfiguracion = async () => {
    // Valor inicial: variable de entorno RIVAL_WEBHOOK_URL (util en Render, donde
    // rival.json se borra en cada reinicio). rival.json, si existe, tiene prioridad.
    rivalWebhookUrl = esUrlRivalValida(process.env.RIVAL_WEBHOOK_URL) ? normalizarUrlRival(process.env.RIVAL_WEBHOOK_URL) : '';
    try {
        const contenido = await fs.readFile(RUTA_RIVAL, 'utf-8');
        const data = JSON.parse(contenido);
        if (esUrlRivalValida(data?.rivalWebhookUrl)) {
            rivalWebhookUrl = normalizarUrlRival(data.rivalWebhookUrl);
        }
    } catch {
        // Todavia no existe rival.json (o esta corrupto): queda sin configurar.
    }
    return rivalWebhookUrl;
};

export const getRivalWebhookUrl = () => rivalWebhookUrl;

// Guarda la nueva URL en memoria y en rival.json para que sobreviva reinicios.
export const guardarRivalWebhookUrl = async (url) => {
    if (!esUrlRivalValida(url)) {
        const error = new Error('la URL del rival debe empezar con http:// o https://');
        error.status = 400;
        throw error;
    }
    url = normalizarUrlRival(url);
    rivalWebhookUrl = url;
    await fs.writeFile(RUTA_RIVAL, JSON.stringify({ rivalWebhookUrl: url }, null, 2), 'utf-8');
    return rivalWebhookUrl;
};