import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { RunAgentInputSchema } from '@ag-ui/core/schemas';
import type { RunAgentInput } from '@ag-ui/core';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import type { Emit } from './ag-ui.ts';
import { runDashboardAgent } from './dashboard/agent.ts';
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

const imagesUrl = new URL('../public/images', import.meta.url);
const imagesPath = fileURLToPath(imagesUrl);
const serveImages = express.static(imagesPath, { maxAge: '1d' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/images', serveImages);

type Agent = (client: TypeSafeClient, input: RunAgentInput, emit: Emit) => Promise<void>;

function serve(agent: Agent) {
  return async (request: Request, response: Response) => {
    const input = parseRequest(request);
    if (!input) {
      response.status(400).send('Body must be a RunAgentInput JSON object.');
      return;
    }

    const sse = initSSE(response);
    await agent(client, input, sse.send);
    sse.close();
  };
}

const serveChat = serve(runAgent);
const serveDashboard = serve(runDashboardAgent);

app.post('/agent', serveChat);
app.post('/dashboard', serveDashboard);

app.listen(PORT, () => {
  console.log(`AG-UI chat agent listening at http://localhost:${PORT}/agent`);
  console.log(`AG-UI dashboard agent listening at http://localhost:${PORT}/dashboard`);
});
