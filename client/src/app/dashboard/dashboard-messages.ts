import type { Message } from '@copilotkit/angular';

export type ActivityMessage = Extract<Message, { role: 'activity' }>;

export type Step = { id: string; name: string; args: string; done: boolean };

export function isActivity(message: Message): message is ActivityMessage {
  return message.role === 'activity';
}

export function toNotes(messages: Message[]): string[] {
  const notes: string[] = [];
  for (const message of messages) {
    if (message.role === 'assistant' && typeof message.content === 'string' && message.content !== '') {
      notes.push(message.content);
    }
  }
  return notes;
}

function formatArguments(json: string): string {
  try {
    const parsed: unknown = JSON.parse(json);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return json;
  }
}

function toAnsweredCallIds(messages: Message[]): Set<string> {
  const ids = new Set<string>();
  for (const message of messages) {
    if (message.role === 'tool') {
      ids.add(message.toolCallId);
    }
  }
  return ids;
}

export function toSteps(messages: Message[]): Step[] {
  const answered = toAnsweredCallIds(messages);
  const steps: Step[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant') {
      continue;
    }
    for (const call of message.toolCalls ?? []) {
      const args = formatArguments(call.function.arguments);
      const done = answered.has(call.id);
      steps.push({ id: call.id, name: call.function.name, args, done });
    }
  }
  return steps;
}
