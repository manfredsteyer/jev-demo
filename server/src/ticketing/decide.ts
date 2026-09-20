import { choice, type TypeSafeClient, type SystemOneResult, type Usage } from '@typesafe-ai/sdk';
import { getBookedFlights } from '../tools/bookings.ts';
import { searchFlights, type Flight } from '../tools/flights.ts';
import { SHOW_JEV_RESULT } from '../feature-flags.ts';
import { CITIES, CITY_NAMES } from '../cities.ts';
import type { State } from './state.ts';

const PLACES = {
  ...CITIES,
  'NOT_DEFINED': 'No place is named for this end of the journey.',
  'NOT_SUPPORTED': 'A place is named, but it is not one of the cities listed here.',
} as const;

const CONVERSATION = '`conversation` is the exchange so far; the last entry is the new message.';

const QUESTIONS = {
  tool: choice(
    'A traveller writes to an assistant that searches flights and lists the flights ' +
      'they have booked. ' +
      CONVERSATION +
      ' What do they want now?',
    {
      findFlights:
        'To travel somewhere, or to see connections between two places, including the ' +
        'return flight for a flight that was shown.',
      findBookings: 'To see the flights they have already booked: their own reservations.',
      none:
        'Neither: a greeting, a thank-you, or something this assistant cannot do, ' +
        'such as hotels or trains.',
    },
  ),

  from: choice(
    'Which city is the start of the journey the traveller now asks about, the place ' +
      'departed from? ' +
      CONVERSATION +
      ' Earlier entries count only when the new message builds on them: the return flight ' +
      'of a flight in `flightsShown` starts where that flight ends.',
    PLACES,
  ),

  to: choice(
    'Which city is the end of the journey the traveller now asks about, the destination? ' +
      CONVERSATION +
      ' Earlier entries count only when the new message builds on them: the return flight ' +
      'of a flight in `flightsShown` ends where that flight starts.',
    PLACES,
  ),
};

type Answers = SystemOneResult<typeof QUESTIONS>['answers'];

export type ToolName = 'findFlights' | 'findBookings';

export type ToolArgs = { from: string | null; to: string | null };

export type Route = { from: string; to: string };

export type ToolRun =
  | { action: 'tool'; tool: 'findFlights'; args: Route }
  | { action: 'tool'; tool: 'findBookings'; args: ToolArgs };

export type Reply = { action: 'reply'; text: string };

export type Decision = ToolRun | Reply;

export type Decided = { decision: Decision; usage: Usage };

function askForRoute(from: string | null, to: string | null): string {
  if (from === null && to === null) {
    return 'I can look up flights for you -- just tell me which city you start from and where you want to go.';
  }
  if (from === null) {
    return `Happy to look for flights to ${to}. Which city would you like to depart from?`;
  }
  return `Happy to look for flights from ${from}. Which city would you like to fly to?`;
}

function toDecision(answers: Answers): Decision {
  if (answers.from.choice === 'NOT_SUPPORTED' || answers.to.choice === 'NOT_SUPPORTED') {
    const cities = CITY_NAMES.join(', ');
    const text = `I only fly between these cities: ${cities}.`;
    return { action: 'reply', text };
  }

  const from = answers.from.choice === 'NOT_DEFINED' ? null : answers.from.choice;
  const to = answers.to.choice === 'NOT_DEFINED' ? null : answers.to.choice;

  switch (answers.tool.choice) {
    case 'findFlights': {
      if (from === null || to === null) {
        const text = askForRoute(from, to);
        return { action: 'reply', text };
      }
      return { action: 'tool', tool: 'findFlights', args: { from, to } };
    }
    case 'findBookings': {
      return { action: 'tool', tool: 'findBookings', args: { from, to } };
    }
    case 'none': {
      const text =
        "I'm sorry, I can't do that. I can search for flights and show the flights you have booked.";
      return { action: 'reply', text };
    }
  }
}

export async function decide(client: TypeSafeClient, state: State): Promise<Decided> {
  const result = await client.systemOne({ state, questions: QUESTIONS });

  if (SHOW_JEV_RESULT) {
    const json = JSON.stringify(result, null, 2);
    console.log('Result from Jev: \n' + json + '\n');
  }

  const decision = toDecision(result.answers);
  return { decision, usage: result.usage };
}

export function runTool(run: ToolRun): Promise<Flight[]> {
  switch (run.tool) {
    case 'findFlights': {
      return searchFlights(run.args.from, run.args.to);
    }
    case 'findBookings': {
      return getBookedFlights(run.args.from, run.args.to);
    }
  }
}
