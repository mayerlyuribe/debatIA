# debate-en-contra (NOVA)

Backend de **NOVA**, la IA que defiende la postura **EN CONTRA**. Escucha en el puerto `8001` y se comunica por webhook con Setsukū (`debate-a-favor`, puerto 8001).

## Instalacion
```bash
npm install
```
Abre el `.env` y completa:
- `GEMINI_API_KEY` con tu clave.
- `MODO`: `manual` (espera tu orden) o `auto` (responde sola).

La URL del rival **no va en el `.env`**: se pega en el panel del frontend (ajustes -> Rival) y se guarda en `rival.json`, junto al `.env`. Sobrevive reinicios.

```bash
npm run dev      # o: npm start
```

## Flujo en modo manual
1. **Cualquiera de los dos puede abrir** el debate con `POST /iniciar`. Quien lo llame genera **su propio** primer argumento (con su postura) y se lo entrega al otro, que queda esperando tu orden.
2. Setsukū recibe el turno y espera; la otra persona da la orden en su PC.
3. Cuando Setsukū responde, NOVA guarda el turno y espera **tu** orden.
4. Tu ordenas responder: `POST /responder`. Asi hasta completar `TURNOS_MAX`.
5. Si los dos inician a la vez, el segundo recibe un 409: inicie solo uno. Si ya hay un debate en curso, `/iniciar` tambien responde 409 salvo que mandes `"forzar": true` (o uses `POST /reiniciar`).

Cada agente defiende **siempre su propia postura**, tambien al abrir el debate.

## Endpoints (`/api/v1/debate`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/iniciar` | Abre el debate con tu primer argumento. Body: `{"tema":"...", "aclaracion":"opcional", "forzar":false}` |
| POST | `/webhook` | Lo usa Setsukū para entregar su turno |
| POST | `/responder` | Ordena responder el turno pendiente. Body opcional: `{"aclaracion":"..."}` |
| GET | `/pendiente` | Ver si hay turno esperando y que dijo el rival |
| POST | `/modo` | Cambia el modo. Body: `{"modo":"auto"}` o `{"modo":"manual"}` |
| GET | `/rival` | Ver la URL del rival configurada |
| POST | `/rival` | Cambia la URL del rival. Body: `{"rivalWebhookUrl":"https://..."}` |
| GET | `/salud` | Estado del servicio |

## Ejemplos
```bash
curl -X POST http://127.0.0.1:8001/api/v1/debate/iniciar \
  -H "Content-Type: application/json" -d '{"tema":"La IA mejora la educacion"}'

curl http://127.0.0.1:8001/api/v1/debate/pendiente

curl -X POST http://127.0.0.1:8001/api/v1/debate/responder

curl -X POST http://127.0.0.1:8001/api/v1/debate/responder \
  -H "Content-Type: application/json" \
  -d '{"aclaracion":"enfocate en el impacto economico"}'
```

## Dos PCs
Con `HOST=0.0.0.0` el servicio acepta conexiones de la red. Ambas PCs deben estar en la misma red y tener abierto el puerto (8000 en NOVA, 8001 en Setsukū). Las IPs se ven con `ipconfig` (Windows) o `ip a` (Linux/Mac).

Los debates terminados se guardan en `debates/debate_final_b.json`.
