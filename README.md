# Caja Fuerte de Patrones — Sketch + Backend + Frontend

Este subdirectorio contiene tres piezas que trabajan juntas:

1. **`CajaFuertePatrones.ino`** — sketch de Arduino UNO con la lógica del AFD.
2. **`backend/`** — API en Python (FastAPI + pyserial) que lee el puerto USB del Arduino y reenvía los eventos del juego por Server-Sent Events.
3. **`frontend/`** — aplicación React (Vite) que muestra el tablero de estados en vivo y dispara animaciones de premio o fallo cuando el AFD entra a Q5 o Q6.

```
Arduino UNO ──USB serial (9600)──► backend (FastAPI, puerto 8000)
                                          │
                                          │  SSE  /events
                                          ▼
                                   frontend (Vite, puerto 5173)
                                          │
                                          ▼
                                       Navegador
```

## Requisitos

- **Python 3.10+** y `pip`.
- **Node 18+** y `npm`.
- Arduino UNO conectado por USB con el sketch ya compilado y subido.
- El driver USB-serial correspondiente al Arduino (en Macs modernos suele venir incluido; con clones que usan CH340 instalar `wch.cn` driver).

## 1. Subir el sketch al Arduino

1. Abrir `CajaFuertePatrones.ino` en el Arduino IDE.
2. Seleccionar `Herramientas → Placa → Arduino UNO` y el puerto correcto.
3. Compilar y subir.
4. (Opcional) Abrir Serial Monitor a 9600 baudios para verificar que aparecen líneas como `EVT:STATE:Q0`.
5. **Cerrar el Serial Monitor** antes de arrancar el backend — solo un proceso puede tener el puerto serial.

## 2. Arrancar el backend

Dos opciones: nativo en Python o con Docker Compose.

### Opción A — nativo

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # ajustar SERIAL_PORT si el auto-detect no acierta
uvicorn main:app --reload --port 8000
```

### Opción B — Docker Compose

```bash
cd backend
cp .env.example .env
# (ajustar SERIAL_PORT según la sección que aplique a tu OS, ver abajo)
cd ..
docker compose up --build
```

**Linux:** descomentá la sección `devices:` del `docker-compose.yml` con la ruta real del puerto (típicamente `/dev/ttyACM0`) y poné `SERIAL_PORT=/dev/ttyACM0` en `.env`.

**macOS / Windows:** Docker Desktop **no expone el USB del host al contenedor**. Solución: arrancar un puente TCP en el host con `socat` y apuntar el contenedor a él.

1. Instalar socat si no lo tenés: `brew install socat` (Mac) o el equivalente en Windows.
2. Identificar el puerto del Arduino:
   ```bash
   ls /dev/cu.usbmodem*        # macOS
   ```
3. En una terminal aparte (y dejarla abierta), arrancar el puente:
   ```bash
   socat -d -d /dev/cu.usbmodemXXXX,b9600,raw,echo=0 tcp-listen:5555,reuseaddr,fork
   ```
   (Reemplazar `usbmodemXXXX` por el puerto real. El `b9600` fija el baud rate.)
4. En `backend/.env`:
   ```
   SERIAL_PORT=socket://host.docker.internal:5555
   ```
5. Levantar el compose: `docker compose up --build`.

> **Importante:** el Serial Monitor del Arduino IDE bloquea el puerto USB. Cerralo antes de arrancar el backend o `socat`.

### Verificación

```bash
curl http://localhost:8000/health
# {"ok":true,"connected":true,"port":"/dev/cu.usbmodem...","baud_rate":9600,...}
```

Si `connected: false`:

- Verificar que el Arduino esté enchufado y el sketch corriendo.
- Que el Serial Monitor del Arduino IDE esté cerrado.
- Que `socat` siga corriendo (si estás en Mac/Windows con Docker).
- Forzar el puerto en `.env`.

## 3. Arrancar el frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173). Si el backend está corriendo, el indicador del header debe ponerse verde (“Arduino conectado”).

## 4. Jugar

1. Con el Arduino enchufado, presionar uno de los cuatro botones de colores (A, B, C o D).
2. Los LEDs del Arduino parpadearán mostrando el patrón. En la pantalla aparecen los cuatro puntos del patrón en orden.
3. Reproducir el patrón en el Arduino. El tablero del navegador se mueve de `Q1` a `Q2`, `Q3`, `Q4` en tiempo real.
4. Si se completa el patrón, aparece la pantalla full-screen con confeti **¡PREMIO ENTREGADO!**. Si se falla o expira el timeout (2 s por pulsación), aparece la pantalla **FALLO**.
5. Presionar el botón **Reset** físico para volver a `Q0` y comenzar otra partida.

## Endpoints del backend

| Endpoint | Método | Descripción |
|---|---|---|
| `/health` | GET | Estado de la conexión serial (`connected`, `port`, `baud_rate`). |
| `/state`  | GET | Snapshot del estado actual del juego en JSON. |
| `/events` | GET | Stream Server-Sent Events. El primer evento es siempre un `SNAPSHOT` con el estado actual; luego van los eventos del Arduino tal como llegan. |

### Forma de los eventos SSE

```json
{ "type": "SNAPSHOT", "value": { "state": "Q2", "pattern": "abca", "last_input": "b", "phase": "playing" } }
{ "type": "STATE",   "value": "Q3" }
{ "type": "PATTERN", "value": "abca" }
{ "type": "INPUT",   "value": "a" }
{ "type": "WIN" }
{ "type": "LOSE" }
{ "type": "RESET" }
{ "type": "TIMEOUT" }
{ "type": "CONNECTED",   "port": "/dev/cu.usbmodem1101" }
{ "type": "DISCONNECTED" }
```

## Troubleshooting

**“no se pudo abrir /dev/cu.usbmodemXXXX: [Errno 16] Resource busy”**
El Serial Monitor del Arduino IDE u otro proceso tiene el puerto. Cerrarlo.

**El header dice “Sin conexión” aunque el Arduino esté enchufado**
Revisar `curl http://localhost:8000/health`. Si `connected: false`, definir `SERIAL_PORT` en `.env` con el path exacto (en Mac: `ls /dev/cu.usbmodem*`).

**El frontend no recibe nada pero `/health` dice `connected: true`**
Probable problema de CORS o de proxy. El `vite.config.ts` ya redirige `/events`, `/state` y `/health` al backend; verifica que estés abriendo `http://localhost:5173` y **no** otra dirección.

**Las pantallas de premio/fallo no aparecen**
Confirmar que el sketch está emitiendo las líneas `EVT:WIN` / `EVT:LOSE`. Si no las ves al hacer `curl http://localhost:8000/events`, es que el sketch viejo sin protocolo `EVT:` está cargado.
