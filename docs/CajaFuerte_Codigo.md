# Código Arduino — Caja Fuerte de Patrones

Este archivo contiene el sketch completo en C++ (Arduino) que implementa el Autómata Finito Determinista de la Caja Fuerte de Patrones. El código está pensado para ser copiado tal cual en el Arduino IDE o en Wokwi, sin modificaciones, y funciona tanto sobre el hardware físico (Arduino UNO + 28BYJ-48 + ULN2003) como sobre el simulador.

El sketch real listo para abrir en el IDE se encuentra en [CajaFuertePatrones/CajaFuertePatrones.ino](CajaFuertePatrones/CajaFuertePatrones.ino).

## Dependencias

El sketch usa únicamente la librería `Stepper.h`, que viene preinstalada con el Arduino IDE y con Wokwi. No se requieren librerías adicionales.

## Configuración del Serial Monitor

- **Velocidad:** 9600 baudios.
- **Final de línea:** Newline (NL) recomendado, aunque el código no espera entrada por consola.

## Protocolo serial (mensajes EVT:)

El sketch emite dos tipos de salida por el puerto serial:

1. **Mensajes legibles** para el Serial Monitor humano (`>>> Q1 — Esperando...`, `Transición: Q1 --a--> Q2`, etc.).
2. **Mensajes estructurados** con prefijo `EVT:` que el backend FastAPI consume para alimentar el frontend en vivo:

| Evento | Cuándo se emite | Significado |
|---|---|---|
| `EVT:STATE:Qx` | Al inicio y en cada cambio de estado | Estado actual del AFD |
| `EVT:PATTERN:xxxx` | Al iniciar una nueva partida (Q0 → Q1) | Secuencia objetivo de 4 caracteres |
| `EVT:INPUT:x` | En cada flanco de pulsación de botón | Símbolo consumido por el AFD |
| `EVT:TIMEOUT` | Cuando expira el temporizador de 8 s | Equivale al símbolo `t` |
| `EVT:WIN` | Al entrar a Q5 | Partida ganada |
| `EVT:LOSE` | Al entrar a Q6 | Partida perdida |
| `EVT:RESET` | Al volver a Q0 desde Q5 o Q6 | Sistema listo para nueva partida |

Las líneas `EVT:` aparecen intercaladas con las legibles; el backend simplemente filtra las que empiezan por `EVT:` y descarta el resto.

## Código fuente completo

