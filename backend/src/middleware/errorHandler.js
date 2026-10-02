export const rutaNoEncontrada = (req, res, next) => {
    res.status(404).json({
        msg: 'ruta no encontrada'
    });
};

export const manejarErrores = (err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        msg: 'hable con el administrador',
    });
};
