import { Router } from 'express';
import { check } from 'express-validator';
import {
    iniciarDebate,
    recibirWebhook,
    obtenerSalud,
    responderManual,
    obtenerPendiente,
    obtenerHistorial,
    cambiarModo,
    reiniciarEstado,
    obtenerRival,
    actualizarRival
} from '../controllers/debateController.js';
import { validarCampos } from '../middleware/validar-campos.js';

const router = Router();

router.post('/iniciar', [
    check('tema', 'El tema es obligatorio').isString().trim().notEmpty(),
    check('tema', 'El tema no puede pasar de 300 caracteres').isLength({ max: 300 }),
    check('aclaracion', 'La aclaracion debe ser texto de maximo 500 caracteres').optional().isString().isLength({ max: 500 }),
    check('forzar', '"forzar" debe ser true o false').optional().isBoolean({ strict: true }),
    validarCampos
], iniciarDebate);

router.post('/webhook', [
    check('historial', 'El historial es obligatorio y debe ser un arreglo con al menos un turno').isArray({ min: 1 }),
    check('historial.*.autor', 'Cada turno debe tener "autor" como texto').isString().notEmpty(),
    check('historial.*.texto', 'Cada turno debe tener "texto" como texto').isString().notEmpty(),
    check('terminado', '"terminado" debe ser true o false').optional().isBoolean(),
    validarCampos
], recibirWebhook);

router.post('/responder', [
    check('aclaracion', 'La aclaracion debe ser texto de maximo 500 caracteres')
        .optional().isString().isLength({ max: 500 }),
    validarCampos
], responderManual);

router.get('/pendiente', obtenerPendiente);

router.get('/historial', obtenerHistorial);

router.post('/modo', [
    check('modo', 'El modo debe ser "auto" o "manual"').isIn(['auto', 'manual']),
    validarCampos
], cambiarModo);

router.post('/reiniciar', reiniciarEstado);

router.get('/rival', obtenerRival);

router.post('/rival', [
    check('rivalWebhookUrl', 'La URL del rival es obligatoria').isString().trim().notEmpty(),
    check('rivalWebhookUrl', 'La URL del rival debe empezar con http:// o https://')
        .isURL({ protocols: ['http', 'https'], require_protocol: true }),
    validarCampos
], actualizarRival);

router.get('/salud', obtenerSalud);

export default router;
