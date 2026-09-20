import readline from 'node:readline/promises';
import { choice, TypeSafeClient, type SystemOneResult } from '@typesafe-ai/sdk';
import { getBookedFlights } from './tools/bookings.ts';
import { searchFlights, type Flight } from './tools/flights.ts';
import { toHeading, toMessage } from './message.ts';
import { SHOW_JEV_RESULT } from './feature-flags.ts';

// null values because city names don't need further descriptions
const CITIES = {
  'Berlin': null, 'Bremen': null, 'Dresden': null, 'Frankfurt': null,
  'Graz': null, 'Hamburg': null, 'Innsbruck': null, 'Linz': null,
  'London': null, 'München': null, 'Paris': null, 'Rome': null,
  'Salzburg': null, 'Stuttgart': null, 'Wien': null, 'Zürich': null,
} as const;

const CITY_OPTIONS = {
  ...CITIES,
  'NOT_DEFINED': 'No place is named for this end of the journey.',
  'NOT_SUPPORTED': 'A place is named, but it is not one of the cities listed here.',
} as const;

const BOOKED_FROM_OPTIONS = {
  ...CITY_OPTIONS,
  'NOT_DEFINED': 'The new message names no departure city; bookings from anywhere are meant.',
} as const;

const BOOKED_TO_OPTIONS = {
  ...CITY_OPTIONS,
  'NOT_DEFINED': 'The new message names no destination; bookings to anywhere are meant.',
} as const;

const CITY_NAMES = Object.keys(CITIES);

const CONVERSATION = '`conversation` is the exchange so far; the last entry is the new message.';

const QUESTIONS = {
  tool: choice(
    'A traveller writes to an assistant that searches flights and lists the flights ' +
      'they have booked. ' +
      CONVERSATION +
      ' What do they want now?',
    {
      flights:
        'To find connections they could take: to travel somewhere, or to see flights between ' +
        'two places, including the return flight for a flight that was shown. Asking for ' +
        'flights between two places is a search, even when that route is already booked.',
      bookings:
        'To see or check what they have already booked: their own reservations, such as ' +
        'whether they have already booked a flight or its return flight.',
      none:
        'Neither: a greeting, a thank-you, or something this assistant cannot do, ' +
        'such as hotels or trains.',
    },
  ),

  from: choice(
    'Which city is the start of the journey the traveller now asks about, the place ' +
      'departed from? ' +
      CONVERSATION +
      ' Earlier entries count only when the new message builds on them: a return flight ' +
      'belongs to the flights shown last, `flightsShown` of the entry just before the new ' +
      'message, and starts where they end; a message that changes only the destination ' +
      'keeps their start.',
    CITY_OPTIONS,
  ),

  to: choice(
    'Which city is the end of the journey the traveller now asks about, the destination? ' +
      CONVERSATION +
      ' Earlier entries count only when the new message builds on them: a return flight ' +
      'belongs to the flights shown last, `flightsShown` of the entry just before the new ' +
      'message, and ends where they start; a message that changes only the place of ' +
      'departure keeps their destination.',
    CITY_OPTIONS,
  ),

  bookedFrom: choice(
    'Suppose the traveller wants to see the flights they have booked. Which city does the ' +
      'new message name as the place those booked flights depart from? ' +
      CONVERSATION +
      ' A city named as the destination does not count, and neither do the flights in ' +
      '`flightsShown` or routes searched earlier.',
    BOOKED_FROM_OPTIONS,
  ),

  bookedTo: choice(
    'Suppose the traveller wants to see the flights they have booked. Which city does the ' +
      'new message name as the destination those booked flights go to? ' +
      CONVERSATION +
      ' A city named as the place of departure does not count, and neither do the flights ' +
      'in `flightsShown` or routes searched earlier.',
    BOOKED_TO_OPTIONS,
  ),

  bookedRefers: choice(
    'Suppose the traveller wants to see the flights they have booked. ' +
      CONVERSATION +
      ' Does the new message point at a flight in `flightsShown` of the entry before it?',
    {
      none:
        'No: it asks for bookings on its own terms, in general or by naming cities, as ' +
        '"my bookings" or "my bookings to Berlin" does.',
      same:
        'Yes, at a flight that was shown: "that flight", "this one", "one of these", ' +
        '"have I booked it?".',
      return:
        'Yes, at the opposite direction of a flight that was shown: its return flight, ' +
        'the way back.',
    },
  ),
};

