import { randomUUID } from 'node:crypto';
import type { RunAgentInput } from '@ag-ui/core';
import type { TypeSafeClient } from '@typesafe-ai/sdk';
import {
  emitRunError,
  emitRunFinished,
  emitRunStarted,
  emitTextMessage,
  emitToolCall,
  emitToolCallResult,
  toConversation,
  type Emit,
} from '../ag-ui.ts';
import { decide, runTool, type ToolRun } from './decide.ts';
import { toMessage } from './message.ts';
import { toState } from './state.ts';
import type { Flight } from '../tools/flights.ts';
import { SHOW_METRICS } from '../feature-flags.ts';
import { toReport, type Metrics } from '../jev/metrics.ts';

export type FlightWidgetArgs = Pick<Flight, 'id' | 'from' | 'to' | 'date' | 'delayed'>;

function toWidgetArgs(flight: Flight): FlightWidgetArgs {
  const { id, from, to, date, delayed } = flight;
  return { id, from, to, date, delayed };
}

function emitFlightWidgets(flights: Flight[], parentMessageId: string, emit: Emit): void {
  for (const flight of flights) {
    const toolCallId = randomUUID();
    const args = toWidgetArgs(flight);
    emitToolCall(toolCallId, 'flightWidget', args, emit, parentMessageId);
  }
}

function emitResponse(text: string, flights: Flight[], emit: Emit): void {
  const messageId = randomUUID();
  emitTextMessage(text, emit, messageId);
  emitFlightWidgets(flights, messageId, emit);
}

function emitMetrics(metrics: Metrics, emit: Emit): void {
  const text = toReport(metrics);
  emitTextMessage(text, emit);
}

async function executeTool(run: ToolRun, emit: Emit): Promise<Flight[]> {
  const toolCallId = randomUUID();
  emitToolCall(toolCallId, run.tool, run.args, emit);

  const flights = await runTool(run);

  emitToolCallResult(toolCallId, flights, emit);
  return flights;
}

export async function runAgent(client: TypeSafeClient, input: RunAgentInput, emit: Emit): Promise<void> {
  emitRunStarted(input, emit);

  try {
    const turns = toConversation(input.messages);
    const state = toState(turns);
    const { decision, metrics } = await decide(client, state);

    if (decision.action === 'tool') {
      const flights = await executeTool(decision, emit);
      const text = toMessage(decision.tool, flights);
      emitResponse(text, flights, emit);
    } else {
      emitTextMessage(decision.text, emit);
    }

    if (SHOW_METRICS) {
      emitMetrics(metrics, emit);
    }

    emitRunFinished(input, emit);
  } catch (error) {
    emitRunError(error, emit);
  }
}
