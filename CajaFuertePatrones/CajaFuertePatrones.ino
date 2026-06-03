/* ============================================================
   CAJA FUERTE DE PATRONES — Implementación final del AFD
   Estudio de Caso: Arquitectura de Computadores — UPTC
   Sebastián Cañón · Kevin Jiménez · Luis Enrique Hernández
   ------------------------------------------------------------
   AFD:  M = (Q, Σ, δ, q0, F)
   Q  = {Q0, Q1, Q2, Q3, Q4, Q5, Q6}
   Σ  = {a, b, c, d, t, r}
   F  = {Q5}
   ------------------------------------------------------------
   Funcionamiento:
     - El sistema genera aleatoriamente un patrón de 4 símbolos
       sobre el alfabeto {a, b, c, d} al inicio de cada partida.
     - El usuario debe reproducirlo en orden. Cada acierto avanza
       un estado; cualquier error o timeout lleva al estado trampa.
     - Estado de premio (Q5) y estado de fallo (Q6) retornan a Q0
       presionando el botón Reset, o automáticamente tras 5 s.
   ------------------------------------------------------------
   Mejoras respecto a la versión base:
     1. El motor se mueve ANTES de arrancar el temporizador, así
        el usuario aprovecha los 8 s íntegros del TIMEOUT_MS.
     2. Motor a 12 RPM (más ágil, dentro del límite del 28BYJ-48).
     3. Auto-reset: 31 s en Q5 (deja sonar la canción de Ara hasta el final)
        y 5 s en Q6 (vuelve rápido al juego tras un fallo).
     4. Protocolo de eventos EVT: para integración opcional con
        backend Python / dashboard React.
     5. Al arrancar la aguja queda en Q0 sin girar (no hay test
        de motor inicial — el motor se mueve solo en transiciones).
   ============================================================ */

#include <Stepper.h>

/* ---------- ASIGNACIÓN DE PINES ---------- */
const int PIN_BTN_A = 2;          // símbolo 'a'
const int PIN_BTN_B = 3;          // símbolo 'b'
const int PIN_BTN_C = 4;          // símbolo 'c'
const int PIN_BTN_D = 5;          // símbolo 'd'
const int PIN_BTN_R = 6;          // símbolo 'r' (reset)

const int PIN_LED_A = 7;          // LED rojo     (símbolo a)
const int PIN_LED_B = 8;          // LED verde    (símbolo b)
const int PIN_LED_C = 9;          // LED amarillo (símbolo c)
const int PIN_LED_D = 10;         // LED azul     (símbolo d)
const int PIN_LED_PREMIO = 11;    // LED grande verde (Q5)
const int PIN_LED_FALLO  = 12;    // LED grande rojo  (Q6)
const int PIN_BUZZER     = 13;    // Buzzer (pasivo). Pin 13 comparte el LED interno: parpadea con tone(), inofensivo.

const int PIN_STEP_IN1 = A0;
const int PIN_STEP_IN2 = A1;
const int PIN_STEP_IN3 = A2;
const int PIN_STEP_IN4 = A3;

/* ---------- CONSTANTES DE OPERACIÓN ---------- */
const int  PASOS_POR_VUELTA   = 2048;                    // 28BYJ-48 (full step)
const int  N_ESTADOS          = 7;
const int  PASOS_POR_ESTADO   = PASOS_POR_VUELTA / N_ESTADOS;  // ≈ 292
const int  LONGITUD_PATRON    = 4;
const unsigned long TIMEOUT_MS    = 8000;   // tiempo máximo por pulsación (antes 2000: demasiado corto)
const unsigned long DEBOUNCE_MS   = 40;
const unsigned long FLASH_LED_MS  = 500;    // duración del parpadeo al mostrar patrón
const unsigned long PAUSA_LED_MS  = 200;    // pausa entre LEDs al mostrar patrón
const unsigned long AUTORESET_WIN_MS  = 31000;  // Q5: 31s para que termine la canción de Ara
const unsigned long AUTORESET_LOSE_MS = 5000;   // Q6: 5s al fallo
const int  VELOCIDAD_MOTOR_RPM    = 12;

/* ---------- TIPOS ---------- */
enum Simbolo {
  SIM_A = 0, SIM_B = 1, SIM_C = 2, SIM_D = 3,
  SIM_T = 4, SIM_R = 5, SIM_NONE = 6
};

enum Estado {
  Q0 = 0, Q1 = 1, Q2 = 2, Q3 = 3, Q4 = 4, Q5 = 5, Q6 = 6
};

