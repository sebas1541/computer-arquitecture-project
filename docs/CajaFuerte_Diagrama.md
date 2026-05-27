# Diagrama del Circuito — Wokwi

Este archivo contiene el código JSON del diagrama del circuito, listo para pegarse en la pestaña `diagram.json` de un proyecto Wokwi. También incluye la documentación del mapeo de pines y la descripción de los componentes utilizados.

## URL del proyecto en Wokwi

https://wokwi.com/projects/464874868816044033

## Cómo aplicar este diagrama

1. Abrir el proyecto en Wokwi.
2. Hacer clic en la pestaña `diagram.json` (al lado de `sketch.ino`).
3. Reemplazar todo el contenido por el JSON de la sección siguiente.
4. Presionar el botón ▶ Play. Si Wokwi muestra errores de cableado, ajustar los nombres de pines del motor paso a paso (ver notas al final).

## Código JSON del diagrama

```json
{
  "version": 1,
  "author": "Sebastián Cañón · Kevin Jiménez · Luis Hernández",
  "editor": "wokwi",
  "parts": [
    { "type": "wokwi-arduino-uno", "id": "uno", "top": 106.2, "left": -211.8, "attrs": {} },

    { "type": "wokwi-led", "id": "led4", "top": -195.6, "left": -207.4, "attrs": { "color": "red" } },
    { "type": "wokwi-led", "id": "led1", "top": -195.6, "left": -140.2, "attrs": { "color": "green" } },
    { "type": "wokwi-led", "id": "led2", "top": -195.6, "left": -73,    "attrs": { "color": "yellow" } },
    { "type": "wokwi-led", "id": "led5", "top": -195.6, "left": -5.8,   "attrs": { "color": "blue" } },
    { "type": "wokwi-led", "id": "led3", "top": -195.6, "left": 61.4,   "attrs": { "color": "green" } },
    { "type": "wokwi-led", "id": "led6", "top": -195.6, "left": 128.6,  "attrs": { "color": "red" } },

    { "type": "wokwi-resistor", "id": "r1", "top": -43.2, "left": -221.35, "rotate": 90, "attrs": { "value": "220" } },
    { "type": "wokwi-resistor", "id": "r2", "top": -43.2, "left": -144.55, "rotate": 90, "attrs": { "value": "220" } },
    { "type": "wokwi-resistor", "id": "r3", "top": -43.2, "left": -77.35,  "rotate": 90, "attrs": { "value": "220" } },
    { "type": "wokwi-resistor", "id": "r4", "top": -43.2, "left": -10.15,  "rotate": 90, "attrs": { "value": "220" } },
    { "type": "wokwi-resistor", "id": "r5", "top": -43.2, "left": 57.05,   "rotate": 90, "attrs": { "value": "220" } },
    { "type": "wokwi-resistor", "id": "r6", "top": -43.2, "left": 124.25,  "rotate": 90, "attrs": { "value": "220" } },

    { "type": "wokwi-pushbutton", "id": "btnA", "top": 310, "left": -210, "attrs": { "color": "red",    "label": "A" } },
    { "type": "wokwi-pushbutton", "id": "btnB", "top": 310, "left": -140, "attrs": { "color": "yellow", "label": "B" } },
    { "type": "wokwi-pushbutton", "id": "btnC", "top": 310, "left": -70,  "attrs": { "color": "green",  "label": "C" } },
    { "type": "wokwi-pushbutton", "id": "btnD", "top": 310, "left": 0,    "attrs": { "color": "blue",   "label": "D" } },
    { "type": "wokwi-pushbutton", "id": "btnR", "top": 310, "left": 100,  "attrs": { "color": "black",  "label": "R" } },

    { "type": "wokwi-stepper-motor", "id": "stepper1", "top": 80,  "left": 200, "attrs": {} },
    { "type": "wokwi-buzzer",        "id": "buzzer1",  "top": 320, "left": 230, "attrs": {} },

    { "type": "wokwi-gnd", "id": "gnd1", "top": 96, "left": 393, "attrs": {} }
  ],
  "connections": [
    [ "uno:7",  "r1:1",     "red",     [] ],
    [ "r1:2",   "led4:A",   "red",     [] ],
    [ "led4:C", "gnd1:GND", "black",   [] ],

    [ "uno:8",  "r2:1",     "orange",  [] ],
    [ "r2:2",   "led1:A",   "orange",  [] ],
    [ "led1:C", "gnd1:GND", "black",   [] ],

    [ "uno:9",  "r3:1",     "green",   [] ],
    [ "r3:2",   "led2:A",   "green",   [] ],
    [ "led2:C", "gnd1:GND", "black",   [] ],

    [ "uno:10", "r4:1",     "magenta", [] ],
    [ "r4:2",   "led5:A",   "magenta", [] ],
    [ "led5:C", "gnd1:GND", "black",   [] ],

    [ "uno:11", "r5:1",     "blue",    [] ],
    [ "r5:2",   "led3:A",   "blue",    [] ],
    [ "led3:C", "gnd1:GND", "black",   [] ],

    [ "uno:12", "r6:1",     "gold",    [] ],
    [ "r6:2",   "led6:A",   "gold",    [] ],
    [ "led6:C", "gnd1:GND", "black",   [] ],

    [ "uno:2",  "btnA:1.l",  "green",  [] ],
    [ "btnA:2.r", "uno:GND.1", "black", [] ],

    [ "uno:3",  "btnB:1.l",  "green",  [] ],
    [ "btnB:2.r", "uno:GND.1", "black", [] ],

    [ "uno:4",  "btnC:1.l",  "green",  [] ],
    [ "btnC:2.r", "uno:GND.1", "black", [] ],

    [ "uno:5",  "btnD:1.l",  "green",  [] ],
    [ "btnD:2.r", "uno:GND.1", "black", [] ],

    [ "uno:6",  "btnR:1.l",  "gray",   [] ],
    [ "btnR:2.r", "uno:GND.1", "black", [] ],

    [ "uno:A0", "stepper1:A", "purple", [] ],
    [ "uno:A1", "stepper1:B", "purple", [] ],
    [ "uno:A2", "stepper1:C", "purple", [] ],
    [ "uno:A3", "stepper1:D", "purple", [] ],

    [ "uno:13",   "buzzer1:1",  "yellow", [] ],
    [ "buzzer1:2", "uno:GND.1", "black",  [] ],

    [ "uno:GND.2", "gnd1:GND", "black", [] ]
  ],
  "dependencies": {}
}
```

