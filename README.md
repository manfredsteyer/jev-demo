# Function calling with Jev — a minimal example

Three files, about 150 lines. You type a sentence, a hardcoded questionnaire goes
to Jev, and whatever comes back is printed as JSON — together with the result of
the tool the model picked.

- [src/index.ts](src/index.ts) — the questionnaire, the dispatch, the loop.
- [src/tools/flights.ts](src/tools/flights.ts) — the search against the airline's public
  demo backend.
- [src/tools/bookings.ts](src/tools/bookings.ts) — the flights this traveller has already
  booked, fetched once at startup and kept in an array.

```
> meine flüge nach hamburg
{
  "message": "meine flüge nach hamburg",
  "answers": {
    "tool": { "choice": "bookings",    "confidence": 0.91, "probabilities": { ... } },
    "from": { "choice": "not defined", "confidence": 0.99, "probabilities": { ... } },
    "to":   { "choice": "Hamburg",     "confidence": 1,    "probabilities": { ... } }
  },
  "usage": { "input_tokens": 803, "output_tokens": 349 },
  "call": {
    "tool": "bookings",
    "args": { "to": "Hamburg" },
    "result": [ { "id": 1, "from": "Graz", "to": "Hamburg", "date": "...", ... } ]
  }
}
```

## Run it

```sh
npm install
cp .env.example .env          # then put your key in it
npm start
npm run typecheck             # tsc --noEmit
```

Node 24 runs the TypeScript directly by stripping types, so there is no build
step. `npm start` reads `.env` if it is there (`--env-file-if-exists`), so no
dotenv dependency is needed; a `TYPESAFE_API_KEY` already exported in your shell
takes precedence. Get a key at <https://console.typesafe.ai/keys>.

Set `SHOW_JEV_RESULT` in `src/feature-flags.ts` to `true` to print Jev's raw
answer -- the choices, their probabilities and the token usage -- before each
reply. It stays off by default so the conversation reads like a conversation.

## How it works

Jev does not write the answer. It answers questions. This example asks three of
them, all in **one** request:

| Question | Type | Options |
| --- | --- | --- |
| `tool` | choice | `flights`, `bookings`, `none` |
| `from` | choice | the 16 cities the airline serves, or `not defined` |
| `to` | choice | the same 17 answers |

They are answered in parallel and independently of one another, so all three are
there before the code knows which tool it needs. That is on purpose: they cost
tokens, not a second round trip.

### Two tools, one pair of arguments

| Tool | What it does | How it reads `from` and `to` |
| --- | --- | --- |
| `flights` | searches the airline's connections | required — without both ends there is no search |
| `bookings` | lists this traveller's own flights | filters — each one narrows the list, or does not |

One pair of questions serves both, because *"which place does this message name
as the origin"* is the same judgment either way. The question describes the
message, not the tool that will consume it.

### The way out of the closed set

Every argument draws from a **closed set**, so whatever reaches a function is a
value that function accepts. The 17th answer, `not defined`, is what keeps that
from turning into a guess: a choice over 16 cities has to name one of them,
however little the message actually says. With the escape in the set,
*"ich will nach berlin fliegen"* answers `from` as `not defined`, and the code
can see that the call is incomplete instead of searching from an invented city.

The [function calling cookbook](https://docs.typesafe.ai/cookbooks/function_calling)
recommends a different shape for optional arguments: a second yes/no question per
argument — *"does the message say anything about the destination at all?"* —
which leaves the choice itself clean. Both work. On a handful of test sentences
the extra option gave the crisper numbers, and it needs three questions where the
yes/no variant needs seven.

### Types

The city list is a `const` object, which means `answers.from.choice` is typed as
`'Berlin' | 'Bremen' | ... | 'not defined'` and not as `string`. Narrowing away
`not defined` leaves the cities — no parsing, no validation, no mapping step.

Each answer carries its probabilities. Nothing in this example acts on them; a
real application would, for instance by asking the user to confirm below a
threshold, or by escalating a low-confidence route. See
[confidence](https://docs.typesafe.ai/confidence) for what those numbers mean.

## What is deliberately missing

This is the shortest thing that shows the mechanism. A real assistant would add:

- **Conversation state** — passing previous turns as part of `state`, so *"and
  the ones from Graz?"* can resolve.
- **Asking back** — an incomplete call currently returns `null` and prints it.
  The interesting part of *"ich will nach berlin fliegen"* is that the missing
  origin is visible at all; a real assistant would ask for it.
- **Dynamic options** — arguments whose candidates come from what is currently
  on screen, which is how *"book the cheapest one"* becomes a choice.
- **Writing, not just reading** — the bookings are loaded once and never change;
  there is no booking or cancelling.
- **Rendered output** instead of raw JSON.
