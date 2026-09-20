import cors from 'cors';
import express, { type Request } from 'express';
import { RunAgentInputSchema } from '@ag-ui/core/schemas';
import type { RunAgentInput } from '@ag-ui/core';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { initSSE } from './sse.ts';
import { runAgent } from './ticketing/agent.ts';

if (!process.env['TYPESAFE_API_KEY']) {
  console.error('TYPESAFE_API_KEY is not set. Copy .env.example to .env and put your key in it.');
  process.exit(2);
}

const client = new TypeSafeClient();

const PORT = Number(process.env['PORT'] ?? 3000);

function parseRequest(request: Request): RunAgentInput | null {
  const parsed = RunAgentInputSchema.safeParse(request.body);
  if (!parsed.success) {
    return null;
  }
  return parsed.data as RunAgentInput;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.post('/agent', async (request, response) => {
  const input = parseRequest(request);
  if (!input) {
    response.status(400).send('Body must be a RunAgentInput JSON object.');
    return;
  }

  const sse = initSSE(response);
  await runAgent(client, input, sse.send);
  sse.close();
});

app.listen(PORT, () => {
  console.log(`AG-UI agent listening at http://localhost:${PORT}/agent`);
});
