import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AGENTE } from '../config/agente.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARPETA_DEBATES = path.join(__dirname, '../../debates');

// Guarda el debate completo en debates/debate_final_b.json (o _b.json).
export const guardarHistorialFinal = async (historial, motivo) => {
    try {
        await fs.mkdir(CARPETA_DEBATES, { recursive: true });

        const ruta = path.join(CARPETA_DEBATES, AGENTE.archivo);
        const contenido = {
            agente: AGENTE.nombre,
            finalizadoEn: new Date().toISOString(),
            motivo,
            historial
        };

        await fs.writeFile(ruta, JSON.stringify(contenido, null, 2), 'utf-8');
        console.log(`[${AGENTE.nombre}] historial guardado en ${ruta}`);
    } catch (error) {
        console.error(`[${AGENTE.nombre}] no se pudo guardar el historial final: ${error.message}`);
    }
};
