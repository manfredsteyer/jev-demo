# Task 002: Dashboard

Create a simple implementation of the dashboard used in the linked flights42 projekt

## Backend
Extend the current Jev-based server. Add a route for a "dashboard agent" and implement it using Jev similar to the current "agent". Add further tools. We only need to support what the DSL supports and convert it into questions for jev.

The DSL shall be converted to A2UI that is then rendered via copilotkit on the client. Send it down as an activity snapshot.

## Client
Create another route for the dashboard with a textbox with an example input (dashboard description), a generate buttion and the dashboared below.

Use copilotkit in the headless mode to connect to the agent on the server.