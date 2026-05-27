# ¿Cómo funciona la Caja Fuerte de Patrones?

## Idea general

La Caja Fuerte de Patrones es una máquina interactiva que entrega un premio únicamente si el usuario logra reproducir, dentro de un tiempo límite, una secuencia de pulsaciones que la propia máquina le mostró al inicio de la partida. La secuencia tiene longitud 4 y se construye sobre un alfabeto de cuatro botones de colores. Cada partida genera una secuencia distinta de manera aleatoria, lo que hace que el reto no se pueda "memorizar" entre intentos.

Desde el punto de vista teórico, la máquina implementa un Autómata Finito Determinista (AFD) que reconoce un lenguaje regular formado por una única cadena de longitud cuatro sobre el alfabeto de los cuatro botones. El usuario "pronuncia" la cadena mediante pulsaciones físicas, y la máquina la acepta o la rechaza siguiendo estrictamente las reglas del autómata.

---

## Definición formal del AFD

El autómata se define mediante la quíntupla:

```
M = (Q, Σ, δ, q0, F)
```

donde:

- **Q** = {q0, q1, q2, q3, q4, q5, q6} — siete estados.
- **Σ** = {a, b, c, d, t, r} — alfabeto de entrada:
  - a, b, c, d: pulsaciones de los cuatro botones del usuario.
  - t: evento de tiempo agotado (timeout), generado internamente por el Arduino.
  - r: pulsación del botón de reinicio.
- **q0**: estado inicial (reposo).
- **F** = {q5} — el único estado de aceptación (premio entregado).
- **δ**: función de transición, definida en la siguiente tabla.

### Tabla de transición δ

| Estado | a | b | c | d | t | r |
|---|---|---|---|---|---|---|
| q0 | q1 | q1 | q1 | q1 | — | — |
| q1 | q2 | q6 | q6 | q6 | q6 | — |
| q2 | q6 | q3 | q6 | q6 | q6 | — |
| q3 | q4 | q6 | q6 | q6 | q6 | — |
| q4 | q6 | q6 | q5 | q6 | q6 | — |
| q5 | — | — | — | — | — | q0 |
| q6 | — | — | — | — | — | q0 |

(Tabla mostrada para el patrón fijo `a·b·a·c`. En la versión aleatoria, las celdas se rellenan en tiempo de ejecución según la secuencia generada en cada partida.)

---

## Significado de cada estado

| Estado | Significado |
|---|---|
| q0 | Reposo. El sistema espera la primera pulsación del usuario. |
| q1 | Reto activo, sin símbolos leídos todavía. Se espera el primer símbolo de la secuencia. |
| q2 | Se leyó correctamente el primer símbolo del patrón. |
| q3 | Se leyeron correctamente los dos primeros símbolos del patrón. |
| q4 | Se leyeron correctamente los tres primeros símbolos del patrón. |
| q5 | **Estado de aceptación.** Se completó la secuencia y se entrega el premio. |
| q6 | **Estado trampa.** Cualquier error o tiempo agotado lleva acá. Solo se sale con reinicio. |

Lo importante de este diseño es que **toda la información del juego vive dentro del estado actual**. No hay contadores externos ni variables auxiliares que el AFD necesite para decidir hacia dónde transitar. Esta es la propiedad fundamental que distingue un AFD verdadero de una máquina con memoria extendida, y es lo que hace que el modelo sea estrictamente determinista.

---

## Flujo paso a paso de una partida

### 1. Estado inicial (q0)

La máquina está lógicamente apagada. El motor paso a paso apunta a la posición "Reposo" del tablero de control, todos los LEDs están apagados, y la consola serial muestra el mensaje de bienvenida. El sistema solo está atento a que el usuario presione cualquiera de los cuatro botones de colores.

### 2. Disparo del juego (q0 → q1)

En cuanto el usuario presiona un botón cualquiera, el sistema:

1. Genera aleatoriamente una secuencia de cuatro símbolos sobre el alfabeto {a, b, c, d}.
2. Muestra la secuencia parpadeando los LEDs correspondientes en orden, con una pausa entre cada uno.
3. Transita al estado q1 y arranca el temporizador interno para la primera respuesta.

> **Nota:** la pulsación que inicia la partida solo dispara la generación y muestra del patrón; **no se considera un símbolo del patrón mismo**. El usuario debe reproducir los cuatro símbolos del patrón *después* del disparo, así que cada partida involucra cinco pulsaciones en total (1 disparo + 4 del patrón).

### 3. Fase de evaluación (q1 → q2 → q3 → q4)

El usuario debe presionar los cuatro botones en el orden exacto que se le mostró. Cada acierto avanza un estado; cada estado tiene una única transición de aceptación (el botón correcto) y todas las demás transiciones llevan al estado trampa q6.

### 4. Aceptación (qN → q5)

Si el usuario presiona correctamente los cuatro símbolos en orden, el sistema alcanza el estado q5. Se enciende el LED grande de premio, suena la melodía de victoria en el buzzer, el motor gira hasta la posición "PREMIO" del tablero, y la consola serial registra la entrega del premio. El sistema queda esperando el botón de reinicio para volver a q0.

### 5. Fallo (qN → q6)

Si en algún momento el usuario presiona un botón incorrecto, o si transcurre el tiempo límite (2 segundos por defecto) sin que el usuario presione, el sistema transita al estado q6. Se enciende el LED grande de fallo, suena el tono grave de derrota, el motor gira hasta la posición "FALLO", y el sistema queda bloqueado: ninguna pulsación posterior de los botones de juego tiene efecto. Solo el botón de reinicio reactiva el sistema.

