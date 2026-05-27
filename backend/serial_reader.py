"""Lectura del puerto serial del Arduino y publicación de eventos del AFD.

Las líneas del Arduino que empiezan por ``EVT:`` se parsean a un dict y se
envían a todas las colas suscritas (las usa el endpoint SSE en main.py).
"""

from __future__ import annotations

import asyncio
import os
import time
from dataclasses import dataclass, field
from typing import Optional

import serial
import serial.tools.list_ports


PORT_HINTS = ("usbmodem", "usbserial", "Arduino", "wchusb", "ttyUSB", "ttyACM")


def auto_detect_port() -> Optional[str]:
    """Devuelve el primer puerto serial cuya descripción coincide con un Arduino."""
    for info in serial.tools.list_ports.comports():
        haystack = f"{info.device} {info.description} {info.manufacturer or ''}".lower()
        if any(hint.lower() in haystack for hint in PORT_HINTS):
            return info.device
    return None


@dataclass
class GameState:
    state: str = "Q0"
    pattern: Optional[str] = None
    last_input: Optional[str] = None
    phase: str = "idle"   # idle | playing | won | lost
    history: list[dict] = field(default_factory=list)

    def snapshot(self) -> dict:
        return {
            "state": self.state,
            "pattern": self.pattern,
            "last_input": self.last_input,
            "phase": self.phase,
            "history": self.history[-20:],
        }


class SerialBroker:
    """Mantiene el estado del AFD y reparte eventos a los suscriptores."""

    def __init__(self, port: Optional[str], baud_rate: int = 9600) -> None:
        self.requested_port = port
        self.baud_rate = baud_rate
        self.actual_port: Optional[str] = None
        self.connected: bool = False
        self.state = GameState()
        self._subscribers: list[asyncio.Queue] = []
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        self._loop = asyncio.get_running_loop()
        self._task = self._loop.create_task(self._run())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=64)
        self._subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        if queue in self._subscribers:
            self._subscribers.remove(queue)

    def _publish(self, event: dict) -> None:
        for q in list(self._subscribers):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                # Cliente lento: descartamos su evento más viejo y reintentamos.
                try:
                    q.get_nowait()
                    q.put_nowait(event)
                except Exception:
                    pass

    async def _run(self) -> None:
        """Bucle de reconexión + lectura serial. Corre en el hilo del loop asyncio."""
        while True:
            port = self.requested_port or auto_detect_port()
            if not port:
                self.connected = False
                self.actual_port = None
                await asyncio.sleep(2)
                continue
            try:
                # serial_for_url soporta tanto rutas /dev/... como URLs socket://host:port
                # (útil para Docker en macOS, donde no hay USB passthrough al contenedor).
                ser = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: serial.serial_for_url(port, baudrate=self.baud_rate, timeout=1),
                )
            except (serial.SerialException, OSError, ValueError) as exc:
                print(f"[serial] no se pudo abrir {port}: {exc}")
                self.connected = False
                self.actual_port = None
                await asyncio.sleep(2)
                continue

            self.actual_port = port
            self.connected = True
            print(f"[serial] conectado a {port} @ {self.baud_rate}")
            self._publish({"type": "CONNECTED", "port": port})

            try:
                await self._read_loop(ser)
            except (serial.SerialException, OSError) as exc:
                print(f"[serial] desconectado: {exc}")
            finally:
                self.connected = False
                self.actual_port = None
                self._publish({"type": "DISCONNECTED"})
                try:
                    ser.close()
                except Exception:
                    pass
                await asyncio.sleep(2)

    async def _read_loop(self, ser: "serial.Serial") -> None:
        loop = asyncio.get_running_loop()
        while True:
            line = await loop.run_in_executor(None, ser.readline)
            if not line:
                continue
            try:
                text = line.decode("utf-8", errors="ignore").strip()
            except Exception:
                continue
            if not text.startswith("EVT:"):
                # Línea legible, la mostramos para debug pero no la publicamos.
                if text:
                    print(f"[arduino] {text}")
                continue
            event = self._parse_event(text)
            if event:
                self._apply_event(event)
                self._publish(event)

    @staticmethod
    def _parse_event(text: str) -> Optional[dict]:
        parts = text.split(":", 2)
        # parts = ["EVT", "TYPE"] o ["EVT", "TYPE", "PAYLOAD"]
        if len(parts) < 2:
            return None
        kind = parts[1]
        payload = parts[2] if len(parts) > 2 else None
        if kind == "STATE":
            return {"type": "STATE", "value": payload}
        if kind == "PATTERN":
            return {"type": "PATTERN", "value": payload}
        if kind == "INPUT":
            return {"type": "INPUT", "value": payload}
        if kind == "TIMEOUT":
            return {"type": "TIMEOUT"}
        if kind == "WIN":
            return {"type": "WIN"}
        if kind == "LOSE":
            return {"type": "LOSE"}
        if kind == "RESET":
            return {"type": "RESET"}
        return None

    def _apply_event(self, event: dict) -> None:
        kind = event["type"]
        now = time.time()
        if kind == "STATE":
            self.state.state = event["value"]
            if event["value"] == "Q0":
                self.state.phase = "idle"
                self.state.pattern = None
                self.state.last_input = None
            elif event["value"] == "Q5":
                self.state.phase = "won"
            elif event["value"] == "Q6":
                self.state.phase = "lost"
            else:
                self.state.phase = "playing"
        elif kind == "PATTERN":
            self.state.pattern = event["value"]
        elif kind == "INPUT":
            self.state.last_input = event["value"]
        elif kind in ("WIN", "LOSE", "RESET", "TIMEOUT"):
            pass

        self.state.history.append({"t": now, **event})


def build_broker() -> SerialBroker:
    port = os.environ.get("SERIAL_PORT") or None
    baud = int(os.environ.get("BAUD_RATE", "9600"))
    return SerialBroker(port=port, baud_rate=baud)