## Mapeo de pines del Arduino UNO

### Pines de entrada (botones)

Todos los botones operan en modo `INPUT_PULLUP`, lo que significa que el Arduino activa una resistencia pull-up interna de aproximadamente 20 kΩ. Cuando el botón está suelto, el pin lee `HIGH`; cuando está presionado, lee `LOW`.

| Pin | Componente | Símbolo del AFD | Función |
|---|---|---|---|
| D2 | btnA | a | Primer botón de juego |
| D3 | btnB | b | Segundo botón de juego |
| D4 | btnC | c | Tercer botón de juego |
| D5 | btnD | d | Cuarto botón de juego |
| D6 | btnR | r | Botón de reinicio |

### Pines de salida (LEDs)

Cada LED se conecta a través de una resistencia de 220 Ω para limitar la corriente.

| Pin | Componente | Color asignado | Función |
|---|---|---|---|
| D7 | led4 | rojo | Símbolo `a` (parpadea al mostrar el patrón) |
| D8 | led1 | verde | Símbolo `b` (parpadea al mostrar el patrón) |
| D9 | led2 | amarillo | Símbolo `c` (parpadea al mostrar el patrón) |
| D10 | led5 | azul | Símbolo `d` (parpadea al mostrar el patrón) |
| D11 | led3 | verde (grande) | Indicador de PREMIO (estado q5) |
| D12 | led6 | rojo (grande) | Indicador de FALLO (estado q6) |

### Pines del motor paso a paso

