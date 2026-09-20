import { randomUUID } from 'node:crypto';
import type { RunAgentInput } from '@ag-ui/core';
import type { TypeSafeClient, Usage } from '@typesafe-ai/sdk';
import {
  emitActivityAppend,
  emitActivitySnapshot,
  emitRunError,
  emitRunFinished,
  emitRunStarted,
  emitTextMessage,
  emitToolCall,
  emitToolCallResult,
  toConversation,
  type Emit,
} from '../ag-ui.ts';
import { SHOW_TOKEN_USAGE } from '../feature-flags.ts';
import { A2UI_ACTIVITY_TYPE, A2UI_OPERATIONS_KEY } from './a2ui.ts';
import { readAction, runAction, type UserAction } from './actions.ts';
import { compile } from './compile.ts';
import { describe } from './describe.ts';
import type { DashboardSpec } from './spec.ts';
import { createTools } from './tools.ts';

const RENDER_DASHBOARD = 'renderDashboard';

function readDescription(input: RunAgentInput): string {
  const turns = toConversation(input.messages);
  const request = turns.findLast((turn) => turn.role === 'user');
  return request?.content.trim() ?? '';
}

function emitTokenUsage(usage: Usage, emit: Emit): void {
  const text = `Jev used ${usage.input_tokens} input tokens and ${usage.output_tokens} output tokens.`;
  emitTextMessage(text, emit);
}

async function renderDashboard(spec: DashboardSpec, emit: Emit): Promise<void> {
  const toolCallId = randomUUID();
  emitToolCall(toolCallId, RENDER_DASHBOARD, spec, emit);

  const tools = createTools(emit);
  const dashboard = await compile(spec, tools);

  const content = { [A2UI_OPERATIONS_KEY]: dashboard.operations };
  emitActivitySnapshot(dashboard.surfaceId, A2UI_ACTIVITY_TYPE, content, emit);
  emitToolCallResult(toolCallId, { tiles: spec.tiles.length }, emit);
}

async function generate(client: TypeSafeClient, input: RunAgentInput, emit: Emit): Promise<void> {
  const description = readDescription(input);
  if (description === '') {
    emitTextMessage('Describe the dashboard you would like to see.', emit);
    return;
  }

  const { spec, notes, usage } = await describe(client, description);

  for (const note of notes) {
    emitTextMessage(note, emit);
  }
  if (spec.tiles.length > 0) {
    await renderDashboard(spec, emit);
  }
  if (SHOW_TOKEN_USAGE) {
    emitTokenUsage(usage, emit);
  }
}

async function react(action: UserAction, emit: Emit): Promise<void> {
  const tools = createTools(emit);
  const operations = await runAction(action, tools);
  emitActivityAppend(action.surfaceId, A2UI_ACTIVITY_TYPE, A2UI_OPERATIONS_KEY, operations, emit);
}

export async function runDashboardAgent(
  client: TypeSafeClient,
  input: RunAgentInput,
  emit: Emit,
): Promise<void> {
  emitRunStarted(input, emit);

  try {
    const action = readAction(input);
    if (action === null) {
      await generate(client, input, emit);
    } else {
      await react(action, emit);
    }
    emitRunFinished(input, emit);
  } catch (error) {
    emitRunError(error, emit);
  }
}
