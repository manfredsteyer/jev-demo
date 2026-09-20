import { registerComponent } from '@copilotkit/angular';
import { FLIGHT_SCHEMA, FlightWidget } from './flight-widget/flight-widget';

export function initWidgets(): void {
  registerComponent({
    name: 'flightWidget',
    description: 'Shows one flight as a card: route, departure and whether it is delayed.',
    parameters: FLIGHT_SCHEMA,
    component: FlightWidget,
    followUp: false,
  });
}
