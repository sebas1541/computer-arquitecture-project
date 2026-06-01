# Caja Fuerte de Patrones

**Estudio de Caso — Arquitectura de Computadores**
Universidad Pedagógica y Tecnológica de Colombia (UPTC)
Ingeniería de Sistemas y Computación

**Autores:** Sebastián Cañón Castellanos · Kevin Jiménez Poveda · Luis Enrique Hernández

---

## 1. Resumen del proyecto

Este repositorio contiene la implementación completa de una **Caja Fuerte de Patrones**: un juego de habilidad construido sobre Arduino UNO que materializa, en hardware físico, la teoría formal de los Autómatas Finitos Deterministas. El sistema reta al usuario a memorizar y reproducir una secuencia aleatoria de cuatro símbolos sobre el alfabeto `{a, b, c, d}`, generada al inicio de cada partida. Si la secuencia se reproduce correctamente y dentro de un tiempo límite por pulsación, el sistema entrega el premio; cualquier error o tiempo agotado lleva al jugador a un estado trampa del cual solo se sale mediante reinicio.

La intención académica del proyecto va más allá de armar un juego entretenido. Lo que buscamos es **construir una correspondencia uno a uno entre la teoría matemática del AFD y un artefacto físico observable**, de modo que cualquier persona que entienda la quíntupla `M = (Q, Σ, δ, q0, F)` pueda mirar el prototipo y reconocer exactamente cuál pulsador corresponde a qué símbolo del alfabeto, cuál estado está activo en cada momento, y por qué razón el sistema acepta o rechaza una secuencia particular. La aguja del motor paso a paso apunta físicamente al estado actual del autómata, los LEDs traducen las salidas del AFD en señales visuales inmediatas, y el buzzer ofrece realimentación auditiva diferenciada para los estados de aceptación y de fallo.

El proyecto está organizado en tres piezas que trabajan juntas pero que pueden funcionar de manera independiente cuando es necesario. La primera es el **sketch del Arduino**, que contiene toda la lógica del AFD, lee los botones, controla los LEDs, mueve el motor y emite mensajes por el puerto serial. La segunda es un **backend en Python** construido sobre FastAPI y pyserial, cuya única responsabilidad es escuchar el puerto USB del Arduino, traducir los eventos estructurados a JSON y reenviarlos a los clientes web mediante Server-Sent Events. La tercera es un **frontend en React + Vite** que se suscribe a ese stream y dibuja, en tiempo real, el tablero de estados del autómata, el patrón objetivo, la entrada más reciente, y dispara una experiencia celebratoria de pantalla completa con audio cuando el jugador gana, o un mensaje de fallo cuando pierde.

```
Arduino UNO  ──USB serial (9600 baudios)──►  Backend (FastAPI, puerto 8000)
                                                       │
                                                       │  Server-Sent Events  /events
                                                       ▼
                                              Frontend (Vite, puerto 5173)
                                                       │
                                                       ▼
                                                    Navegador
```

---

## 2. Estructura del repositorio

```
.
├── CajaFuertePatrones.ino    Sketch principal del Arduino (AFD, motor, buzzer)
├── diagram.json              Circuito de Wokwi para simulación
├── docker-compose.yml        Orquestación del backend con Docker (opcional)
├── backend/                  API en Python (FastAPI + pyserial)
│   ├── main.py
│   ├── serial_reader.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/                 Aplicación React + Vite
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/               Assets estáticos (audio, logo Ara, imagen del pollo)
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── styles.css
│       ├── hooks/useArduinoState.ts
│       └── components/{StateBoard,WinScreen,LoseScreen}.tsx
└── docs/                     Documentación académica del estudio de caso
    ├── CajaFuerte_README.md
    ├── CajaFuerte_ComoFunciona.md
    ├── CajaFuerte_Codigo.md
    └── CajaFuerte_Diagrama.md
```

La documentación académica completa (definición formal del autómata, explicación del flujo de juego, justificación del determinismo, descripción del hardware) está en la carpeta `docs/`. Se recomienda revisarla antes de modificar el código si se quiere mantener la coherencia entre la teoría y la implementación.

---

## 3. Requisitos previos