/* ---------- ESTADO GLOBAL ---------- */
// Orden IN1, IN3, IN2, IN4 — necesario para que el 28BYJ-48 gire
// en el sentido correcto con la librería Stepper.h estándar.
Stepper motor(PASOS_POR_VUELTA, PIN_STEP_IN1, PIN_STEP_IN3, PIN_STEP_IN2, PIN_STEP_IN4);

Estado estadoActual    = Q0;
int    posicionMotor   = 0;                 // estado al que apunta físicamente la aguja
int    patron[LONGITUD_PATRON];             // secuencia objetivo de cada partida
unsigned long tiempoEsperaInicio = 0;
unsigned long tiempoAutoreset    = 0;
bool   temporizadorActivo = false;

// Estados anteriores de los botones (detección por flanco)
bool prevA = HIGH, prevB = HIGH, prevC = HIGH, prevD = HIGH, prevR = HIGH;
unsigned long ultimaPulsacionMs = 0;

/* ============================================================
   SETUP
   ============================================================ */
void setup() {
  Serial.begin(9600);

  pinMode(PIN_BTN_A, INPUT_PULLUP);
  pinMode(PIN_BTN_B, INPUT_PULLUP);
  pinMode(PIN_BTN_C, INPUT_PULLUP);
  pinMode(PIN_BTN_D, INPUT_PULLUP);
  pinMode(PIN_BTN_R, INPUT_PULLUP);

  pinMode(PIN_LED_A, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  pinMode(PIN_LED_C, OUTPUT);
  pinMode(PIN_LED_D, OUTPUT);
  pinMode(PIN_LED_PREMIO, OUTPUT);
  pinMode(PIN_LED_FALLO,  OUTPUT);
  pinMode(PIN_BUZZER,     OUTPUT);

  motor.setSpeed(VELOCIDAD_MOTOR_RPM);

  // Semilla aleatoria a partir de ruido analógico del pin A5 (sin conectar)
  randomSeed(analogRead(A5));

  Serial.println(F("============================================"));
  Serial.println(F("   CAJA FUERTE DE PATRONES — AFD en Arduino "));
  Serial.println(F("============================================"));
  Serial.println(F("Estado inicial: Q0 (Reposo)"));
  Serial.println(F("Presione cualquier botón A/B/C/D para iniciar."));
  Serial.println();
  Serial.println(F("EVT:STATE:Q0"));
}

/* ============================================================
   LOOP PRINCIPAL
   ============================================================ */
void loop() {
  Simbolo entrada = leerEntrada();
  if (entrada != SIM_NONE) {
    aplicarTransicion(entrada);
  }
}

/* ============================================================
   LECTURA DE ENTRADAS (botones + timeout + auto-reset)
   ============================================================ */
Simbolo leerEntrada() {
  // 1) Auto-reset en Q5/Q6 — ventana distinta para premio vs fallo
  if (estadoActual == Q5 && (millis() - tiempoAutoreset > AUTORESET_WIN_MS)) {
    tiempoAutoreset = millis();
    Serial.println(F("[i] Auto-reset por timeout en Q5 (premio)"));
    return SIM_R;
  }
  if (estadoActual == Q6 && (millis() - tiempoAutoreset > AUTORESET_LOSE_MS)) {
    tiempoAutoreset = millis();
    Serial.println(F("[i] Auto-reset por timeout en Q6 (fallo)"));
    return SIM_R;
  }

  // En Q5, el botón Reset físico se ignora hasta que termine la canción.
  // (La autoreset se encarga después de AUTORESET_WIN_MS.)
  if (estadoActual == Q5 && (millis() - tiempoAutoreset <= AUTORESET_WIN_MS)) {
    // Drenar entradas: leer flancos pero NO retornarlos como símbolos
    bool curA = digitalRead(PIN_BTN_A);
    bool curB = digitalRead(PIN_BTN_B);
    bool curC = digitalRead(PIN_BTN_C);
    bool curD = digitalRead(PIN_BTN_D);
    bool curR = digitalRead(PIN_BTN_R);
    prevA = curA; prevB = curB; prevC = curC; prevD = curD; prevR = curR;
    return SIM_NONE;
  }

  // 2) Timeout durante la fase de juego
  if (temporizadorActivo && (millis() - tiempoEsperaInicio > TIMEOUT_MS)) {
    temporizadorActivo = false;
    Serial.println(F("[!] Tiempo agotado — símbolo 't'"));
    Serial.println(F("EVT:TIMEOUT"));
    return SIM_T;
  }

  // 3) Debounce global
  if (millis() - ultimaPulsacionMs < DEBOUNCE_MS) return SIM_NONE;

  // 4) Detección de flanco (HIGH -> LOW) en los 5 botones
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

/* ============================================================
   FUNCIÓN DE TRANSICIÓN δ
   ============================================================ */
void aplicarTransicion(Simbolo sim) {
  Estado siguiente = estadoActual;

  // --- Feedback visual del turno del usuario ---
  // Al pulsar a/b/c/d durante Q1-Q4 (fase de repetir el patrón) se ilumina
  // el LED de ese símbolo. Permanece encendido mientras se procesa la
  // transición (incluido el giro del motor) y se apaga al final.
  int ledPulsado = -1;
  bool enTurnoUsuario = (estadoActual == Q1 || estadoActual == Q2 ||
                         estadoActual == Q3 || estadoActual == Q4);
  if (enTurnoUsuario &&
      (sim == SIM_A || sim == SIM_B || sim == SIM_C || sim == SIM_D)) {
    ledPulsado = pinLEDDeSimbolo(sim);
    if (ledPulsado != -1) digitalWrite(ledPulsado, HIGH);
  }

  switch (estadoActual) {
    case Q0:
      // La pulsación de disparo solo arranca el reto: NO se consume
      // como primer símbolo del patrón. El usuario debe reproducir
      // los 4 símbolos del patrón DESPUÉS de este disparo.
      if (sim == SIM_A || sim == SIM_B || sim == SIM_C || sim == SIM_D) {
        generarPatron();
        mostrarPatron();
        siguiente = Q1;
      }
      break;

    case Q1:
      if (sim == SIM_R)               siguiente = Q1;     // ignorar reset durante juego
      else if ((int)sim == patron[0]) siguiente = Q2;
      else                            siguiente = Q6;
      break;

    case Q2:
      if (sim == SIM_R)               siguiente = Q2;
      else if ((int)sim == patron[1]) siguiente = Q3;
      else                            siguiente = Q6;
      break;

    case Q3:
      if (sim == SIM_R)               siguiente = Q3;
      else if ((int)sim == patron[2]) siguiente = Q4;
      else                            siguiente = Q6;
      break;

    case Q4:
      if (sim == SIM_R)               siguiente = Q4;
      else if ((int)sim == patron[3]) siguiente = Q5;
      else                            siguiente = Q6;
      break;

    case Q5:
    case Q6:
      if (sim == SIM_R) siguiente = Q0;
      // Cualquier otro símbolo se ignora — Q6 es estado trampa hasta el reset
      break;
  }

  if (siguiente != estadoActual) {
    Serial.print(F("Transición: "));
    Serial.print(nombreEstado(estadoActual));
    Serial.print(F(" --"));
    Serial.print(simboloAChar(sim));
    Serial.print(F("--> "));
    Serial.println(nombreEstado(siguiente));

    estadoActual = siguiente;
    moverMotorAEstado(siguiente);   // primero mueve el motor (bloqueante ~0.7s)

    // --- FIX: limpiar la entrada acumulada durante el giro bloqueante ---
    // Durante motor.step() el loop NO corre, así que cualquier pulsación
    // hecha mientras gira la aguja se pierde y puede dejar prev[] desfasado.
    // Re-leemos el estado real de los botones (mismo criterio que mostrarPatron)
    // para que la PRIMERA pulsación del nuevo turno se detecte como flanco limpio.
    prevA = digitalRead(PIN_BTN_A);
    prevB = digitalRead(PIN_BTN_B);
    prevC = digitalRead(PIN_BTN_C);
    prevD = digitalRead(PIN_BTN_D);
    prevR = digitalRead(PIN_BTN_R);
    ultimaPulsacionMs = millis();
    // -------------------------------------------------------------------

    actualizarSalidas();            // después arranca el temporizador (ventana limpia)
    emitirEventoEstado(siguiente);
  }

  // Apagar el LED de feedback de la pulsación una vez procesada la transición.
  if (ledPulsado != -1) digitalWrite(ledPulsado, LOW);
}

/* ============================================================
   ACTUALIZACIÓN DE LEDS Y TEMPORIZADOR
   ============================================================ */
void actualizarSalidas() {
  // Apagar indicadores de fin de juego
  digitalWrite(PIN_LED_PREMIO, LOW);
  digitalWrite(PIN_LED_FALLO,  LOW);

  switch (estadoActual) {
    case Q0:
      temporizadorActivo = false;
      Serial.println(F(">>> Estado Q0 — Reposo. Presione un botón para jugar."));
      break;

    case Q1: case Q2: case Q3: case Q4:
      tiempoEsperaInicio = millis();
      temporizadorActivo = true;
      Serial.print(F(">>> "));
      Serial.print(nombreEstado(estadoActual));
      Serial.println(F(" — Esperando próxima pulsación..."));
      break;

    case Q5:
      temporizadorActivo = false;
      tiempoAutoreset = millis();
      digitalWrite(PIN_LED_PREMIO, HIGH);
      sonidoPremio();
      Serial.println(F(">>> Q5 — ¡SALIÓ EL POLLO! (canción 31s antes de reset)"));
      break;

    case Q6:
      temporizadorActivo = false;
      tiempoAutoreset = millis();
      digitalWrite(PIN_LED_FALLO, HIGH);
      sonidoFallo();
      Serial.println(F(">>> Q6 — FALLO. Reset (manual o auto en 5 s)"));
      break;
  }
}

/* ============================================================
   EVENTOS ESTRUCTURADOS (para backend opcional)
   ============================================================ */
void emitirEventoEstado(Estado e) {
  Serial.print(F("EVT:STATE:"));
  Serial.println(nombreEstado(e));
  if      (e == Q5) Serial.println(F("EVT:WIN"));
  else if (e == Q6) Serial.println(F("EVT:LOSE"));
  else if (e == Q0) Serial.println(F("EVT:RESET"));
}

/* ============================================================
   GENERACIÓN Y PRESENTACIÓN DEL PATRÓN
   ============================================================ */
void generarPatron() {
  char buf[LONGITUD_PATRON + 1];
  for (int i = 0; i < LONGITUD_PATRON; i++) {
    patron[i] = random(0, 4);          // 0..3 → SIM_A..SIM_D
    buf[i] = simboloAChar((Simbolo)patron[i]);
  }
  buf[LONGITUD_PATRON] = '\0';
  Serial.print(F("Patrón generado: "));
  Serial.println(buf);
  Serial.print(F("EVT:PATTERN:"));
  Serial.println(buf);
}

void mostrarPatron() {
  delay(400);                            // pequeña pausa de "atención"
  for (int i = 0; i < LONGITUD_PATRON; i++) {
    int pin = pinLEDDeSimbolo((Simbolo)patron[i]);
    digitalWrite(pin, HIGH);
    delay(FLASH_LED_MS);
    digitalWrite(pin, LOW);
    delay(PAUSA_LED_MS);
  }
  // Limpieza: descartar pulsaciones acumuladas durante la presentación
  prevA = digitalRead(PIN_BTN_A);
  prevB = digitalRead(PIN_BTN_B);
  prevC = digitalRead(PIN_BTN_C);
  prevD = digitalRead(PIN_BTN_D);
  prevR = digitalRead(PIN_BTN_R);
  ultimaPulsacionMs = millis();
}

/* ============================================================
   CONTROL DEL MOTOR PASO A PASO
   ============================================================ */
void moverMotorAEstado(Estado destino) {
  int diferencia = (int)destino - posicionMotor;
  if (diferencia != 0) {
    motor.step(-diferencia * PASOS_POR_ESTADO);
  }
  posicionMotor = (int)destino;
}

/* ============================================================
   SONIDOS (buzzer)
   ============================================================ */
void sonidoPremio() {
  tone(PIN_BUZZER,  880, 180); delay(200);
  tone(PIN_BUZZER, 1175, 180); delay(200);
  tone(PIN_BUZZER, 1568, 300); delay(320);
}

void sonidoFallo() {
  tone(PIN_BUZZER, 220, 400);
  delay(420);
  tone(PIN_BUZZER, 150, 500);
  delay(520);
}

/* ============================================================
   UTILIDADES
   ============================================================ */
char simboloAChar(Simbolo s) {
  switch (s) {
    case SIM_A: return 'a';
    case SIM_B: return 'b';
    case SIM_C: return 'c';
    case SIM_D: return 'd';
    case SIM_T: return 't';
    case SIM_R: return 'r';
    default:    return '?';
  }
}

int pinLEDDeSimbolo(Simbolo s) {
  switch (s) {
    case SIM_A: return PIN_LED_A;
    case SIM_B: return PIN_LED_B;
    case SIM_C: return PIN_LED_C;
    case SIM_D: return PIN_LED_D;
    default:    return -1;
  }
}

const char* nombreEstado(Estado e) {
  switch (e) {
    case Q0: return "Q0";
    case Q1: return "Q1";
    case Q2: return "Q2";
    case Q3: return "Q3";
    case Q4: return "Q4";
    case Q5: return "Q5";
    case Q6: return "Q6";
    default: return "??";
  }
}
