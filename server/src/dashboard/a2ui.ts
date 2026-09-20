import type { Json } from '../ag-ui.ts';

export const A2UI_VERSION = 'v0.9';

export const A2UI_ACTIVITY_TYPE = 'a2ui-surface';

export const A2UI_OPERATIONS_KEY = 'a2ui_operations';

export const CATALOG_ID = 'https://example.com/catalogs/first-steps-dashboard';

export type Binding = { path: string };

export type Component = { id: string; component: string; [property: string]: Json };

export type Operation =
  | { version: typeof A2UI_VERSION; createSurface: { surfaceId: string; catalogId: string } }
  | { version: typeof A2UI_VERSION; updateComponents: { surfaceId: string; components: Component[] } }
  | { version: typeof A2UI_VERSION; updateDataModel: { surfaceId: string; path: string; value: Json } };

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'caption' | 'body';

export type Align = 'start' | 'center' | 'end' | 'stretch';

export type Action = { name: string; context: { [key: string]: Json } };

export type TileView = { root: string; components: Component[]; data: Json | null };

export type Ticket = { ticketId: number; from: string; to: string; date: string; delay: number };

export function text(id: string, content: string, variant: TextVariant = 'body'): Component {
  return { id, component: 'Text', text: content, variant };
}

export function weighted(component: Component, weight: number): Component {
  return { ...component, weight };
}

export function ticket(id: string, values: Ticket): Component {
  return { id, component: 'TicketWidget', ...values };
}

export function column(id: string, children: string[], align: Align = 'stretch'): Component {
  return { id, component: 'Column', children, align };
}

export function row(id: string, children: string[], align: Align = 'start'): Component {
  return { id, component: 'Row', children, align };
}

export function card(id: string, child: string): Component {
  return { id, component: 'Card', child };
}

export function image(id: string, url: string, description: string): Component {
  return { id, component: 'Image', url, description, fit: 'contain' };
}

export function textField(id: string, label: string, value: Binding): Component {
  return { id, component: 'TextField', label, value };
}

export function button(id: string, child: string, action: Action): Component {
  return { id, component: 'Button', child, variant: 'primary', action: { event: action } };
}

export function createSurface(surfaceId: string): Operation {
  return { version: A2UI_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } };
}

export function updateComponents(surfaceId: string, components: Component[]): Operation {
  return { version: A2UI_VERSION, updateComponents: { surfaceId, components } };
}

export function updateDataModel(surfaceId: string, path: string, value: Json): Operation {
  return { version: A2UI_VERSION, updateDataModel: { surfaceId, path, value } };
}
