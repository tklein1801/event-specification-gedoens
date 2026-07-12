# Migrate-Command

Der `migrate`-Command migriert eine JSON-basierte AsyncAPI-Spezifikation zwischen
CloudEvents Binary/Unstructured Mode auf AsyncAPI 2.x und Structured Mode auf
AsyncAPI 3.x. Die fachliche Grundlage ist in [`wissen.md`](../wissen.md)
festgehalten.

> Der Command überschreibt die angegebene Datei erst nach einer erfolgreichen
> Migration. Vor der Verwendung auf produktiven Spezifikationen sollte die Datei
> versioniert oder gesichert sein.

## Aufruf

```shell
esg migrate to-structured asyncapi.json
esg migrate to-unstructured asyncapi.json
```

Die Kurzform des Commands ist `m`.

## Aktion `to-structured`

Eingabe ist ein AsyncAPI-2.x-Dokument. Folgende Aktionen werden ausgeführt:

1. `asyncapi` wird auf `3.0.0` gesetzt.
2. Jeder bisherige Channel-Key wird zur `address` des AsyncAPI-3-Channels.
3. `channels.<name>.subscribe` wird zu einer Top-Level-Operation mit
   `action: send`.
4. `channels.<name>.publish` wird zu einer Top-Level-Operation mit
   `action: receive`.
5. Vorhandene `operationId`-Werte werden als Operationsschlüssel übernommen.
   Fehlende oder doppelte Bezeichner werden stabil und kollisionsfrei erzeugt.
6. Operations-Messages werden unter `channels.<name>.messages` abgelegt und von
   der Operation referenziert. JSON-Pointer-Sonderzeichen in Channel-Namen
   werden dabei korrekt escaped.
7. Jede lokale Message wird in einen Structured-CloudEvent-Envelope überführt:
   - CloudEvent-Attribute aus `headers` und referenzierten Message-Traits werden
     zu `payload.properties`.
   - Die bisherige Fachpayload wird `payload.properties.data`.
   - `specversion`, `id`, `source`, `type` und `data` werden als Pflichtfelder
     modelliert.
   - `contentType` wird `application/cloudevents+json`.
   - Message-Beispiele werden von getrennten `headers`/`payload` zu einer
     gemeinsamen Structured-Payload umgebaut.
8. Migrierte Header-Traits werden aus `components.messageTraits` entfernt.
   Andere Trait-Inhalte bleiben an der jeweiligen Message erhalten.
9. Sonstige Dokument-, Channel-, Operations-, Message- und Component-Felder
   werden unverändert übernommen.

## Aktion `to-unstructured`

Eingabe ist ein AsyncAPI-3.x-Dokument. Folgende Aktionen werden ausgeführt:

1. `asyncapi` wird auf `2.0.0` gesetzt.
2. Die `address` eines Channels wird wieder zum Channel-Key. Fehlt sie, wird der
   logische Channel-Name verwendet.
3. Top-Level-Operationen mit `action: send` werden zu `subscribe`.
4. Top-Level-Operationen mit `action: receive` werden zu `publish`.
5. Der Operationsschlüssel wird als `operationId` eingetragen.
6. Explizit referenzierte Operations-Messages werden übernommen. Fehlt die
   Message-Liste, werden alle Messages des referenzierten Channels verwendet;
   mehrere Messages werden als `oneOf` modelliert.
7. Jede lokale Structured-CloudEvent-Message wird in Binary/Unstructured Mode
   zurückgeführt:
   - `payload.properties.data` wird wieder die Fachpayload.
   - Die übrigen Envelope-Felder werden zum Header-Schema.
   - `datacontenttype.const` beziehungsweise `.default` bestimmt den
     Message-`contentType`; ohne Angabe wird `application/json` verwendet.
   - Structured-Beispiele werden wieder in `headers` und `payload` getrennt.
8. Der Top-Level-Bereich `operations` entfällt im AsyncAPI-2-Ergebnis.

## Validierung und Fehlerfälle

Die Migration bricht ohne Schreibzugriff auf die Zieldatei ab, wenn unter
anderem:

- die Ausgangsversion nicht zur Aktion passt,
- Channels, Operationen oder Messages nicht als Objekte vorliegen,
- eine AsyncAPI-3-Operation keinen Top-Level-Channel referenziert,
- mehrere logische Channels dieselbe `address` verwenden,
- mehrere Operationen auf dieselbe AsyncAPI-2-Richtung eines Channels abgebildet
  würden oder
- einer Structured Message `payload.properties.data` fehlt.

Transport- und Binding-Felder werden erhalten, aber nicht protokollspezifisch
umgeschrieben. Insbesondere Server-Definitionen und seltene AsyncAPI-3-Konstrukte
wie Operation-Replies müssen bei Bedarf nach der Migration fachlich geprüft
werden.

## Implementierungsstruktur und Tests

Die Umsetzung trennt CLI, Datei-I/O, Auswahl der Migrationsstrategie,
Dokumentmigration, Navigation durch JSON-Referenzen und Message-Migration in
injizierbare Klassen. Öffentliche Ausführungsschritte sowie die eigentlichen
Migrationen verwenden den vorhandenen `@log`-Decorator.

Unit-Tests decken ab:

- CLI-Argumente und erlaubte Aktionen,
- die Read-Migrate-Write-Orchestrierung,
- beide Richtungen der Dokument- und Operationsmigration,
- direkte, referenzierte und `oneOf`-Messages,
- stabile kollisionsfreie Bezeichner,
- Structured-/Unstructured-Payloads und Beispiele,
- Trait- und Header-Behandlung sowie
- Versions- und Payload-Fehlerfälle.