```cpp
/* ============================================================
   CAJA FUERTE DE PATRONES — Implementación del AFD en Arduino UNO
   Estudio de Caso: Arquitectura de Computadores — UPTC
   Sebastián Cañón · Kevin Jiménez · Luis Enrique Hernández
   ------------------------------------------------------------
   AFD:  M = (Q, Σ, δ, q0, F)
   Q  = {Q0, Q1, Q2, Q3, Q4, Q5, Q6}
   Σ  = {a, b, c, d, t, r}
   F  = {Q5}
   El patrón objetivo se genera aleatoriamente al inicio de cada
   partida (longitud 4 sobre el alfabeto {a, b, c, d}).
   ============================================================ */

#include <Stepper.h>

/* ---------- ASIGNACIÓN DE PINES ---------- */
const int PIN_BTN_A = 2;          // símbolo 'a'
const int PIN_BTN_B = 3;          // símbolo 'b'
const int PIN_BTN_C = 4;          // símbolo 'c'
const int PIN_BTN_D = 5;          // símbolo 'd'
const int PIN_BTN_R = 6;          // símbolo 'r' (reset)

const int PIN_LED_A = 7;          // LED rojo     (a)
const int PIN_LED_B = 8;          // LED verde    (b)
const int PIN_LED_C = 9;          // LED amarillo (c)
const int PIN_LED_D = 10;         // LED azul     (d)
const int PIN_LED_PREMIO = 11;    // LED grande verde (Q5)
const int PIN_LED_FALLO  = 12;    // LED grande rojo  (Q6)
const int PIN_BUZZER     = 13;    // Pin 13 comparte el LED interno: parpadea con cada tone(), inofensivo.

const int PIN_STEP_IN1 = A0;
const int PIN_STEP_IN2 = A1;
const int PIN_STEP_IN3 = A2;
const int PIN_STEP_IN4 = A3;

/* ---------- CONSTANTES DE OPERACIÓN ---------- */
const int  PASOS_POR_VUELTA   = 2048;
const int  N_ESTADOS          = 7;
const int  PASOS_POR_ESTADO   = PASOS_POR_VUELTA / N_ESTADOS;  // ≈ 292
const int  LONGITUD_PATRON    = 4;
const unsigned long TIMEOUT_MS    = 8000;
const unsigned long DEBOUNCE_MS   = 40;
const unsigned long FLASH_LED_MS  = 500;
const unsigned long PAUSA_LED_MS  = 200;
const int  VELOCIDAD_MOTOR_RPM    = 12;

/* ---------- TIPOS ---------- */
enum Simbolo { SIM_A=0, SIM_B=1, SIM_C=2, SIM_D=3, SIM_T=4, SIM_R=5, SIM_NONE=6 };
enum Estado  { Q0=0, Q1=1, Q2=2, Q3=3, Q4=4, Q5=5, Q6=6 };

/* ---------- ESTADO GLOBAL ---------- */
Stepper motor(PASOS_POR_VUELTA, PIN_STEP_IN1, PIN_STEP_IN3, PIN_STEP_IN2, PIN_STEP_IN4);

Estado estadoActual    = Q0;
int    posicionMotor   = 0;
int    patron[LONGITUD_PATRON];
unsigned long tiempoEsperaInicio = 0;
bool   temporizadorActivo = false;

bool prevA = HIGH, prevB = HIGH, prevC = HIGH, prevD = HIGH, prevR = HIGH;
unsigned long ultimaPulsacionMs = 0;

/* ============================================================ */
void setup() {
  Serial.begin(9600);
  pinMode(PIN_BTN_A, INPUT_PULLUP); pinMode(PIN_BTN_B, INPUT_PULLUP);
  pinMode(PIN_BTN_C, INPUT_PULLUP); pinMode(PIN_BTN_D, INPUT_PULLUP);
  pinMode(PIN_BTN_R, INPUT_PULLUP);
  pinMode(PIN_LED_A, OUTPUT); pinMode(PIN_LED_B, OUTPUT);
  pinMode(PIN_LED_C, OUTPUT); pinMode(PIN_LED_D, OUTPUT);
  pinMode(PIN_LED_PREMIO, OUTPUT); pinMode(PIN_LED_FALLO, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  motor.setSpeed(VELOCIDAD_MOTOR_RPM);
  randomSeed(analogRead(A5));
  Serial.println(F("Estado inicial: Q0 (Reposo)"));
  Serial.println(F("EVT:STATE:Q0"));
}

void loop() {
  Simbolo entrada = leerEntrada();
  if (entrada != SIM_NONE) aplicarTransicion(entrada);
}

Simbolo leerEntrada() {
  if (temporizadorActivo && (millis() - tiempoEsperaInicio > TIMEOUT_MS)) {
    temporizadorActivo = false;
    Serial.println(F("EVT:TIMEOUT"));
    return SIM_T;
  }
  if (millis() - ultimaPulsacionMs < DEBOUNCE_MS) return SIM_NONE;
  bool curA = digitalRead(PIN_BTN_A);
  bool curB = digitalRead(PIN_BTN_B);
  bool curC = digitalRead(PIN_BTN_C);
  bool curD = digitalRead(PIN_BTN_D);
  bool curR = digitalRead(PIN_BTN_R);
  Simbolo s = SIM_NONE;
  if      (prevA == HIGH && curA == LOW) s = SIM_A;
  else if (prevB == HIGH && curB == LOW) s = SIM_B;
  else if (prevC == HIGH && curC == LOW) s = SIM_C;
  else if (prevD == HIGH && curD == LOW) s = SIM_D;
  else if (prevR == HIGH && curR == LOW) s = SIM_R;
  prevA = curA; prevB = curB; prevC = curC; prevD = curD; prevR = curR;
  if (s != SIM_NONE) {
    ultimaPulsacionMs = millis();
    Serial.print(F("EVT:INPUT:"));
    Serial.println(simboloAChar(s));
  }
  return s;
}

void aplicarTransicion(Simbolo sim) {
  Estado siguiente = estadoActual;
  switch (estadoActual) {
    case Q0:
      // La pulsación de disparo solo arranca el reto: no se consume como
      // primer símbolo del patrón.
      if (sim == SIM_A || sim == SIM_B || sim == SIM_C || sim == SIM_D) {
        generarPatron();
        mostrarPatron();
        siguiente = Q1;
      }
      break;
    case Q1: siguiente = (sim==SIM_R) ? Q1 : (((int)sim==patron[0]) ? Q2 : Q6); break;
    case Q2: siguiente = (sim==SIM_R) ? Q2 : (((int)sim==patron[1]) ? Q3 : Q6); break;
    case Q3: siguiente = (sim==SIM_R) ? Q3 : (((int)sim==patron[2]) ? Q4 : Q6); break;
    case Q4: siguiente = (sim==SIM_R) ? Q4 : (((int)sim==patron[3]) ? Q5 : Q6); break;
    case Q5: case Q6:
      if (sim == SIM_R) siguiente = Q0;
      break;
  }
  if (siguiente != estadoActual) {
    estadoActual = siguiente;
    // Motor primero, temporizador después: así el usuario tiene los 8 s íntegros.
    moverMotorAEstado(siguiente);
    actualizarSalidas();
    emitirEventoEstado(siguiente);
  }
}

void actualizarSalidas() {
  digitalWrite(PIN_LED_PREMIO, LOW);
  digitalWrite(PIN_LED_FALLO,  LOW);
  switch (estadoActual) {
    case Q0:
      temporizadorActivo = false;
      break;
    case Q1: case Q2: case Q3: case Q4:
      tiempoEsperaInicio = millis();
      temporizadorActivo = true;
      break;
    case Q5:
      temporizadorActivo = false;
      digitalWrite(PIN_LED_PREMIO, HIGH);
      sonidoPremio();
      break;
    case Q6:
      temporizadorActivo = false;
      digitalWrite(PIN_LED_FALLO, HIGH);
      sonidoFallo();
      break;
  }
}

void emitirEventoEstado(Estado e) {
  Serial.print(F("EVT:STATE:"));
  Serial.println(nombreEstado(e));
  if      (e == Q5) Serial.println(F("EVT:WIN"));
  else if (e == Q6) Serial.println(F("EVT:LOSE"));
  else if (e == Q0) Serial.println(F("EVT:RESET"));
}

void generarPatron() {
  char buf[LONGITUD_PATRON + 1];
  for (int i = 0; i < LONGITUD_PATRON; i++) {
    patron[i] = random(0, 4);
    buf[i] = simboloAChar((Simbolo)patron[i]);
  }
  buf[LONGITUD_PATRON] = '\0';
  Serial.print(F("EVT:PATTERN:"));
  Serial.println(buf);
}

void mostrarPatron() {
  delay(400);
  for (int i = 0; i < LONGITUD_PATRON; i++) {
    int pin = pinLEDDeSimbolo((Simbolo)patron[i]);
    digitalWrite(pin, HIGH);
    delay(FLASH_LED_MS);
    digitalWrite(pin, LOW);
    delay(PAUSA_LED_MS);
  }
  prevA = digitalRead(PIN_BTN_A); prevB = digitalRead(PIN_BTN_B);
  prevC = digitalRead(PIN_BTN_C); prevD = digitalRead(PIN_BTN_D);
  prevR = digitalRead(PIN_BTN_R);
  ultimaPulsacionMs = millis();
}

void moverMotorAEstado(Estado destino) {
  int diferencia = (int)destino - posicionMotor;
  if (diferencia != 0) motor.step(diferencia * PASOS_POR_ESTADO);
  posicionMotor = (int)destino;
}

void sonidoPremio() {
  tone(PIN_BUZZER,  880, 180); delay(200);
  tone(PIN_BUZZER, 1175, 180); delay(200);
  tone(PIN_BUZZER, 1568, 300); delay(320);
}

void sonidoFallo() {
  tone(PIN_BUZZER, 220, 400); delay(420);
  tone(PIN_BUZZER, 150, 500); delay(520);
}

char simboloAChar(Simbolo s) {
  switch (s) {
    case SIM_A: return 'a'; case SIM_B: return 'b';
    case SIM_C: return 'c'; case SIM_D: return 'd';
    case SIM_T: return 't'; case SIM_R: return 'r';
    default:    return '?';
  }
}

int pinLEDDeSimbolo(Simbolo s) {
  switch (s) {
    case SIM_A: return PIN_LED_A; case SIM_B: return PIN_LED_B;
    case SIM_C: return PIN_LED_C; case SIM_D: return PIN_LED_D;
    default:    return -1;
  }
}

const char* nombreEstado(Estado e) {
  switch (e) {
    case Q0: return "Q0"; case Q1: return "Q1"; case Q2: return "Q2";
    case Q3: return "Q3"; case Q4: return "Q4"; case Q5: return "Q5";
    case Q6: return "Q6"; default: return "??";
  }
}
```