Las cuatro salidas digitales analógicas (usadas como digitales) controlan las bobinas del motor 28BYJ-48 a través del driver ULN2003.

| Pin | Bobina del motor |
|---|---|
| A0 | IN1 (bobina A) |
| A1 | IN2 (bobina B) |
| A2 | IN3 (bobina C) |
| A3 | IN4 (bobina D) |

### Buzzer y alimentación

| Pin | Componente |
|---|---|
| D13 | Buzzer |
| 5V | Alimentación lógica del driver ULN2003 (en Wokwi se omite) |
| GND.1 | Tierra común para botones y buzzer |
| GND.2 | Tierra del símbolo gnd1 (común con la del Arduino) |

## Componentes presentes en el diagrama

| ID | Tipo | Descripción |
|---|---|---|
| uno | wokwi-arduino-uno | Microcontrolador Arduino UNO R3 |
| led1 a led6 | wokwi-led | LEDs de colores con anodo (A) y cátodo (C) |
| r1 a r6 | wokwi-resistor | Resistencias de 220 Ω en serie con cada LED |
| btnA a btnR | wokwi-pushbutton | Pulsadores momentáneos de 4 patas |
| stepper1 | wokwi-stepper-motor | Motor paso a paso de cuatro fases |
| buzzer1 | wokwi-buzzer | Buzzer piezoeléctrico para realimentación auditiva |
| gnd1 | wokwi-gnd | Símbolo de tierra común para las conexiones de los LEDs |

## Notas para resolución de problemas

**Si el motor no se conecta en Wokwi:** algunos componentes `wokwi-stepper-motor` usan nombres de pines distintos a los que aparecen en este JSON. Si Wokwi marca error en las líneas que conectan `stepper1:A`, `stepper1:B`, `stepper1:C`, `stepper1:D`, abrir el componente en el canvas y revisar los nombres reales de los pines. Las variantes más comunes son: `A+`, `A-`, `B+`, `B-` (configuración bipolar) o `IN1`, `IN2`, `IN3`, `IN4` (configuración con driver integrado). Reemplazar los cuatro nombres en las conexiones correspondientes.

**Si un LED no enciende:** verificar que la resistencia esté en serie y no en paralelo, y que el cátodo (C) del LED esté conectado a tierra. La polaridad importa: si el LED está al revés, no enciende pero tampoco se daña (no hay corriente en sentido inverso a estos niveles).

**Si un botón no responde:** asegurarse de que las dos conexiones sean a patas diagonalmente opuestas del pulsador (por ejemplo, `1.l` y `2.r`). Si se conectan dos patas de la misma columna (`1.l` y `2.l`, o `1.r` y `2.r`), el botón se comporta como un cortocircuito permanente, lo cual genera lecturas erráticas.

**Si todos los componentes se ven sobrepuestos:** las coordenadas del JSON pueden tener decimales que Wokwi interpreta distinto. Si se reorganizan visualmente los componentes en el canvas, Wokwi actualizará automáticamente las coordenadas en el JSON.

## Mapeo Wokwi → hardware físico

El componente `wokwi-stepper-motor` de Wokwi simula directamente el conjunto `28BYJ-48 + ULN2003`. Esto significa que el mismo cableado lógico que se usa en el simulador (A0-A3 hacia los cuatro pines IN del motor) se replica idénticamente en el hardware físico:

- Wokwi `stepper1:A` ↔ Físico ULN2003 `IN1` ↔ Arduino `A0`
- Wokwi `stepper1:B` ↔ Físico ULN2003 `IN2` ↔ Arduino `A1`
- Wokwi `stepper1:C` ↔ Físico ULN2003 `IN3` ↔ Arduino `A2`
- Wokwi `stepper1:D` ↔ Físico ULN2003 `IN4` ↔ Arduino `A3`

La única diferencia en el hardware físico es que el driver ULN2003 requiere alimentación externa (entradas `+` y `−` del driver conectadas a la batería de 9 V), mientras que en Wokwi la alimentación es virtual y no se cablea.
