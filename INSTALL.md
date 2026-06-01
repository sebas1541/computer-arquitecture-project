# Guía de instalación — Windows y macOS

Esta guía explica, paso a paso, cómo poner en marcha el proyecto completo
(**Arduino + backend + frontend**) en **Windows** y en **macOS**. El flujo es el
mismo en ambos sistemas; solo cambian algunos comandos de terminal y la forma de
identificar el puerto serial.

> Resumen del orden correcto:
> **1)** subir el sketch al Arduino → **2)** arrancar el backend → **3)** arrancar
> el frontend. El puerto serial solo lo puede usar un proceso a la vez, por eso se
> graba el Arduino *antes* de levantar el backend.

---

## 0. Requisitos previos

Instala estas tres herramientas en tu máquina antes de empezar:

| Herramienta | Versión mínima | Windows | macOS |
|---|---|---|---|
| **Python** | 3.9+ | [python.org](https://www.python.org/downloads/) — marca *"Add Python to PATH"* en el instalador | `brew install python` (o [python.org](https://www.python.org/downloads/)) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) (instalador LTS) | `brew install node` |
| **Arduino IDE** *o* **arduino-cli** | última | [Arduino IDE](https://www.arduino.cc/en/software) / `winget install ArduinoSA.CLI` | Arduino IDE / `brew install arduino-cli` |

**Driver USB (importante):** si tu placa es un **Arduino UNO original**, Windows y
macOS la reconocen solos. Si es un **clon con chip CH340**, instala el driver:

- **Windows:** descarga el driver CH340 del fabricante (WCH) y reinicia.
- **macOS:** normalmente funciona sin driver en versiones recientes; si no aparece
  el puerto, instala el driver CH340 para macOS de WCH.

---

## 1. Subir el sketch al Arduino

Tienes dos caminos. El **Arduino IDE** es el más sencillo si nunca usaste la línea
de comandos. **arduino-cli** es reproducible y es el que usamos en desarrollo.

### Opción A — Arduino IDE (recomendado para principiantes, igual en Windows y macOS)

1. Abre `CajaFuertePatrones.ino` con el Arduino IDE. Si pregunta por crear una
   carpeta para el sketch, acepta.
2. Menú **Herramientas → Placa → Arduino AVR Boards → Arduino UNO**.
3. Menú **Herramientas → Puerto** y elige el puerto del Arduino:
   - **Windows:** algo como `COM3`, `COM4`…
   - **macOS:** algo como `/dev/cu.usbmodemXXXX`.
4. Si hace falta, instala la librería **Stepper** desde
   **Herramientas → Administrar bibliotecas…** (busca "Stepper" de Arduino).
5. Pulsa **Subir** (la flecha →). Al terminar, abre el **Monitor Serie a 9600
   baudios** y verifica que aparece el banner y líneas `EVT:STATE:Q0`.
6. **Cierra el Monitor Serie** antes de arrancar el backend (si no, el puerto
   queda ocupado).

### Opción B — arduino-cli (línea de comandos)

Instalación de la herramienta y del core/librería (una sola vez):

```bash
# Windows (PowerShell):  winget install ArduinoSA.CLI
# macOS:                 brew install arduino-cli

arduino-cli config init
arduino-cli core update-index
arduino-cli core install arduino:avr
arduino-cli lib install Stepper
```

> **Nota:** arduino-cli exige que el `.ino` viva dentro de una carpeta con el
> mismo nombre. Como en este repo el sketch está en la raíz, cópialo a una carpeta
> temporal antes de compilar/subir:
>
> ```bash
> # macOS / Linux
> mkdir -p /tmp/CajaFuertePatrones
> cp CajaFuertePatrones.ino /tmp/CajaFuertePatrones/
> ```
> ```powershell
> # Windows (PowerShell)
> mkdir $env:TEMP\CajaFuertePatrones -Force
> copy CajaFuertePatrones.ino $env:TEMP\CajaFuertePatrones\
> ```

Detecta el puerto y sube:

```bash
arduino-cli board list                       # busca la fila "Arduino UNO"

# macOS (ejemplo de puerto):
arduino-cli compile --fqbn arduino:avr:uno /tmp/CajaFuertePatrones
arduino-cli upload  -p /dev/cu.usbmodemXXXX --fqbn arduino:avr:uno /tmp/CajaFuertePatrones

# Windows (PowerShell, ejemplo de puerto COM4):
arduino-cli compile --fqbn arduino:avr:uno $env:TEMP\CajaFuertePatrones
arduino-cli upload  -p COM4 --fqbn arduino:avr:uno $env:TEMP\CajaFuertePatrones
```

> Si la primera subida muestra `not in sync` o `programmer is not responding`,
> simplemente repite el comando `upload` (el UNO reinicia el puerto al grabar).

---

## 2. Backend (FastAPI + pyserial)

Abre una terminal en la carpeta `backend/`.

### macOS / Linux

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # opcional: fija SERIAL_PORT si la autodetección falla
uvicorn main:app --port 8000
```

### Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # si PowerShell bloquea el script:
                               #   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --port 8000
```

**Fijar el puerto manualmente (si hay más de un `usbmodem`/COM o falla la
autodetección):** edita `backend/.env`:

```
# macOS
SERIAL_PORT=/dev/cu.usbmodemXXXX
# Windows
SERIAL_PORT=COM4
```

**Verifica** que el backend lee el Arduino (en otra terminal):

```bash
curl http://localhost:8000/health
# {"ok":true,"connected":true,"port":"...","baud_rate":9600}
```

Si `connected` es `false`: confirma que subiste el sketch, que cerraste el Monitor
Serie del Arduino IDE, y que `SERIAL_PORT` apunta al puerto correcto.

---

## 3. Frontend (React + Vite)

Abre **otra** terminal en la carpeta `frontend/` (los comandos son idénticos en
Windows y macOS):

```bash
cd frontend
npm install
npm run dev
```

Abre **http://localhost:5173**. El encabezado debe mostrarse en verde con
*"Arduino conectado"*.

> **Sonido de la victoria:** los navegadores bloquean el audio hasta que
> interactúas con la página. Como el juego se controla con los botones físicos del
> Arduino, **haz un clic en cualquier parte de la página una vez** (desaparece el
> aviso *"Haz clic para activar el sonido"*) y a partir de ahí sonará la canción al
> ganar.

---

## 4. Cómo jugar

1. Pulsa cualquier botón **A/B/C/D** en el Arduino → genera un patrón de 4 símbolos
   y lo muestra parpadeando los LEDs.
2. Reproduce el patrón en el mismo orden. Tienes **8 segundos por pulsación**.
3. Si aciertas los 4 → **Q5**: LED verde, melodía y pantalla "¡Salió el pollo!".
   Si fallas o se acaba el tiempo → **Q6**: LED rojo y pantalla de fallo.
4. El sistema vuelve solo a **Q0** (auto-reset) o con el botón físico de reinicio.

---

## 5. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `[Errno 16] Resource busy` al arrancar el backend | El Monitor Serie del IDE u otro proceso retiene el puerto | Cierra el Monitor Serie / otra sesión del backend |
| `connected: false` en `/health` | Puerto equivocado o sketch sin subir | Fija `SERIAL_PORT` en `.env`; vuelve a subir el sketch |
| Frontend en *"Sin conexión"* aunque el Arduino esté conectado | Backend caído o página abierta fuera de `localhost:5173` | Revisa `curl /health`; abre la app por `http://localhost:5173` |
| `not in sync` al subir el sketch | El UNO reinició el puerto durante la grabación | Repite el comando `upload` |
| PowerShell no deja activar el venv | Política de ejecución | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| No suena la canción al ganar | El navegador bloquea el autoplay | Haz un clic en la página una vez (ver §3) |