> El bloque anterior es una versión condensada para lectura humana. La versión completa, con comentarios extendidos y mensajes legibles para el Serial Monitor, está en [CajaFuertePatrones/CajaFuertePatrones.ino](CajaFuertePatrones/CajaFuertePatrones.ino).

## Estructura del código por secciones

**Asignación de pines.** Constantes `PIN_*` que mapean cada componente físico a un pin. Cambiar el cableado solo requiere modificar estas constantes.

**Constantes de operación.** Parámetros configurables: timeout por pulsación, velocidad del motor, longitud del patrón, número de estados.

**Tipos enumerados.** `Simbolo` y `Estado` representan el alfabeto Σ y el conjunto Q del AFD. Usar enums en lugar de números mágicos hace el código autodocumentado.

**setup().** Configura pines, inicializa el motor, abre el Serial a 9600 baudios y siembra el generador aleatorio con ruido del pin A5.

**loop().** Lee una entrada y aplica la transición. Toda la complejidad está encapsulada en `leerEntrada()` y `aplicarTransicion()`.

**leerEntrada().** Combina dos fuentes de entrada en un solo `Simbolo`: pulsaciones físicas con detección por flanco, y el timeout de 8 s.

**aplicarTransicion().** Implementación directa de la función δ. Un `switch(estadoActual)` con la lógica de cada estado. Mueve el motor antes de arrancar el temporizador para no perder tiempo útil. Al final emite los eventos `EVT:` que consume el backend.

**actualizarSalidas().** Tras cada transición, ajusta LEDs y temporizador según el nuevo estado.

**generarPatron() y mostrarPatron().** Producen la secuencia aleatoria y la presentan parpadeando los LEDs en orden. `mostrarPatron()` re-lee los botones al final para evitar que una pulsación todavía mantenida cuente como el primer símbolo.

**moverMotorAEstado().** Calcula la diferencia entre el estado destino y la posición actual de la aguja, y mueve el motor exactamente los pasos necesarios.

**sonidoPremio() y sonidoFallo().** Generan tonos diferenciados para retroalimentación auditiva con la función `tone()`.

**emitirEventoEstado().** Imprime las líneas `EVT:STATE:Qx`, `EVT:WIN`, `EVT:LOSE` o `EVT:RESET` que consume el backend.

**Utilidades.** Conversiones entre enums, caracteres y pines. Se usan principalmente en los mensajes de log.