### 6. Reinicio (q5 o q6 → q0)

La pulsación del botón de reinicio devuelve el sistema al estado q0, listo para una nueva partida con una nueva secuencia aleatoria.

---

## Ejemplo concreto de partida

Suponiendo que la secuencia aleatoria generada al inicio sea `b·d·a·c`:

**Partida ganadora:**

```
q0 --[clic botón rojo]--> q1   (inicia el reto, se muestra el patrón "bdac")
q1 --[b]--> q2   (correcto: primer símbolo del patrón)
q2 --[d]--> q3   (correcto: segundo símbolo)
q3 --[a]--> q4   (correcto: tercer símbolo)
q4 --[c]--> q5   ¡PREMIO!
q5 --[r]--> q0   (reinicio)
```

**Partida perdida por error:**

```
q0 --[clic botón verde]--> q1   (inicia el reto, se muestra el patrón "bdac")
q1 --[b]--> q2   (correcto)
q2 --[a]--> q6   (incorrecto: debía ser 'd')    ¡FALLO!
q6 --[r]--> q0   (reinicio)
```

**Partida perdida por timeout:**

```
q0 --[clic botón amarillo]--> q1   (inicia el reto, se muestra "bdac")
q1 --[b]--> q2   (correcto)
q2 --[espera 2 segundos sin presionar]--> q6   (timeout, símbolo 't')   ¡FALLO!
q6 --[r]--> q0   (reinicio)
```

---

## ¿Qué hace cada componente del hardware?

### Arduino UNO

Es el cerebro del sistema. Ejecuta la lógica del AFD, lee los botones, controla los LEDs, mueve el motor paso a paso y envía mensajes a la consola serial. Toda la función de transición δ está implementada como un `switch` anidado en el código.

### Botones (5 en total)

Cuatro botones representan los símbolos del alfabeto del usuario (a, b, c, d), y uno representa el reinicio (r). Internamente se leen con resistencias pull-up del Arduino, lo que simplifica el cableado físico (no se necesitan resistencias externas para los botones).

### LEDs de colores (4 en total)

Cuatro LEDs pequeños con colores **rojo (símbolo a), verde (b), amarillo (c) y azul (d)**. Durante la fase de presentación parpadean en orden mostrando al usuario el patrón que debe reproducir; durante la fase de respuesta permanecen apagados para evitar dar pistas.

### LEDs indicadores de estado (2 en total)

Un **LED grande verde** se enciende cuando el sistema alcanza q5 (premio). Un **LED grande rojo** se enciende cuando alcanza q6 (fallo). Estos LEDs traducen el resultado lógico del AFD en una señal visual inequívoca para el usuario, complementaria a los LEDs pequeños de los símbolos.

### Motor paso a paso (28BYJ-48 + ULN2003)

La aguja del motor gira sobre un tablero de control de cartón que tiene marcadas las siete posiciones correspondientes a los siete estados del AFD. En todo momento la aguja apunta al estado actual, lo que materializa físicamente el comportamiento del autómata. El motor se alimenta de manera externa con la batería de 9 V, mientras que sus señales de control vienen del Arduino.

### Buzzer (opcional)

Reproduce una melodía ascendente cuando se entrega el premio (q5) y un tono grave cuando se llega al fallo (q6). Funciona como retroalimentación auditiva adicional para la sustentación.

### Consola serial

La pantalla del computador, accedida mediante el Serial Monitor del Arduino IDE o Wokwi, muestra en tiempo real el estado actual y cada transición que ocurre, con el formato `Transición: Qx --símbolo--> Qy`. Esto cumple el punto 6 del procedimiento de la guía y permite verificar textualmente el funcionamiento del AFD durante la sustentación.

---

## Justificación del determinismo

Tres propiedades hacen del modelo un AFD estrictamente determinista:

**Función de transición total y unívoca.** Para cada par (estado, símbolo) existe exactamente un estado de destino. La tabla δ no contiene celdas con múltiples opciones ni dependencias de variables externas.

**Memoria contenida en los estados.** El progreso del usuario en la reproducción del patrón está codificado en cuál estado está activo (q1, q2, q3 o q4), no en un contador externo. Esto significa que la máquina "recuerda" lo que ha pasado únicamente a través de su estado actual, condición que define al AFD.

**Estados de aceptación y trampa bien definidos.** El conjunto F = {q5} es único y claramente identificable. El estado q6 es un sumidero clásico: una vez que el AFD entra en él, ningún símbolo del alfabeto principal puede sacarlo, lo que refleja fielmente el comportamiento de un estado trampa en la teoría de autómatas.

---

## ¿Por qué este modelo y no otro?

La opción más común para este tipo de máquinas (juegos de premios) es modelarlas como un sistema con contador de aciertos: cada acierto incrementa un contador, y al llegar a un umbral se entrega el premio. El problema con ese enfoque es que requiere una variable externa al conjunto de estados, lo cual rompe la pureza del AFD y lo convierte en una máquina de estados extendida.

La propuesta de la Caja Fuerte de Patrones aprovecha el hecho de que **los AFD fueron diseñados precisamente para reconocer cadenas sobre un alfabeto**. Al reformular el "reto" como un problema de reconocimiento de cadenas, el AFD se convierte en la herramienta natural y formal para el caso, sin necesidad de contadores ni de extensiones de memoria. El resultado es un modelo que demuestra simultáneamente la teoría de autómatas y su aplicación práctica sobre hardware microcontrolado.