type Answers = SystemOneResult<typeof QUESTIONS>['answers'];

type ShownFlight = { from: string; to: string; date: string };

type Route = { from: string; to: string };

type Turn =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; flightsShown: ShownFlight[] };

function toShownFlights(flights: Flight[] | null): ShownFlight[] {
  if (flights === null) {
    return [];
  }
  return flights.map(({ from, to, date }) => ({ from, to, date }));
}

function askForRoute(from: string | null, to: string | null): string {
  if (from === null && to === null) {
    return 'I can look up flights for you -- just tell me which city you start from and where you want to go.';
  }
  if (from === null) {
    return `Happy to look for flights to ${to}. Which city would you like to depart from?`;
  }
  return `Happy to look for flights from ${from}. Which city would you like to fly to?`;
}

function shownRoute(turn: Turn | undefined): Route | null {
  if (turn === undefined || turn.role !== 'assistant') {
    return null;
  }
  const [first, ...others] = turn.flightsShown;
  if (first === undefined) {
    return null;
  }
  const sameRoute = others.every((flight) => flight.from === first.from && flight.to === first.to);
  if (!sameRoute) {
    return null;
  }
  return { from: first.from, to: first.to };
}

function routeOf(answers: Answers, shown: Route | null): Route {
  if (answers.tool.choice !== 'bookings') {
    return { from: answers.from.choice, to: answers.to.choice };
  }
  if (shown !== null && answers.bookedRefers.choice === 'same') {
    return shown;
  }
  if (shown !== null && answers.bookedRefers.choice === 'return') {
    return { from: shown.to, to: shown.from };
  }
  return { from: answers.bookedFrom.choice, to: answers.bookedTo.choice };
}

async function runTool(answers: Answers, shown: Route | null) {
  const route = routeOf(answers, shown);

  if (route.from === 'NOT_SUPPORTED' || route.to === 'NOT_SUPPORTED') {
    const cities = CITY_NAMES.join(', ');
    const reply = `I only fly between these cities: ${cities}.`;
    return { tool: answers.tool.choice, args: route, result: null, reply };
  }

  const from = route.from === 'NOT_DEFINED' ? null : route.from;
  const to = route.to === 'NOT_DEFINED' ? null : route.to;

  switch (answers.tool.choice) {
    case 'flights': {
      if (from === null || to === null) {
        const reply = askForRoute(from, to);
        return { tool: 'flights', args: { from, to }, result: null, reply };
      }
      const result = await searchFlights(from, to);
      return { tool: 'flights', args: { from, to }, result, reply: null };
    }
    case 'bookings': {
      const result = await getBookedFlights(from, to);
      return { tool: 'bookings', args: { from, to }, result, reply: null };
    }
    case 'none': {
      const reply =
        "I'm sorry, I can't do that. I can search for flights and show the flights you have booked.";
      return { tool: 'none', args: {}, result: null, reply };
    }
  }
}

if (!process.env['TYPESAFE_API_KEY']) {
  console.error('TYPESAFE_API_KEY is not set. Copy .env.example to .env and put your key in it.');
  process.exit(2);
}

const client = new TypeSafeClient();

const MAX_TURNS = 2;

const conversation: Turn[] = [];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('SIGINT', () => rl.close());
rl.on('close', () => process.exit(0));

console.log('Ask for flights or for your bookings. Ctrl+C quits.\n');

for (;;) {
  const message = (await rl.question('> ')).trim();
  if (message === '') {
    continue;
  }

  const previous = conversation.at(-1);
  const shown = shownRoute(previous);

  conversation.push({ role: 'user', content: message });

  try {
    const state = { conversation };
    const result = await client.systemOne({ state, questions: QUESTIONS });

    if (SHOW_JEV_RESULT) {
      const json = JSON.stringify(result, null, 2);
      console.log('Result from Jev: \n' + json + '\n');
    }

    const call = await runTool(result.answers, shown);

    const output = toMessage(call);
    console.log(output + '\n');

    const content = toHeading(call);
    const flightsShown = toShownFlights(call.result);
    conversation.push({ role: 'assistant', content, flightsShown });

    if (conversation.length > MAX_TURNS) {
      conversation.splice(0, conversation.length - MAX_TURNS);
    }
  } catch (error) {
    conversation.pop();
    console.error((error instanceof Error ? error.message : String(error)) + '\n');
  }
}
