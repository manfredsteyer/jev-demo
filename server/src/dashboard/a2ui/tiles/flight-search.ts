import { button, column, row, text, textField, type TileView } from '../protocol.ts';
import type { FlightSearchTile } from '../../model.ts';
import { toTile, type Fragment } from './layout.ts';

const SEARCH_FLIGHTS_ACTION = 'searchFlights';

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
  const data = { from: tile.defaultFrom, to: tile.defaultTo };
  return toTile(id, 'Find a flight', [form], data);
}
