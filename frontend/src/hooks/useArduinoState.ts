import { useEffect, useRef, useState } from "react";

export type StateId = "Q0" | "Q1" | "Q2" | "Q3" | "Q4" | "Q5" | "Q6";
export type Phase = "idle" | "playing" | "won" | "lost";

export interface ArduinoState {
  state: StateId;
  pattern: string | null;
  lastInput: string | null;
  phase: Phase;
  connected: boolean;
}

type Event =
  | { type: "SNAPSHOT"; value: { state: StateId; pattern: string | null; last_input: string | null; phase: Phase; connected?: boolean } }
  | { type: "STATE"; value: StateId }
  | { type: "PATTERN"; value: string }
  | { type: "INPUT"; value: string }
  | { type: "WIN" }
  | { type: "LOSE" }
  | { type: "RESET" }
  | { type: "TIMEOUT" }
  | { type: "CONNECTED"; port: string }
  | { type: "DISCONNECTED" };

const phaseForState = (state: StateId): Phase => {
  if (state === "Q0") return "idle";
  if (state === "Q5") return "won";
  if (state === "Q6") return "lost";
  return "playing";
};

export function useArduinoState(): ArduinoState {
  const [data, setData] = useState<ArduinoState>({
    state: "Q0",
    pattern: null,
    lastInput: null,
    phase: "idle",
    connected: false,
  });

  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    const open = () => {
      if (cancelled) return;
      const source = new EventSource("/events");
      sourceRef.current = source;

      source.onopen = () => {
        // /events conectado != Arduino conectado; el broker manda CONNECTED aparte.
      };

      source.onmessage = (evt) => {
        let parsed: Event;
        try {
          parsed = JSON.parse(evt.data);
        } catch {
          return;
        }
        setData((prev) => applyEvent(prev, parsed));
      };

      source.onerror = () => {
        source.close();
        setData((prev) => ({ ...prev, connected: false }));
        // Reintento simple. EventSource normalmente reconecta solo, pero
        // así cubrimos el caso en que el backend cae por completo.
        setTimeout(() => open(), 1500);
      };
    };

    open();

    return () => {
      cancelled = true;
      sourceRef.current?.close();
    };
  }, []);

  return data;
}

function applyEvent(prev: ArduinoState, event: Event): ArduinoState {
  switch (event.type) {
    case "SNAPSHOT": {
      const v = event.value;
      return {
        ...prev,
        state: v.state,
        pattern: v.pattern,
        lastInput: v.last_input,
        phase: v.phase,
        ...(typeof v.connected === "boolean" ? { connected: v.connected } : {}),
      };
    }
    case "STATE":
      return { ...prev, state: event.value, phase: phaseForState(event.value), ...(event.value === "Q0" ? { pattern: null, lastInput: null } : {}) };
    case "PATTERN":
      return { ...prev, pattern: event.value };
    case "INPUT":
      return { ...prev, lastInput: event.value };
    case "RESET":
      return { ...prev, phase: "idle", pattern: null, lastInput: null };
    case "WIN":
      return { ...prev, phase: "won" };
    case "LOSE":
      return { ...prev, phase: "lost" };
    case "TIMEOUT":
      return prev;
    case "CONNECTED":
      return { ...prev, connected: true };
    case "DISCONNECTED":
      return { ...prev, connected: false };
    default:
      return prev;
  }
}
