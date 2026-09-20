# Function calling with Jev — an AG-UI server and a CopilotKit client

A traveller types a sentence into a chat. A Node.js server sends the conversation
to Jev, runs the tool Jev picked, and streams what happened back as
[AG-UI](https://docs.ag-ui.com) events. An Angular app renders that stream with
CopilotKit's chat component and shows every flight as a widget.

```
Angular + CopilotKit  --POST RunAgentInput-->  Node.js server      --questions-->  Jev
      <copilot-chat>  <--SSE: AG-UI events--   server/src/index.ts  <--answers--
```

## Layout

| Path | Role |
| --- | --- |
| [server/src/index.ts](server/src/index.ts) | Express server. `cors` and `express.json()` handle the transport; the one route validates the `RunAgentInput` with the AG-UI schema and runs the agent against an SSE connection. |
| [server/src/sse.ts](server/src/sse.ts) | Opens the SSE response: sets the headers and returns `send`, which encodes an event through `EventEncoder`, and `close`. |
| [server/src/ag-ui.ts](server/src/ag-ui.ts) | The AG-UI vocabulary: `toConversation` reads the run's messages into plain turns, and one `emit*` function per kind of event the server sends covers the run lifecycle, tool calls and results, and text messages. |
| [server/src/ticketing/agent.ts](server/src/ticketing/agent.ts) | One turn of the agent: reads the conversation from the run input, asks for a decision, runs the tool while announcing it, and emits the reply text plus one `flightWidget` call per flight. |
| [server/src/ticketing/state.ts](server/src/ticketing/state.ts) | What Jev sees: the `State` type and `toState`, which turns the AG-UI turns into a self-describing conversation whose assistant entries carry `flightsShown`. |
| [server/src/ticketing/decide.ts](server/src/ticketing/decide.ts) | The Jev questionnaire, the translation of its answers into a `Decision`, a tool with arguments or a reply, and `runTool`, which executes a decided tool. |
| [server/src/ticketing/message.ts](server/src/ticketing/message.ts) | The sentence the assistant says. |
| [server/src/tools/](server/src/tools/) | The two tools: a flight search and the traveller's bookings. |
| [client/](client/) | The Angular app: CopilotKit's chat, an `HttpAgent` pointed at the server and the `flightWidget` component. |

## Run it

Server, in one terminal:

```sh
cd server
npm install
cp .env.example .env          # then put your key in it
npm start                     # http://localhost:3000/agent
```

Client, in another:

```sh
cd client
npm install
npm start                     # http://localhost:4200
```

Or both at once, from the repository root, once each side has its packages:

```sh
npm install                   # only concurrently
npm run start:all
```

Node 24 runs the TypeScript directly, so there is no build step on the server.
`npm run dev` in `server/` starts it in watch mode, which restarts the server
whenever a source file changes. From the repository root, `npm run dev` starts
that watch mode together with the client's `ng serve`, so both sides reload on
their own.
`npm start` reads `server/.env` if it is there; a `TYPESAFE_API_KEY` already
exported in your shell takes precedence. Get a key at <https://console.typesafe.ai/keys>. `PORT`
overrides the server's port. Set `SHOW_JEV_RESULT` in
[server/src/feature-flags.ts](server/src/feature-flags.ts) to print Jev's raw answer on the
server console before each reply, and `SHOW_TOKEN_USAGE` to append the tokens
Jev used as a final text message of every run.

## What goes over the wire

The client sends the whole conversation with every run, so the server keeps no
state. For *"flights from Graz to Hamburg"* it answers with this stream:

```
RUN_STARTED
TOOL_CALL_START      findFlights                    <- the tool the server ran
TOOL_CALL_ARGS       {"from":"Graz","to":"Hamburg"}
TOOL_CALL_END
TOOL_CALL_RESULT     [ { "id": 163, ... }, ... ]    <- its result, as the server saw it
TEXT_MESSAGE_START
TEXT_MESSAGE_CONTENT Flights I found:
TEXT_MESSAGE_END
TOOL_CALL_START      flightWidget                   <- one per flight, executed by the client
TOOL_CALL_ARGS       {"id":163,"from":"Graz","to":"Hamburg","date":"...","delayed":false}
TOOL_CALL_END
...
RUN_FINISHED
```

Two kinds of tool calls appear, and AG-UI tells them apart by whether a result
follows:

- **Server-side tools** (`findFlights`, `findBookings`) are executed on the server. The
  call goes out before the tool runs and its `TOOL_CALL_RESULT` after it, so the
  client can show the call as in progress and then what came back. CopilotKit renders them with its text-only default renderer, which the
  client opts into with `defaultToolRendering: true`.
- **`flightWidget`** is a client-side tool. The server emits the call and no
  result; the client owns it. The Angular app registers it with
  `registerComponent`, so CopilotKit renders the
  [FlightWidget](client/src/app/flight-widget/flight-widget.ts) component in place
  of the call and hands it the arguments as a signal. The widget receives
  `id`, `from`, `to`, `date` and `delayed`. `followUp: false` tells CopilotKit not
  to start another run once the widget is shown.

The server assumes that every run ends with a new user message. AG-UI lets a
client start a follow-up run after it has executed a tool, with the tool's result
as the last message; CopilotKit does that unless `followUp: false` is set. Such a
run would make this server ask Jev the same question again and emit the widgets a
second time. The client's `followUp: false` is what prevents it. A server meant
for arbitrary AG-UI clients would check the last message's role and answer a
follow-up run with `RUN_STARTED` and `RUN_FINISHED` only.

### Versions

The server uses `@ag-ui/core` and `@ag-ui/encoder` 1.0. CopilotKit for Angular
bundles `@ag-ui/client` 0.0.59, so the client installs that version explicitly. The
SSE wire format is the same on both sides. The server constructs the encoder
without the request's `Accept` header, which keeps it on SSE instead of negotiating
the protobuf encoding the two versions may not share.

## How Jev decides

Jev does not write the answer. It answers questions. This example asks three of
them, all in **one** request, over the conversation so far:

| Question | Type | Options |
| --- | --- | --- |
| `tool` | choice | `findFlights`, `findBookings`, `none` |
| `from` | choice | the 16 cities the airline serves, `NOT_DEFINED` or `NOT_SUPPORTED` |
| `to` | choice | the same 18 answers |

They are answered in parallel and independently of one another, so all three are
there before the code knows which tool it needs. That is on purpose: they cost
tokens, not a second round trip.

The conversation Jev sees is built from the run's messages and describes itself:
each assistant entry carries the heading it said and, as `flightsShown`, the
flights it rendered as widgets with `from`, `to` and `date`. That is why
*"und rückflug?"* after a booked Graz to Hamburg flight resolves to Hamburg as
origin and Graz as destination. The AG-UI layer only knows tool calls;
`state.ts` turns the `flightWidget` calls into `flightsShown` before asking, so
the questions need no explanation of the state's shape.

### Two tools, one pair of arguments

| Tool | What it does | How it reads `from` and `to` |
| --- | --- | --- |
| `findFlights` | searches the airline's connections | required — without both ends the assistant asks back |
| `findBookings` | lists this traveller's own flights | filters — each one narrows the list, or does not |

One pair of questions serves both, because *"which place does this message name
as the origin"* is the same judgment either way. The question describes the
message, not the tool that will consume it.

### The way out of the closed set

Every argument draws from a **closed set**, so whatever reaches a function is a
value that function accepts. `NOT_DEFINED` is what keeps that from turning into a
guess: a choice over 16 cities has to name one of them, however little the message
actually says. With the escape in the set, *"ich will nach berlin fliegen"*
answers `from` as `NOT_DEFINED`, and the code asks for the missing origin instead
of searching from an invented city. `NOT_SUPPORTED` catches a named place the
airline does not fly to.

The [function calling cookbook](https://docs.typesafe.ai/cookbooks/function_calling)
recommends a different shape for optional arguments: a second yes/no question per
argument, which leaves the choice itself clean. Both work. On a handful of test
sentences the extra option gave the crisper numbers, and it needs three questions
where the yes/no variant needs seven.

### Types

The city list is a `const` object, which means `answers.from.choice` is typed as
`'Berlin' | 'Bremen' | ... | 'NOT_DEFINED' | 'NOT_SUPPORTED'` and not as `string`.
Narrowing away the two escapes leaves the cities — no parsing, no validation, no
mapping step.

Each answer carries its probabilities. Nothing in this example acts on them; a
real application would, for instance by asking the user to confirm below a
threshold. See [confidence](https://docs.typesafe.ai/confidence) for what those
numbers mean.

## Skills

The official Angular skills are installed at project level in
[.claude/skills/](.claude/skills/) and pinned in `skills-lock.json`, so an agent
working in this repository follows current Angular conventions.

## What is deliberately missing

- **Dynamic options** — arguments whose candidates come from what is currently
  on screen, which is how *"book the cheapest one"* becomes a choice.
- **Writing, not just reading** — the bookings are loaded once and never change;
  there is no booking or cancelling.
- **Threads and persistence** — the conversation lives in the browser tab.
