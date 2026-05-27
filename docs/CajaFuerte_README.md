# Caja Fuerte de Patrones — Estudio de Caso AFD

**Asignatura:** Arquitectura de Computadores
**Programa:** Ingeniería de Sistemas y Computación
**Universidad:** Universidad Pedagógica y Tecnológica de Colombia (UPTC)

**Autores:**
- Sebastián Cañón Castellanos
- Kevin Jiménez Poveda
- Luis Enrique Hernández

---

## Descripción breve

Implementación física, sobre Arduino UNO, de un Autómata Finito Determinista (AFD) que reconoce una secuencia de pulsaciones generada aleatoriamente al inicio de cada partida. El usuario debe reproducir esa secuencia, dentro de un tiempo límite por pulsación, para alcanzar el estado de aceptación y obtener un premio. Cualquier error o tiempo agotado lleva al sistema a un estado trampa del cual solo se sale mediante reinicio.

El sistema cumple los seis puntos del procedimiento de la guía: análisis y documentación del proceso, implementación de la lógica del AFD en Arduino, diseño de un tablero de control con motor paso a paso, prototipo en protoboard con LEDs indicadores, y visualización del estado lógico en la consola serial del computador.

---

## Estructura de archivos del proyecto

| Archivo | Contenido |
|---|---|
| `CajaFuerte_README.md` | Este archivo — índice y resumen. |
| `CajaFuerte_ComoFunciona.md` | Explicación completa del funcionamiento del juego y del AFD. |
| `CajaFuerte_Codigo.md` | Código fuente en C++ para Arduino, con explicación. |
| `CajaFuerte_Diagrama.md` | Código JSON del diagrama de Wokwi, con mapeo de pines. |
| `CajaFuertePatrones/CajaFuertePatrones.ino` | Sketch de Arduino listo para abrir en el IDE. |
| `CajaFuertePatrones/backend/` | API en Python (FastAPI + pyserial) que escucha el Arduino por USB. |
| `CajaFuertePatrones/frontend/` | Frontend en React (Vite) con tablero de estado en vivo y pantallas de premio/fallo. |
| `CajaFuertePatrones/README.md` | Instrucciones para correr el backend y frontend en paralelo. |

---

## Hardware requerido

| Componente | Cantidad | Costo aprox. (COP) |
|---|---|---|
| Arduino UNO (provisto por el laboratorio) | 1 | — |
| Protoboard (provista por el laboratorio) | 1 | — |
| Motor paso a paso 28BYJ-48 + driver ULN2003 | 1 | $20.000 |
| Batería de 9 V + adaptador | 1 | $8.000 |
| LEDs de colores (rojo, verde, amarillo, azul, más 2 indicadores) | 6 | $3.000 |
| Pulsadores (botones) | 5 | $4.000 |
| Resistencias de 220 Ω | 6 | $2.000 |
| Jumpers (cables de conexión) | varios | $8.000 |
| Buzzer (opcional) | 1 | $2.000 |
| **Total** | | **~$47.000** |

---

## Plataforma de simulación

El proyecto está montado en **Wokwi** (https://wokwi.com), simulador en línea que ofrece el componente `28BYJ-48 + ULN2003` nativo, idéntico al hardware físico que se va a comprar. Esto permite que el mismo código corra sin modificaciones en el simulador y en el prototipo físico final.

URL del proyecto: https://wokwi.com/projects/464874868816044033

---

## Inicio rápido (solo Arduino)

1. Abrir el sketch `CajaFuertePatrones/CajaFuertePatrones.ino` en el Arduino IDE (o copiarlo en Wokwi).
2. Verificar que la librería `Stepper.h` esté disponible (viene preinstalada con el IDE).
3. Para hardware físico: cablear según la tabla de pines de `CajaFuerte_Diagrama.md`.
4. Para Wokwi: pegar el contenido del JSON de `CajaFuerte_Diagrama.md` en la pestaña `diagram.json`.
5. Compilar y subir (o presionar ▶ Play en Wokwi).
6. Abrir el **Serial Monitor** a 9600 baudios.
7. Presionar cualquier botón A/B/C/D para iniciar la primera partida.

## Inicio rápido (con tablero web en vivo)

Si quiere visualizar el AFD en una pantalla con animaciones de premio y fallo, además del Arduino:

1. Conectar el Arduino físico por USB y subir el sketch.
2. **Cerrar el Serial Monitor** (solo un proceso puede leer el puerto).
3. Arrancar el backend Python y el frontend React siguiendo las instrucciones de [CajaFuertePatrones/README.md](CajaFuertePatrones/README.md).
4. Abrir `http://localhost:5173` en el navegador y jugar desde el Arduino.