Para correr el proyecto completo se necesitan tres entornos disponibles en la máquina anfitriona. En primer lugar, **Python 3.10 o superior** con `pip` actualizado, ya que el backend usa características de tipado modernas y dependencias compatibles únicamente con versiones recientes del intérprete. En segundo lugar, **Node.js 18 o superior** con `npm`, requerido por Vite y por la cadena de tipos de TypeScript que utiliza el frontend. Finalmente, un **Arduino UNO físico** o el simulador **Wokwi** abierto en el navegador. Si se trabaja con hardware real, el sistema operativo debe reconocer el chip USB-serial del Arduino; en macOS modernos esto ocurre automáticamente, pero en clones con chip CH340 es posible que sea necesario instalar el controlador correspondiente desde la página del fabricante.

---

## 4. Subida del sketch al Arduino

El proceso para llevar el código C++ al microcontrolador es estándar y se realiza desde el Arduino IDE. Después de abrir el archivo `CajaFuertePatrones.ino` en el IDE, debe seleccionarse `Herramientas → Placa → Arduino UNO` y el puerto serial correcto que aparece en el menú de puertos. Luego se compila y se sube el sketch presionando el botón de carga. Una vez terminada la subida, conviene abrir el Serial Monitor a **9600 baudios** para verificar que el dispositivo está emitiendo el flujo de eventos esperado; deben aparecer líneas legibles que describen las transiciones del autómata y, en paralelo, líneas estructuradas con el prefijo `EVT:` que serán consumidas por el backend.

Es importante recordar que el puerto serial USB solo puede ser controlado por un proceso a la vez. Antes de arrancar el backend en Python es necesario **cerrar el Serial Monitor** del Arduino IDE, porque de lo contrario el backend no podrá abrir el puerto y reportará un error de tipo *resource busy*.

---

## 5. Backend en Python

El backend está implementado con FastAPI sobre `uvicorn`, y la lectura del puerto serial se delega a `pyserial`. Existen dos formas de ejecutarlo, y la elección depende del entorno y de las preferencias del usuario.

### Opción A. Ejecución nativa

La opción más simple y recomendada para desarrollo local consiste en crear un entorno virtual de Python, instalar las dependencias y arrancar el servidor directamente. Esta variante permite recargar el código sin reconstruir nada y es la que mejor se adapta al hardware conectado por USB en la misma máquina.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate           # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # Ajustar SERIAL_PORT si la auto-detección falla
uvicorn main:app --reload --port 8000
```

El backend intentará detectar el puerto del Arduino automáticamente recorriendo los puertos seriales del sistema y buscando descripciones que contengan los términos `usbmodem`, `usbserial`, `Arduino`, `wchusb`, `ttyUSB` o `ttyACM`. Si la detección automática no funciona, el archivo `.env` permite forzar la ruta exacta con la variable `SERIAL_PORT`.

### Opción B. Ejecución con Docker Compose

Para quien prefiera aislamiento de dependencias o quiera desplegar el backend en una máquina distinta, hay un `docker-compose.yml` listo. Esta opción es plenamente funcional en Linux con un solo paso adicional, pero requiere un truco extra en macOS y Windows porque Docker Desktop **no expone el USB del host al contenedor** en esos sistemas operativos.

```bash
cd backend
cp .env.example .env
cd ..
docker compose up --build
```

En **Linux**, basta con descomentar la sección `devices:` del archivo `docker-compose.yml` indicando la ruta real del puerto (generalmente `/dev/ttyACM0`) y poner el valor correspondiente en `SERIAL_PORT`. El contenedor verá el puerto serial como si fuera nativo.

En **macOS** y **Windows**, la limitación de Docker Desktop obliga a montar un puente TCP en el host con la utilidad `socat`. La idea es exponer el puerto serial físico como un servidor TCP local al cual el contenedor se conecta a través de `host.docker.internal`. El procedimiento exacto consiste en instalar `socat` (con `brew install socat` en macOS), identificar el puerto del Arduino con `ls /dev/cu.usbmodem*`, y arrancar el puente en una terminal separada que se debe dejar abierta durante toda la sesión:

```bash
socat -d -d /dev/cu.usbmodemXXXX,b9600,raw,echo=0 tcp-listen:5555,reuseaddr,fork
```

Después de eso, en `backend/.env` se configura `SERIAL_PORT=socket://host.docker.internal:5555` y se arranca el compose normalmente. El backend usa `pyserial.serial_for_url(...)` para abrir el puerto, lo cual le permite tratar la URL `socket://` exactamente como si fuera una ruta de dispositivo nativo, sin cambios en el código.

