"""API de la Caja Fuerte de Patrones.

- ``GET /health``  estado de la conexión serial.
- ``GET /state``   snapshot actual del juego.
- ``GET /events``  stream Server-Sent Events con cada evento del Arduino.
"""

from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from serial_reader import build_broker

load_dotenv()

broker = build_broker()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await broker.start()
    try:
        yield
    finally:
        await broker.stop()


app = FastAPI(title="Caja Fuerte de Patrones", lifespan=lifespan)

allow_origin = os.environ.get("ALLOW_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allow_origin],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "connected": broker.connected,
        "port": broker.actual_port,
        "requested_port": broker.requested_port,
        "baud_rate": broker.baud_rate,
    }


@app.get("/state")
async def state() -> dict:
    return broker.state.snapshot()


@app.get("/events")
async def events(request: Request) -> StreamingResponse:
    queue = broker.subscribe()

    async def stream():
        # Snapshot inicial para que el cliente recién conectado pinte el estado real.
        snapshot = broker.state.snapshot()
        snapshot_event = {"type": "SNAPSHOT", "value": snapshot}
        yield f"data: {json.dumps(snapshot_event)}\n\n"

        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Comentario SSE para mantener viva la conexión.
                    yield ": keep-alive\n\n"
        finally:
            broker.unsubscribe(queue)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
