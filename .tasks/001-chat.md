# Task 001: Chat

Mache einen Commandline Chat mit Node.js und Jev:

- Trenne UI und Logik
- Biete einige Function Calls ein
- Antworte mit Widgets (Function Calls, die bei einem Web-Client in ein Widget übersetzt werden können)

## Function Calls

- weather(ort: string): Liefert aktuelles Wetter (Fake-Wetter mit Temperatur und Sonnig, Bewölkt, Regnerisch auf englisch)
- flights(from: string, to: string)
  - Macht GET auf http://demo.angulararchitects.io/api/flight?from=xxx&to=xxx
- booked_flights(): Liefert Speicher, internes Array mit gebuchten Flügen. Standardmäßig sind die Flüge 1, 2 und 3 von hier gebucht: http://demo.angulararchitects.io/api/flight. Flug by Id: http://demo.angulararchitects.io/api/flight/1
- book(flightId: number): Fügt den Flug zur Liste der gebuchten Flüge hinzu
- cancel(flightId: number): Entfernt den Flug wieder von dieser Liste
- flight_widget(flight: Flight)
- flights_widget(flights: Flight[])

