import type { Response } from 'express';
import type { AGUIEvent } from '@ag-ui/core';
import { EventEncoder } from '@ag-ui/encoder';
import type { Emit } from './ag-ui.ts';

export type SSE = { send: Emit; close: () => void };

export function initSSE(response: Response): SSE {
  const encoder = new EventEncoder();
  const contentType = encoder.getContentType();
  response.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (event: AGUIEvent) => {
    const frame = encoder.encodeSSE(event);
    response.write(frame);
  };
  const close = () => {
    response.end();
  };
  return { send, close };
}
