import {
  AngularCatalog,
  BASIC_COMPONENTS,
  BASIC_FUNCTIONS,
  type AngularComponentImplementation,
} from '@a2ui/angular/v0_9';
import { TICKET_SCHEMA } from '../ticket-widget/ticket-schema';
import { TicketWidget } from '../ticket-widget/ticket-widget';

const CATALOG_ID = 'https://example.com/catalogs/first-steps-dashboard';

const ticketWidget: AngularComponentImplementation = {
  name: 'TicketWidget',
  component: TicketWidget,
  schema: TICKET_SCHEMA,
};

export const catalog = new AngularCatalog(
  CATALOG_ID,
  [...BASIC_COMPONENTS, ticketWidget],
  BASIC_FUNCTIONS,
);
