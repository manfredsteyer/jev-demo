import type { Flight } from '../../tools/flights.ts';
import {
  button,
  column,
  row,
  text,
  textField,
  type Component,
  type TileView,
} from '../a2ui.ts';
import type { FlightSearchTile } from '../spec.ts';
import { toFlightList } from './flight-tables.ts';
import { toTile, type Fragment } from './layout.ts';

export const SEARCH_FLIGHTS_ACTION = 'searchFlights';

function toResultsId(tileId: string): string {
  return `${tileId}-results`;
}

function toForm(id: string): Fragment {
  const fromId = `${id}-from`;
  const toId = `${id}-to`;
  const buttonId = `${id}-search`;
  const labelId = `${buttonId}-label`;
  const from = { path: `/${id}/from` };
  const to = { path: `/${id}/to` };

  const fromField = textField(fromId, 'From', from);
  const toField = textField(toId, 'To', to);
  const label = text(labelId, 'Search');
  const action = { name: SEARCH_FLIGHTS_ACTION, context: { from, to, tile: id } };
  const trigger = button(buttonId, labelId, action);
  const actionsId = `${id}-actions`;
  const actions = row(actionsId, [buttonId]);
  const form = column(`${id}-form`, [fromId, toId, actionsId]);
  return { root: form.id, components: [form, fromField, toField, actions, trigger, label] };
}

export function toFlightSearch(id: string, tile: FlightSearchTile): TileView {
  const form = toForm(id);
  const resultsId = toResultsId(id);
  const results = column(resultsId, []);
  const placeholder = { root: resultsId, components: [results] };
  const data = { from: tile.defaultFrom, to: tile.defaultTo };
  return toTile(id, 'Find a flight', [form, placeholder], data);
}

export function toSearchResults(tileId: string, flights: Flight[]): Component[] {
  const resultsId = toResultsId(tileId);
  const list = toFlightList(`${resultsId}-list`, flights, 'No flights found for this route.');
  const results = column(resultsId, [list.root]);
  return [results, ...list.components];
}
