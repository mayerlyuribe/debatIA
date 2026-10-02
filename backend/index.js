import "dotenv/config";
import express from "express";
import { validarConfiguracion } from "./src/config/validar-env.js";
import { AGENTE, RIVAL } from "./src/config/agente.js";
import { PORT, HOST, TURNOS_MAX } from "./src/config/debate.js";
import { cargarConfiguracion, getRivalWebhookUrl } from "./src/services/config.service.js";
import debateRoutes from "./src/routes/debateRoutes.js";
import { rutaNoEncontrada, manejarErrores } from "./src/middleware/errorHandler.js";

// Si falta alguna variable del .env, se avisa y no arranca.
validarConfiguracion();

// Carga la URL del rival guardada en rival.json (si existe); si no, usa la del .env.
await cargarConfiguracion();

const app = express();

// Permite llamadas desde el panel de control (que corre en otro origen: file://, otro puerto, otra PC).
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

app.use(express.json({ limit: "2mb" }));

app.use("/api/v1/debate", debateRoutes);

app.use(rutaNoEncontrada);
app.use(manejarErrores);

app.listen(PORT, HOST, () => {
    console.log("=".repeat(60));
    console.log(`  ${AGENTE.nombre} (${AGENTE.autor}) - postura ${AGENTE.postura}`);
    console.log(`  Escuchando en http://${HOST}:${PORT}/api/v1/debate`);
    console.log(`  Rival ${RIVAL.nombre}: ${getRivalWebhookUrl() || '(sin configurar, fijala desde el panel)'}`);
    console.log(`  Turnos maximos por lado: ${TURNOS_MAX}`);
    console.log("=".repeat(60));
});