// Identidad de este agente. Este archivo (junto con el .env) es lo unico que
// cambia entre los dos backends: el resto del codigo es identico.

export const AGENTE = {
    nombre: 'NOVA',
    autor: 'IA-B',          // como aparece en el historial
    postura: 'EN CONTRA',
    archivo: 'debate_final_b.json'
};

export const RIVAL = {
    nombre: 'Setsukū',
    autor: 'IA-A',
    postura: 'A FAVOR'
};
