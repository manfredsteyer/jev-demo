# Function calling with Jev -- a console chat

A small console chat that shows function calling with
[Jev](https://docs.typesafe.ai), TypeSafe's System One model.

You type a sentence. Jev does not write the answer; it answers a fixed set of
questions about your message -- which tool you want and which cities you mean.
The code then runs that tool and prints the result. There are two tools: one
searches flights in a public demo backend, the other lists the flights you have
already booked. Follow-ups build on the previous answer, and the chat
understands German as well as English.

```
> flights from Graz to Hamburg
Flights I found:
  Graz -> Hamburg, 2026-09-29 08:30 UTC, economy 152 EUR
  Graz -> Hamburg, 2026-09-30 08:20 UTC, economy 179 EUR
  ...

> and back?
Flights I found:
  Hamburg -> Graz, 2026-09-29 15:45 UTC, economy 155 EUR
  Hamburg -> Graz, 2026-09-30 08:20 UTC, economy 176 EUR
  ...

> have I booked that one already?
Your booked flights:
  Hamburg -> Graz, 2026-09-29 15:45 UTC, economy 155 EUR
```

The code lives in three places:

- [src/index.ts](src/index.ts) -- the questions for Jev, the dispatch and the chat loop.
- [src/message.ts](src/message.ts) -- turns a tool result into the text you see.
- [src/tools/](src/tools/) -- the flight search and the booked flights.

## Set the API key

Get a key at <https://console.typesafe.ai/keys>, then copy the template and put
the key into it:

```sh
cp .env.example .env
```

```
TYPESAFE_API_KEY=your-key
```

`.env` is ignored by git. A `TYPESAFE_API_KEY` that is already exported in your
shell works too and takes precedence over the file.

## Run it

You need Node 24 or newer. It runs the TypeScript files directly, so there is no
build step.

```sh
npm install
npm start
```

Ask for flights or for your bookings; Ctrl+C quits.

To see what Jev actually answered -- the choices, their probabilities and the
token usage -- set `SHOW_JEV_RESULT` in
[src/feature-flags.ts](src/feature-flags.ts) to `true`.
