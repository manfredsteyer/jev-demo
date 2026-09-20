# Function calling with Jev — an AG-UI server and a CopilotKit client

A traveller types a sentence into a chat. A Node.js server sends the conversation
to Jev, runs the tool Jev picked, and streams what happened back as
[AG-UI](https://docs.ag-ui.com) events. An Angular app renders that stream with
CopilotKit's chat component and shows every flight as a widget.

```
Angular + CopilotKit  --POST RunAgentInput-->  Node.js server      --questions-->  Jev
      <copilot-chat>  <--SSE: AG-UI events--   server/src/index.ts  <--answers--
```

A second route, [the dashboard](#the-dashboard), takes a description of the tiles
a traveller wants, lets Jev turn it into a small DSL and renders the result as
[A2UI](https://a2ui.org).

## Layout

| Path | Role |
| --- | --- |
| [server/src/index.ts](server/src/index.ts) | Express server. `cors` and `express.json()` handle the transport; each of the two routes, `/agent` and `/dashboard`, validates the `RunAgentInput` with the AG-UI schema and runs its agent against an SSE connection. |
| [server/src/sse.ts](server/src/sse.ts) | Opens the SSE response: sets the headers and returns `send`, which encodes an event through `EventEncoder`, and `close`. |
| [server/src/ag-ui.ts](server/src/ag-ui.ts) | The AG-UI vocabulary: `toConversation` reads the run's messages into plain turns, and one `emit*` function per kind of event the server sends covers the run lifecycle, tool calls and results, text messages, and activity snapshots and deltas. |
| [server/src/ticketing/agent.ts](server/src/ticketing/agent.ts) | One turn of the agent: reads the conversation from the run input, asks for a decision, runs the tool while announcing it, and emits the reply text plus one `flightWidget` call per flight. |
| [server/src/ticketing/state.ts](server/src/ticketing/state.ts) | What Jev sees: the `State` type and `toState`, which turns the AG-UI turns into a self-describing conversation whose assistant entries carry `flightsShown`. |
| [server/src/ticketing/decide.ts](server/src/ticketing/decide.ts) | The Jev questionnaire, the translation of its answers into a `Decision`, a tool with arguments or a reply, and `runTool`, which executes a decided tool. |
| [server/src/ticketing/message.ts](server/src/ticketing/message.ts) | The sentence the assistant says. |
| [server/src/cities.ts](server/src/cities.ts) | The 16 cities the airline serves, shared by both questionnaires. |
| [server/src/dashboard/spec.ts](server/src/dashboard/spec.ts) | The dashboard DSL: ten tile types and their parameters. |
| [server/src/dashboard/describe.ts](server/src/dashboard/describe.ts) | The dashboard's Jev questionnaire, derived from the DSL, and the translation of its answers into a `DashboardSpec`. |
| [server/src/dashboard/agent.ts](server/src/dashboard/agent.ts) | One run of the dashboard agent: either generates a dashboard from a description or reacts to a button pressed in one. |
| [server/src/dashboard/compile.ts](server/src/dashboard/compile.ts) | Turns a `DashboardSpec` into A2UI operations: a root `Column` with one child per tile. The tiles themselves live in [tiles/](server/src/dashboard/tiles/). |
| [server/src/dashboard/a2ui.ts](server/src/dashboard/a2ui.ts) | The A2UI vocabulary: the operation types and one builder per component the tiles use, the basic catalog's and the custom `TicketWidget`. |
| [server/src/dashboard/tools.ts](server/src/dashboard/tools.ts) | Wraps the tools for one run: announces every call as AG-UI events and runs the same call only once. |
| [server/src/dashboard/actions.ts](server/src/dashboard/actions.ts) | Reads a pressed button out of the run input and answers it with further A2UI operations. |
| [server/src/tools/](server/src/tools/) | The tools: a flight search, the traveller's bookings, check-in, a weather forecast, hotels, rental cars and SVG charts. Everything except the flight API is made up, but deterministic. |
| [server/public/images/](server/public/images/) | The photos of the hotels and rental cars, served under `/images`. |
| [client/](client/) | The Angular app. `/` is CopilotKit's chat with the `flightWidget` component; [`/dashboard`](client/src/app/dashboard/dashboard.ts) uses CopilotKit headless. Each has an `HttpAgent` pointed at its server route. |
| [client/src/app/a2ui/](client/src/app/a2ui/) | What renders A2UI: the activity renderer built on `@a2ui/angular`, the catalog and a plain-text renderer for `Text`. |
| [client/src/app/ticket-widget/](client/src/app/ticket-widget/) | The boarding pass, an Angular component the catalog offers as `TicketWidget`. |

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
npm start                     # http://localhost:4200, the dashboard at /dashboard
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
overrides the server's port, and `PUBLIC_URL` the address the photo URLs start with,
`http://localhost:3000` by default. Set `SHOW_JEV_RESULT` in
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

The dashboard renders A2UI with `@a2ui/angular` 0.10.5 and `@a2ui/web_core`
0.10.6, both pinned. `@a2ui/angular` still names Angular 21 as its peer, so
`overrides` in [client/package.json](client/package.json) point its Angular peers
at the versions the app uses.

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

## The dashboard

[/dashboard](client/src/app/dashboard/dashboard.ts) is a simplified version of the
dynamic dashboard in the flights42 project. There, an LLM reads the traveller's
description and writes a spec in a small DSL, which the server compiles into
A2UI. Here the DSL and the compile step are the same idea, but nothing writes
anything: Jev answers questions, and code assembles the spec from the answers.

```
description --> Jev: 33 questions --> DashboardSpec --> tools --> A2UI --> ACTIVITY_SNAPSHOT
```

### From a DSL to questions

The [DSL](server/src/dashboard/spec.ts) knows ten tiles: a table of all flights
on a route, a table of its delayed flights, a chart of the delay share, a chart
of the delays per day, boarding passes, the list of booked flights, a flight
search form, rental cars, hotels and a weather list. Jev cannot produce such an
object, but every part of it is a closed decision:

| Part of the DSL | Becomes |
| --- | --- |
| Is this tile wanted? | one Noul per tile type |
| `from`, `to`, `city`, `defaultFrom`, `defaultTo` | a Choice over the 16 cities, `NOT_DEFINED` or `NOT_SUPPORTED` |
| `maxRows`, `maxItems`, `count` | a Choice over `1` to `10`, `15`, `20`, `25`, `30`, `50` or `NOT_DEFINED` |
| `chartType` | a Choice over `pie`, `bar` or `NOT_DEFINED` |
| `showCheckInButton`, `showWeather` | a Noul each, asked as the opt-out, because both default to true |
| *"the same tiles for the opposite direction"* | one Noul; code repeats the route tiles with `from` and `to` swapped |

All 33 questions go out in **one** request, the
[speculative fan-out](https://docs.typesafe.ai/patterns/fan-out) the docs
recommend: about 5,400 input tokens and 0.3 to 1 second. The code reads the
parameters of a tile only when that tile's Noul is above 0.5. The answers for
tiles nobody asked for are often shaky, and nobody looks at them.

A number is not something Jev calculates, but picking the stated one out of a
closed set is an ordinary Choice, *"my next two flights"* included. `NOT_DEFINED`
again keeps the choice from guessing: without it, every table would get some
limit. Defaults are filled in when the spec is built, so the spec the client
sees as the arguments of `renderDashboard` is complete.

A tile that needs a route but did not get two served cities is left out, and the
run says so in a text message, which the page shows above the dashboard.

### What the wording taught

The questions were tried on 14 descriptions: the two examples of the page, terse
prose, German, missing and unsupported cities, single tiles and a question that
has nothing to do with dashboards. Three changes made the difference, and all
three are the [literal reading](https://docs.typesafe.ai/model-jaggedness/jev-1.13)
the Jev docs describe:

- Calling the state *"the tiles a traveller wants"* made Jev expect a list.
  *"Show the flights from Wien to Berlin as a table, plus the delayed ones"*
  scored 0.36 for the flight table. Calling it *"what a traveller wants to see"*
  raised that to 0.89.
- *"A flight-search tile defaulting to Graz / Hamburg"* made Graz the departure
  **and** the destination, because it literally says *"to Graz"*. The question
  now states the rule: of two cities named for the form, the first is the
  departure and the second the destination.
- Asking for *"a list of all the flights the traveller has booked"* dropped the
  tile as soon as the description said *"only the first 3"*, which is not all of
  them.

One judgment stays close to the threshold: *"My next three boarding passes"*
answers the booked-flights list with 0.47. It is correct, but not by much.

Closed questions also set two limits. Every tile type appears at most once per
direction, so two flight tables for unrelated routes cannot be expressed. And
the tiles come in the order of the DSL, not in the order of the description.

### Over the wire

```
RUN_STARTED
TOOL_CALL_START      renderDashboard                <- the spec built from Jev's answers
TOOL_CALL_ARGS       {"tiles":[{"type":"flightsTable","from":"Graz","to":"Hamburg","maxRows":30}, ...]}
TOOL_CALL_END
TOOL_CALL_START      findFlights                    <- once per route, however many tiles use it
TOOL_CALL_ARGS       {"from":"Graz","to":"Hamburg"}
TOOL_CALL_END
TOOL_CALL_RESULT     {"count":9}
...
ACTIVITY_SNAPSHOT    a2ui-surface                   <- { a2ui_operations: [createSurface, updateComponents, ...] }
TOOL_CALL_RESULT     {"tiles":8}                    <- the result of renderDashboard
RUN_FINISHED
```

The dashboard is not a chat message, so it travels as an activity. Its
`messageId` is the id of the A2UI surface.

### A2UI with CopilotKit

The page uses CopilotKit without its chat: `injectAgentStore('dashboard')` gives
the messages and the running state as signals, `copilotKit.core.runAgent` starts
a run, and CopilotKit's `<copilot-activity>` hands the activity message to the
renderer registered for its type.

CopilotKit brings an A2UI renderer of its own. It is built on Lit, so a custom
component would have to be a Lit component, and it ignores `weight`. This app
registers its own renderer instead,
[A2uiActivity](client/src/app/a2ui/a2ui-activity.ts), which feeds the operations
to `@a2ui/angular` and shows its `<a2ui-v09-surface>`:

- The [catalog](client/src/app/a2ui/catalog.ts) is the basic components plus
  `TicketWidget`, the boarding pass, an ordinary
  [Angular component](client/src/app/ticket-widget/ticket-widget.ts) with a zod
  schema for its properties. Being more than the basic catalog, it gets an id of
  its own, and the `catalogId` in the server's `createSurface` has to match it.
- The schema of a custom component is strict. `weight` is a property every basic
  component accepts, but `TicketWidget` only does because its schema lists it.
- Everything A2UI needs is provided on the lazy
  [dashboard route](client/src/app/dashboard/dashboard.routes.ts), including the
  renderer service, which would otherwise look for its catalog in the root
  injector. The chat never loads any of it.
- `Text` runs its content through a markdown renderer. The server only sends plain
  text, so [plain-text.ts](client/src/app/a2ui/plain-text.ts) escapes it and is
  done.
- `weight` works here, so [layout.ts](server/src/dashboard/tiles/layout.ts)
  builds a table as rows of weighted cells, and a table can give its date column
  more room than its flight number.
- The server cannot know how wide the screen is, so it does not lay the tiles out.
  The root is a plain `Column` with one child per tile, and
  [styles.css](client/src/styles.css) turns that one element into a CSS grid:
  three columns from 1200px, two from 700px, one below. The renderer sets the
  flex layout as inline styles, hence the `!important`. The boarding passes are
  no tile: they are a plain stack in a cell of that grid.
- A chart is an `Image` whose `url` is an SVG data URL, so the server needs no
  route for charts. The SVG states a width and a height, because the renderer
  scales an image down to its container but never up.
- The default theme of `@a2ui/angular` sets `color-scheme: light dark` on the
  root. [styles.css](client/src/styles.css) sets it back to `light` and themes the
  surface through the `--a2ui-*` custom properties.

### Buttons

When a button in the surface is pressed, the renderer gets the action with its
context already resolved, and `A2uiActivity` starts another run of the same agent
with the action in `forwardedProps.a2uiAction`. That is the shape CopilotKit's
own renderer uses.
[actions.ts](server/src/dashboard/actions.ts) recognises such a run, and Jev is
not asked: the action already carries typed values. The flight search runs
`findFlights` with the two fields, the check-in calls `checkIn`, and the answer
is an `ACTIVITY_DELTA` that appends operations to the dashboard's activity
message.

The renderer only processes the operations it has not seen yet. When the page is
left and opened again, it starts over and replays all of them. That is why the
search appends an `updateDataModel` with the submitted values next to the
results: without it, a replay would show the results of one search under the
defaults of the form.

## Skills

The official Angular skills are installed at project level in
[.claude/skills/](.claude/skills/) and pinned in `skills-lock.json`, so an agent
working in this repository follows current Angular conventions.

## What is deliberately missing

- **Dynamic options** — arguments whose candidates come from what is currently
  on screen, which is how *"book the cheapest one"* becomes a choice.
- **Writing, not just reading** — the bookings are loaded once and never change;
  there is no booking or cancelling. The dashboard's check-in is remembered in
  memory until the server restarts.
- **Threads and persistence** — the conversation lives in the browser tab.
