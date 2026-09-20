import readline from 'node:readline/promises';
import { choice, TypeSafeClient, type SystemOneResult } from '@typesafe-ai/sdk';
import { getBookedFlights } from './tools/bookings.ts';
import { searchFlights } from './tools/flights.ts';
import { toMessage } from './message.ts';
import { SHOW_JEV_RESULT } from './feature-flags.ts';

// null values because city names don't need further descriptions
const CITIES = {
  'Berlin': null, 'Bremen': null, 'Dresden': null, 'Frankfurt': null,
  'Graz': null, 'Hamburg': null, 'Innsbruck': null, 'Linz': null,
  'London': null, 'München': null, 'Paris': null, 'Rome': null,
  'Salzburg': null, 'Stuttgart': null, 'Wien': null, 'Zürich': null,
  'NOT_DEFINED': 'No place is named for this end of the journey.',
  'NOT_SUPPORTED': 'A place is named, but it is not one of the cities listed here.',
} as const;

const CITY_NAMES = Object.keys(CITIES).filter(
  (name) => name !== 'NOT_DEFINED' && name !== 'NOT_SUPPORTED',
);

const QUESTIONS = {
  tool: choice(
    'A traveller writes to an assistant that searches flights and lists the flights ' +
      'they have booked. `conversation` is the exchange so far; the last entry is the ' +
      'new message. What do they want now?',
    {
      flights: 'To travel somewhere, or to see connections between two places.',
      bookings: 'To see the flights they have already booked: their own reservations.',
      none:
        'Neither: a greeting, a thank-you, or something this assistant cannot do, ' +
        'such as hotels or trains.',
    },
  ),

  from: choice(
    'Which city does the traveller now name as the start of the journey, the place departed ' +
      'from? The last entry of `conversation` is the new message; earlier entries count only ' +
      'when the new message builds on them, as a return flight does.',
    CITIES,
  ),

  to: choice(
    'Which city does the traveller now name as the end of the journey, the destination? ' +
      'The last entry of `conversation` is the new message; earlier entries count only when ' +
      'the new message builds on them, as a return flight does.',
    CITIES,
  ),
};

type Answers = SystemOneResult<typeof QUESTIONS>['answers'];

type Turn = { role: 'user' | 'assistant'; content: string };

function askForRoute(from: string | null, to: string | null): string {
  if (from === null && to === null) {
    return 'I can look up flights for you -- just tell me which city you start from and where you want to go.';
  }
  if (from === null) {
    return `Happy to look for flights to ${to}. Which city would you like to depart from?`;
  }
  return `Happy to look for flights from ${from}. Which city would you like to fly to?`;
}

async function runTool(answers: Answers) {
  if (answers.from.choice === 'NOT_SUPPORTED' || answers.to.choice === 'NOT_SUPPORTED') {
    const cities = CITY_NAMES.join(', ');
    const reply = `I only fly between these cities: ${cities}.`;
    const args = { from: answers.from.choice, to: answers.to.choice };
    return { tool: answers.tool.choice, args, result: null, reply };
  }

  const from = answers.from.choice === 'NOT_DEFINED' ? null : answers.from.choice;
  const to = answers.to.choice === 'NOT_DEFINED' ? null : answers.to.choice;

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

const MAX_TURNS = 10;

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

  conversation.push({ role: 'user', content: message });

  console.log('conversation', conversation)

  try {
    const state = { conversation };
    const result = await client.systemOne({ state, questions: QUESTIONS });

    if (SHOW_JEV_RESULT) {
      const json = JSON.stringify(result, null, 2);
      console.log('Result from Jev: \n' + json + '\n');
    }

    const call = await runTool(result.answers);

    const output = toMessage(call);
    
    conversation.push({ role: 'assistant', content: output });

    if (conversation.length > MAX_TURNS) {
      conversation.splice(0, conversation.length - MAX_TURNS);
    }
  } catch (error) {
    conversation.pop();
    console.error((error instanceof Error ? error.message : String(error)) + '\n');
  }
}
