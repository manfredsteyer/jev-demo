# Code conventions

These apply to all code in this repository.

## No comments

Do not write comments. No explanatory comments, no section banners, no JSDoc.
Names and structure carry the meaning.

## Braces around every block

Every block gets curly braces, including blocks of a single statement. There are
no exceptions for short `if`, `for`, `while` or `else` bodies.

Wrong:

```ts
if (message === '') continue;

if (!response.ok) throw new Error(`Flight API answered ${response.status}`);
```

Right:

```ts
if (message === '') {
  continue;
}

if (!response.ok) {
  throw new Error(`Flight API answered ${response.status}`);
}
```

## Function calls on their own line

A function call gets its own statement. Never embed one inside a literal --
not in an object literal, an array literal or a template literal. Assign the
result to a `const` first and put that name into the literal.

Wrong:

```ts
return { tool: 'flights', args: { from, to }, result: await searchFlights(from, to) };

const response = await fetch(`https://demo.angulararchitects.io/api/flight?${new URLSearchParams({ from, to })}`);
```

Right:

```ts
const result = await searchFlights(from, to);
return { tool: 'flights', args: { from, to }, result };

const query = new URLSearchParams({ from, to });
const response = await fetch(`https://demo.angulararchitects.io/api/flight?${query}`);
```
