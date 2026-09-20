import { randomUUID } from 'node:crypto';
import {
  contentToText,
  EventType,
  type AGUIEvent,
  type Message,
  type RunAgentInput,
  type ToolCall,
} from '@ag-ui/core';

const MAX_TURNS = 10;

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type ToolCallSummary = { name: string; args: Json };

export type Turn =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls: ToolCallSummary[] };

export type Emit = (event: AGUIEvent) => void;

function parseArguments(json: string): Json {
  try {
    return JSON.parse(json) as Json;
  } catch {
    return json;
  }
}

function toToolCalls(toolCalls: ToolCall[] | undefined): ToolCallSummary[] {
  const calls = toolCalls ?? [];
  return calls.map((call) => {
    const args = parseArguments(call.function.arguments);
    return { name: call.function.name, args };
  });
}

export function toConversation(messages: Message[]): Turn[] {
  const turns: Turn[] = [];
  for (const message of messages) {
    if (message.role === 'user') {
      const content = contentToText(message.content);
      turns.push({ role: 'user', content });
    }
    if (message.role === 'assistant') {
      const content = message.content ?? '';
      const toolCalls = toToolCalls(message.toolCalls);
      const last = turns.at(-1);
      if (last?.role === 'assistant') {
        last.content = last.content === '' ? content : `${last.content}\n${content}`;
        last.toolCalls.push(...toolCalls);
      } else {
        turns.push({ role: 'assistant', content, toolCalls });
      }
    }
  }
  return turns.slice(-MAX_TURNS);
}

export function emitRunStarted(input: RunAgentInput, emit: Emit): void {
  const { threadId, runId } = input;
  emit({ type: EventType.RUN_STARTED, threadId, runId });
}

export function emitRunFinished(input: RunAgentInput, emit: Emit): void {
  const { threadId, runId } = input;
  emit({ type: EventType.RUN_FINISHED, threadId, runId });
}

export function emitRunError(error: unknown, emit: Emit): void {
  const message = error instanceof Error ? error.message : String(error);
  emit({ type: EventType.RUN_ERROR, message });
}

export function emitToolCall(
  toolCallId: string,
  toolCallName: string,
  args: unknown,
  emit: Emit,
  parentMessageId: string = randomUUID(),
): void {
  const delta = JSON.stringify(args);
  emit({ type: EventType.TOOL_CALL_START, toolCallId, toolCallName, parentMessageId });
  emit({ type: EventType.TOOL_CALL_ARGS, toolCallId, delta });
  emit({ type: EventType.TOOL_CALL_END, toolCallId });
}

export function emitToolCallResult(toolCallId: string, result: unknown, emit: Emit): void {
  const messageId = randomUUID();
  const content = JSON.stringify(result);
  emit({ type: EventType.TOOL_CALL_RESULT, messageId, toolCallId, content, role: 'tool' });
}

export function emitActivitySnapshot(
  messageId: string,
  activityType: string,
  content: { [key: string]: unknown },
  emit: Emit,
): void {
  emit({ type: EventType.ACTIVITY_SNAPSHOT, messageId, activityType, content });
}

export function emitActivityAppend(
  messageId: string,
  activityType: string,
  listKey: string,
  items: unknown[],
  emit: Emit,
): void {
  const path = `/${listKey}/-`;
  const patch = items.map((value) => ({ op: 'add' as const, path, value }));
  emit({ type: EventType.ACTIVITY_DELTA, messageId, activityType, patch });
}

export function emitTextMessage(text: string, emit: Emit, messageId: string = randomUUID()): void {
  emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant' });
  emit({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: text });
  emit({ type: EventType.TEXT_MESSAGE_END, messageId });
}
