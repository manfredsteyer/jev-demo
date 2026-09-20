import type { RunAgentInput } from '@ag-ui/core';
import type { Json } from '../ag-ui.ts';
import { updateComponents, updateDataModel, type Operation } from './a2ui.ts';
import type { Tools } from './tools.ts';
import { CHECK_IN_ACTION, toCheckedIn } from './tiles/bookings.ts';
import { SEARCH_FLIGHTS_ACTION, toSearchResults } from './tiles/flight-search.ts';

export type UserAction = { name: string; surfaceId: string; context: { [key: string]: Json } };

type ForwardedProps = { a2uiAction?: { userAction?: Partial<UserAction> } };

export function readAction(input: RunAgentInput): UserAction | null {
  const props = input.forwardedProps as ForwardedProps | undefined;
  const action = props?.a2uiAction?.userAction;
  if (typeof action?.name !== 'string' || typeof action.surfaceId !== 'string') {
    return null;
  }
  const context = action.context ?? {};
  return { name: action.name, surfaceId: action.surfaceId, context };
}

function toText(value: Json | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function searchFlights(action: UserAction, tools: Tools): Promise<Operation[]> {
  const from = toText(action.context['from']);
  const to = toText(action.context['to']);
  const tileId = toText(action.context['tile']);

  const flights = await tools.findFlights(from, to);

  const results = toSearchResults(tileId, flights);
  const form = updateDataModel(action.surfaceId, `/${tileId}`, { from, to });
  const list = updateComponents(action.surfaceId, results);
  return [form, list];
}

async function checkIn(action: UserAction, tools: Tools): Promise<Operation[]> {
  const flightId = Number(action.context['flightId']);
  const entryId = toText(action.context['entry']);

  await tools.checkIn(flightId);

  const checkedIn = toCheckedIn(entryId);
  const update = updateComponents(action.surfaceId, checkedIn);
  return [update];
}

export function runAction(action: UserAction, tools: Tools): Promise<Operation[]> {
  switch (action.name) {
    case SEARCH_FLIGHTS_ACTION: {
      return searchFlights(action, tools);
    }
    case CHECK_IN_ACTION: {
      return checkIn(action, tools);
    }
    default: {
      throw new Error(`The dashboard does not know the action "${action.name}".`);
    }
  }
}
