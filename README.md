# debate-en-contra — NOVA

## Nueva estructura (frontend separado)

Este proyecto ahora esta dividido en dos carpetas independientes:

```
debate-en-contra/
├── backend/     -> API de NOVA (Node/Express). Se ejecuta con "npm run dev" o "npm start".
└── frontend/    -> index.html, el chat tipo WhatsApp para ver el debate en vivo.
```

### Como correrlo

1. Entra a `backend/` y arranca el servidor:
   ```
   cd backend
   npm install
   npm run dev
   ```
   Por defecto escucha en el puerto **8000** (ver `backend/.env`).

2. Abre `frontend/index.html` directamente en el navegador (doble clic, o "Abrir con" tu navegador).
   No necesita servidor propio: es un archivo estatico que le habla al backend por HTTP.

3. En el chat, toca el icono de ajustes (arriba a la derecha) para:
   - Escribir la URL del backend (por defecto `http://127.0.0.1:8001`; si el backend corre
     en otra PC, usa `http://IP_DE_ESA_PC:8001`).
   - Configurar el **Rival (otro backend)**: pega la URL del backend de Setsukū (solo la base
     o la URL completa del webhook), toca **Probar** para verificar y **Guardar** para
     dejarla fija. Ya no hace falta tocar el `.env` para esto.
   - Elegir modo manual o automatico.
   - Iniciar un debate nuevo (tema).
   - Reiniciar el estado si algo se traba.

La URL del rival se guarda en `backend/rival.json` y tambien en el navegador: si el
backend arranca sin URL (por ejemplo en Render), el panel la vuelve a configurar sola.
Si un turno no se pudo entregar, el debate no se cierra: aparece un aviso para corregir
la URL y reintentar.

Los mensajes de NOVA y del rival se ven como burbujas de chat (propias a la derecha,
rival a la izquierda, moderador al centro), en vez de solo por la terminal. Se actualiza
solo cada 1.5s mientras el debate esta en curso.

Cada PC corre su propio backend + abre su propio frontend: la PC con NOVA usa esta
carpeta, la otra PC usa la carpeta del otro agente (con su propio backend y su propio
frontend, apuntando cada uno a su propio backend local). En cada panel se configura la
URL del rival (la del backend de la otra PC) y se prueba antes de arrancar.
