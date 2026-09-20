# First steps with Jev

## What the example shows

A small flight assistant in which [Jev](https://docs.typesafe.ai), TypeSafe's
System One model, makes the decisions. Jev does not write text. It answers
questions, and code turns the answers into actions.

- **Chat** (`/`): a traveller types a sentence, Jev picks a tool and its
  arguments, the server runs the tool and streams the result as
  [AG-UI](https://docs.ag-ui.com) events. CopilotKit's chat shows every flight
  as a widget.
- **Dashboard** (`/dashboard`): a traveller describes the tiles they want, Jev
  answers a questionnaire derived from a small dashboard DSL, and the server
  sends the dashboard down as [A2UI](https://a2ui.org). CopilotKit is used
  headless here.

The server in [server/](server/) is Node.js with Express, the client in
[client/](client/) is Angular with CopilotKit.

## Where the key for Jev goes

Into `server/.env`, as `TYPESAFE_API_KEY`:

```sh
cp server/.env.example server/.env
```

Get a key at <https://console.typesafe.ai/keys>. The file is ignored by git, and
the key never leaves the server. A `TYPESAFE_API_KEY` already exported in your
shell takes precedence.

## How to start it

You need Node 24, which runs the server's TypeScript directly.

```sh
npm install
npm --prefix server install
npm --prefix client install

npm run start:all
```

Then open <http://localhost:4200>. The server listens on
<http://localhost:3000>. `npm run dev` does the same in watch mode.
