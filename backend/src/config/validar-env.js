// La URL del rival ya no vive en el .env: se configura desde el panel del
// frontend y se guarda en rival.json. Estas dos siguen siendo imprescindibles
// para que el agente pueda generar sus turnos.
const OBLIGATORIAS = ['GEMINI_API_KEY', 'GEMINI_API_URL'];

export const validarConfiguracion = () => {
    const faltantes = OBLIGATORIAS.filter((nombre) => {
        const valor = process.env[nombre];
        return !valor || valor.startsWith('PEGA_AQUI');
    });

    if (faltantes.length > 0) {
        console.error(`error de configuracion: completa estas variables en el .env -> ${faltantes.join(', ')}`);
        process.exit(1);
    }
};