### Verificación del backend

Una vez levantado el backend por cualquiera de las dos vías, conviene confirmar que está leyendo el Arduino correctamente. El endpoint de salud devuelve un objeto JSON que informa el estado de la conexión, el puerto que fue abierto y el baud rate configurado:

```bash
curl http://localhost:8000/health
# {"ok":true,"connected":true,"port":"/dev/cu.usbmodem...","baud_rate":9600,...}
```

Si `connected` es `false`, hay varios diagnósticos posibles. Lo primero es asegurarse de que el Arduino esté físicamente enchufado y de que el sketch esté ejecutándose. Lo segundo es cerrar el Serial Monitor del Arduino IDE, que es la causa más frecuente del problema. Si el sistema operativo es macOS o Windows y se está usando Docker, hay que verificar también que el proceso `socat` siga corriendo. Como último recurso, forzar la ruta del puerto en el archivo `.env` resuelve los casos en que la auto-detección no acierta con la descripción del dispositivo.

---

## 6. Frontend en React

El frontend está construido con Vite, React 18, TypeScript y `framer-motion`. La instalación de dependencias y el arranque del servidor de desarrollo son los habituales en un proyecto de este tipo:

```bash
cd frontend
npm install
npm run dev
```

Al abrir [http://localhost:5173](http://localhost:5173) en el navegador, la aplicación intentará conectarse al backend mediante un `EventSource` apuntando a `/events`. El proxy de Vite, configurado en `vite.config.ts`, redirige automáticamente las rutas `/events`, `/state` y `/health` al puerto 8000 donde escucha el backend, lo cual evita problemas de CORS durante el desarrollo. Si la conexión se establece correctamente, el indicador del encabezado debe mostrarse en verde con el mensaje *Arduino conectado*.

La interfaz mantiene un diseño cálido y claro, inspirado en el lenguaje visual de Anthropic, con tipografía DM Sans, fondo crema, acentos en terracota y tarjetas de información para el estado actual, el patrón objetivo y la última entrada del jugador. Cuando el AFD alcanza el estado de aceptación, una pantalla completa aparece con el logo de la cadena de supermercados Ara, una imagen del pollo asado, y la canción **"Salió el pollo"** sonando durante los 30 segundos que dura la celebración. Esta decisión de diseño es deliberadamente humorística pero también funcional: convierte la victoria en un momento memorable que ayuda a los espectadores de la sustentación a recordar el proyecto.

---

## 7. Cómo jugar

Una partida típica empieza con el sistema en estado `Q0`, esperando una pulsación cualquiera del usuario. En cuanto se presiona uno de los botones de juego (A, B, C o D), el sistema genera aleatoriamente una secuencia de cuatro símbolos sobre el alfabeto de los cuatro colores, muestra esa secuencia parpadeando los LEDs correspondientes en orden, y transita al estado `Q1` para esperar la primera respuesta del usuario. A partir de ese momento el jugador tiene **ocho segundos por pulsación** para reproducir el patrón en el mismo orden en que fue mostrado.

Cada acierto avanza el autómata un estado adelante: `Q1 → Q2 → Q3 → Q4`. Si el jugador completa los cuatro símbolos correctamente, el AFD entra al estado `Q5`, que es el único estado de aceptación del lenguaje. En ese momento se enciende el LED grande verde, el motor mueve la aguja a la posición de premio en el tablero, el buzzer reproduce la melodía ascendente de victoria, y el frontend muestra la pantalla celebratoria de Ara con audio. Si en cualquier momento durante la partida el jugador presiona un botón incorrecto o no responde dentro del tiempo límite, el sistema transita inmediatamente al estado trampa `Q6`, enciende el LED grande rojo, suena el tono grave de derrota, y el frontend muestra la pantalla de fallo.

Tanto el estado de premio como el estado de fallo solo pueden ser abandonados mediante el botón de reinicio físico (símbolo `r`), que devuelve el sistema a `Q0` y deja todo listo para una nueva partida con una nueva secuencia aleatoria. Adicionalmente, el sketch incluye un **auto-reset** que vuelve automáticamente a `Q0` después de 31 segundos en `Q5` —el tiempo exacto que dura la canción de Ara— y después de 5 segundos en `Q6`, de modo que el sistema nunca se queda atascado aunque el botón de reinicio no funcione.

---

## 8. Endpoints del backend

El backend expone tres endpoints, todos sobre el método HTTP `GET`. El endpoint `/health` devuelve un objeto JSON con el estado de la conexión serial, incluyendo el puerto activo y el baud rate. El endpoint `/state` devuelve un snapshot del estado actual del juego en formato JSON, útil para clientes que no necesitan stream en tiempo real. El endpoint `/events` es el más interesante: abre una conexión persistente de tipo Server-Sent Events y emite, en orden, primero un evento `SNAPSHOT` con el estado completo del juego en el momento de la conexión, y después todos los eventos que vayan llegando del Arduino conforme ocurren. La estructura de los eventos sigue una convención simple y autodescriptiva:

```json
{ "type": "SNAPSHOT",      "value": { "state": "Q2", "pattern": "abca", "last_input": "b", "phase": "playing" } }
{ "type": "STATE",         "value": "Q3" }
{ "type": "PATTERN",       "value": "abca" }
{ "type": "INPUT",         "value": "a" }
{ "type": "WIN" }
{ "type": "LOSE" }
{ "type": "RESET" }
{ "type": "TIMEOUT" }
{ "type": "CONNECTED",     "port": "/dev/cu.usbmodem1101" }
{ "type": "DISCONNECTED" }
```

El frontend consume estos eventos mediante un hook personalizado (`useArduinoState`) que mantiene un reducer interno y dispara reconexión automática si la conexión se cae. Esto significa que el navegador puede quedarse abierto indefinidamente y, si el Arduino o el backend se reinician, el indicador de conexión simplemente cambiará a rojo y volverá a verde sin necesidad de recargar la página.

---

## 9. Solución de problemas frecuentes

Hay cuatro escenarios que tienden a aparecer al armar el proyecto por primera vez, y vale la pena documentarlos para evitar perder tiempo diagnosticando lo que en realidad es trivial. El primero, ya mencionado, es el mensaje `[Errno 16] Resource busy` cuando el backend intenta abrir el puerto serial. La causa casi siempre es que el Serial Monitor del Arduino IDE u otro proceso (incluyendo una sesión anterior del backend que quedó colgada) sigue reteniendo el puerto. La solución es identificar y cerrar ese proceso.

El segundo escenario común es que el encabezado del frontend muestre *Sin conexión* aunque el Arduino esté visiblemente enchufado. En esos casos, ejecutar `curl http://localhost:8000/health` permite saber si el problema está en el backend o en el frontend. Si la respuesta del backend dice `connected: false`, significa que el problema es la apertura del puerto y conviene definir explícitamente `SERIAL_PORT` en el archivo `.env` con la ruta exacta. En macOS, esta ruta se obtiene con `ls /dev/cu.usbmodem*`.

El tercer escenario es que el frontend no reciba eventos aunque el backend reporte `connected: true`. La causa habitual es un problema de proxy o de CORS, y suele resolverse asegurándose de abrir la aplicación en `http://localhost:5173` y no en otra dirección distinta. El `vite.config.ts` está configurado para hacer proxy de `/events`, `/state` y `/health` hacia el puerto 8000, pero esa configuración solo aplica cuando el navegador llega por el puerto 5173.

El cuarto escenario, menos frecuente pero confuso cuando aparece, es que las pantallas de premio y fallo no se muestren a pesar de que la simulación está corriendo. Esto suele indicar que el sketch cargado en el Arduino es una versión antigua, anterior a la incorporación del protocolo `EVT:`. Una forma rápida de confirmarlo es ejecutar `curl http://localhost:8000/events` y verificar que aparezcan líneas como `EVT:WIN` o `EVT:LOSE` cuando ocurren las transiciones correspondientes. Si no aparecen, hay que volver a subir el sketch desde el repositorio.

---

## 10. Créditos y licencia

Este proyecto fue desarrollado como estudio de caso para la asignatura de Arquitectura de Computadores del programa de Ingeniería de Sistemas y Computación de la **Universidad Pedagógica y Tecnológica de Colombia (UPTC)**, sede Tunja. El diseño del autómata, la implementación del firmware, el desarrollo del backend y el frontend, así como toda la documentación, son obra de los tres autores listados al inicio. La canción *"Salió el pollo"* y los logotipos de Ara aparecen únicamente con fines humorísticos y son propiedad de sus respectivos titulares.
