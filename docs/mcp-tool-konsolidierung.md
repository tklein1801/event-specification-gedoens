# MCP-Tools: Bestand und fachliches Zielbild

Stand: 28.10.2026

Status: Konzept zur Abstimmung. Dieses Dokument beschreibt keine bereits implementierten Funktionen.

## 1. Entscheidungsvorschlag

Der MCP-Service soll fachliche Operationen statt einzelner Solace-API-Endpunkte anbieten.

Das Zielbild ersetzt 72 registrierbare Einzeltools durch 23 fachlich gebuendelte Tools.
Die Standardkonfiguration reduziert ihre ausschliesslich lesenden beziehungsweise lokalen Tools von 36 auf 5.
Diese Zahlen beschreiben Toolanzahlen, keine gemessene Tokenersparnis.

Die wichtigsten Aenderungen:

- `createEvent` erstellt ein Event einschliesslich initialer Event-Version.
- Optional erstellt dieselbe Operation das zugehoerige Schema einschliesslich Schema-Version.
- `inspectResource` liest Stammobjekt, ausgewaehlte Version und benoetigte Abhaengigkeiten gemeinsam.
- Eigene Operationen erstellen spaetere Versionen bereits vorhandener Objekte.
- Updates erhalten ungenannte Felder und Beziehungen.
- Lifecycle-Wechsel und Loeschungen bleiben ausdrueckliche Operationen.
- Die neue Schnittstelle ersetzt die alte Tooloberflaeche, statt sie dauerhaft zu ergaenzen.

Die Aufteilung kombiniert konkrete Schreiboperationen mit wenigen gemeinsamen Leseoperationen.
Ein universelles Tool fuer beliebige Aktionen ist ausdruecklich nicht vorgesehen.

## 2. Auftrag und Abgrenzung

Das Konzept soll Kontextverbrauch, Toolauswahl und notwendige Modellrunden reduzieren.
Es inventarisiert die aktuellen Tools und ordnet jedes Tool einer Zieloperation zu.
Es beschreibt Vertraege, Grenzen und eine spaetere Umstellung.

Quellcode und Konfiguration bleiben unveraendert.
Es wurden keine schreibenden Solace-Aufrufe ausgefuehrt.
Dieses Konzept liegt unter `docs/mcp-tool-konsolidierung.md`.

Nicht Bestandteil sind neue Event-API-Schreibfunktionen, Broker-Deployment oder ein allgemeines Changeset-System.
Die bestehende Webapp muss fuer diese Konsolidierung nicht umgebaut werden.

## 3. Beobachteter Ist-Zustand

### 3.1 Quellen und Ermittlung

Massgeblich sind die `server.registerTool`-Aufrufe unter `apps/mcp/src/tools`.
`apps/mcp/src/tools/index.ts` registriert alle neun Toolgruppen.
Die Schalter `ALLOW_CREATE`, `ALLOW_UPDATE` und `ALLOW_DELETE` begrenzen die sichtbaren Schreibtools.
Alle drei Schalter sind standardmaessig ausgeschaltet.

| Quellcodegruppe                       |  Immer | Create | Update | Delete | Gesamt |
| ------------------------------------- | -----: | -----: | -----: | -----: | -----: |
| Applications und Consumer             |      6 |      3 |      4 |      3 |     16 |
| Application Domains und Topic Domains |      4 |      2 |      1 |      2 |      9 |
| Events                                |      4 |      2 |      3 |      2 |     11 |
| Schemas                               |      4 |      2 |      3 |      2 |     11 |
| Enumerations                          |      4 |      2 |      3 |      2 |     11 |
| Event APIs                            |      4 |      0 |      0 |      0 |      4 |
| Suche                                 |      6 |      0 |      0 |      0 |      6 |
| AsyncAPI-Export                       |      2 |      0 |      0 |      0 |      2 |
| Migration und Serialisierung          |      2 |      0 |      0 |      0 |      2 |
| **Summe**                             | **36** | **11** | **14** | **11** | **72** |

Die existierende Dokumentation `docs/mcp.md` erfasst nicht alle registrierten Tools.
Insbesondere fehlen Suchtools, Consumer-Tools, Topic-Domain-Tools und `stringify_json_schema` in ihrer Toolaufstellung.
Das folgende Inventar verwendet deshalb den Quellcode als Grundlage.

### 3.2 Fachliches Modell

```text
Application Domain
  Topic Domain und Topic-Regeln
  Schema
    Schema-Version mit Inhalt
  Event
    Event-Version -> konkrete Schema-Version
                 -> Delivery Descriptor / Topic-Adresse
  Application
    Application-Version -> produzierte Event-Versionen
                        -> konsumierte Event-Versionen
                        -> Consumer mit Subscriptions
  Enumeration
    Enumeration-Version mit Werten
```

Ein Event ist hier ein Ereignistyp, keine transportierte Nachricht.
Stammobjekt und Version bleiben fachlich unterschiedliche Ressourcen.
Die neue Schnittstelle versteckt lediglich ihre technische Verkettung bei zusammengehoerigen Arbeitsschritten.
Event-Version und Schema-Version besitzen unabhaengige Versionsnummern.
Eine gemeinsame Operation darf sie nicht automatisch gleichsetzen.

### 3.3 Ursachen des Overheads

- Die Schnittstelle bildet Stammobjekt, Version, Suche und Beziehungen als einzelne Tools ab.
- Das Modell muss IDs aus Zwischenergebnissen in weitere Aufrufe uebernehmen.
- Fuer zusammengehoerige Lesevorgaenge fehlen fachliche Gesamtantworten.
- `ok` serialisiert Ergebnisse vollstaendig als formatierten JSON-Text.
- Die Tools reichen meist komplette SDK-Antworten statt gezielter fachlicher Ausschnitte zurueck.
- `stringify_json_schema` erzeugt eine weitere Modellrunde fuer eine interne Formatierungsaufgabe.

Tool-Discovery und Toolaufruf sind getrennte Vorgaenge.
MCP verlangt keine neue Discovery vor jedem Aufruf.
Wie oft der Client Definitionen nachlaedt, bestimmt dessen Integration.
Die beobachteten zwei Discoveries sind deshalb kein festes Protokollverhalten.

Der Server registriert aktuell einen festen, konfigurationsabhaengigen Toolbestand.
Er implementiert keine fachlich nachgeladenen Toolgruppen.
Die HTTP-Verarbeitung erzeugt pro Anfrage eine neue Serverinstanz.
Das beweist allein keine erneute clientseitige Discovery.

### 3.4 Vollstaendiges Toolinventar mit Zielzuordnung

Legende: A = immer verfuegbar, C = `ALLOW_CREATE`, U = `ALLOW_UPDATE`, D = `ALLOW_DELETE`.
Die Zielnamen beschreiben die vorgeschlagene neue Schnittstelle.

#### Applications und Consumer

| Aktuelles Tool                     | Gate | Heutiger Zweck                                  | Zieloperation                                                  |
| ---------------------------------- | ---- | ----------------------------------------------- | -------------------------------------------------------------- |
| `get_application`                  | A    | Application-Stammdaten lesen                    | `inspectResource`                                              |
| `get_applications`                 | A    | Applications filtern und auflisten              | `searchCatalog`                                                |
| `get_application_version`          | A    | Einzelne Application-Version lesen              | `inspectResource`                                              |
| `get_applications_versions`        | A    | Application-Versionen auflisten                 | `listVersions`                                                 |
| `get_application_consumer`         | A    | Einzelnen Consumer lesen                        | `inspectResource`                                              |
| `get_application_consumers`        | A    | Consumer auflisten                              | `searchCatalog`                                                |
| `create_application`               | C    | Application-Stammobjekt erstellen               | `createApplication`                                            |
| `create_application_version`       | C    | Application-Version erstellen                   | `createApplicationVersion` oder initial `createApplication`    |
| `create_application_consumer`      | C    | Consumer mit optionalen Subscriptions erstellen | `configureConsumer` oder eingebettet in Application-Erstellung |
| `update_application`               | U    | Application-Stammdaten ersetzen                 | `updateApplication`                                            |
| `update_application_version`       | U    | Application-Version bearbeiten                  | `updateApplication`                                            |
| `update_application_version_state` | U    | Versionsstatus wechseln                         | `setVersionState`                                              |
| `update_application_consumer`      | U    | Consumer und Subscriptions bearbeiten           | `configureConsumer`                                            |
| `delete_application`               | D    | Application loeschen                            | `deleteResource`                                               |
| `delete_application_version`       | D    | Application-Version loeschen                    | `deleteResource`                                               |
| `delete_application_consumer`      | D    | Consumer loeschen                               | `deleteResource`                                               |

#### Application Domains und Topic Domains

| Aktuelles Tool                    | Gate | Heutiger Zweck                       | Zieloperation                                         |
| --------------------------------- | ---- | ------------------------------------ | ----------------------------------------------------- |
| `get_application_domain`          | A    | Domain-Stammdaten lesen              | `inspectResource`                                     |
| `get_application_domains`         | A    | Domains nach Namen filtern           | `searchCatalog`                                       |
| `get_topic_domain`                | A    | Einzelne Topic Domain lesen          | `inspectResource`                                     |
| `get_topic_domains`               | A    | Topic Domains einer Domain auflisten | `searchCatalog` oder eingebettet in `inspectResource` |
| `create_application_domain`       | C    | Domain erstellen                     | `createDomain`                                        |
| `create_topic_domain`             | C    | Topic Domain erstellen               | `createDomain` oder nachtraeglich `createTopicDomain` |
| `update_application_domain`       | U    | Domain und Topic-Regeln bearbeiten   | `updateDomain`                                        |
| `delete_application_domain`       | D    | Domain loeschen                      | `deleteResource`                                      |
| `delete_application_topic_domain` | D    | Topic Domain loeschen                | `deleteResource`                                      |

#### Events

| Aktuelles Tool               | Gate | Heutiger Zweck                              | Zieloperation                                   |
| ---------------------------- | ---- | ------------------------------------------- | ----------------------------------------------- |
| `get_event`                  | A    | Event-Stammdaten lesen                      | `inspectResource`                               |
| `get_events`                 | A    | Events filtern und auflisten                | `searchCatalog`                                 |
| `get_event_version`          | A    | Event-Version lesen                         | `inspectResource`                               |
| `get_event_versions`         | A    | Event-Versionen auflisten                   | `listVersions`                                  |
| `create_event`               | C    | Event-Stammobjekt erstellen                 | `createEvent`                                   |
| `create_event_version`       | C    | Event-Version mit Schema-Verweis erstellen  | `createEventVersion` oder initial `createEvent` |
| `update_event`               | U    | Event-Stammdaten ersetzen                   | `updateEvent`                                   |
| `update_event_version`       | U    | Event-Version und Schema-Verweis bearbeiten | `updateEvent`                                   |
| `update_event_version_state` | U    | Versionsstatus wechseln                     | `setVersionState`                               |
| `delete_event`               | D    | Event loeschen                              | `deleteResource`                                |
| `delete_event_version`       | D    | Event-Version loeschen                      | `deleteResource`                                |

#### Schemas

| Aktuelles Tool                | Gate | Heutiger Zweck                        | Zieloperation                                     |
| ----------------------------- | ---- | ------------------------------------- | ------------------------------------------------- |
| `get_schema`                  | A    | Schema-Stammdaten lesen               | `inspectResource`                                 |
| `get_schemas`                 | A    | Schemas filtern und auflisten         | `searchCatalog`                                   |
| `get_schema_version`          | A    | Schema-Version samt Inhalt lesen      | `inspectResource`                                 |
| `get_schema_versions`         | A    | Schema-Versionen auflisten            | `listVersions`                                    |
| `create_schema`               | C    | Schema-Stammobjekt erstellen          | `createSchema`                                    |
| `create_schema_version`       | C    | Schema-Version erstellen              | `createSchemaVersion` oder initial `createSchema` |
| `update_schema`               | U    | Schema-Stammdaten ersetzen            | `updateSchema`                                    |
| `update_schema_version`       | U    | Schema-Version samt Inhalt bearbeiten | `updateSchema`                                    |
| `update_schema_version_state` | U    | Versionsstatus wechseln               | `setVersionState`                                 |
| `delete_schema`               | D    | Schema loeschen                       | `deleteResource`                                  |
| `delete_schema_version`       | D    | Schema-Version loeschen               | `deleteResource`                                  |

#### Enumerations

| Aktuelles Tool              | Gate | Heutiger Zweck                           | Zieloperation                                               |
| --------------------------- | ---- | ---------------------------------------- | ----------------------------------------------------------- |
| `get_enum`                  | A    | Enumeration-Stammdaten lesen             | `inspectResource`                                           |
| `get_enums`                 | A    | Enumerations filtern und auflisten       | `searchCatalog`                                             |
| `get_enum_version`          | A    | Enumeration-Version samt Werten lesen    | `inspectResource`                                           |
| `get_enum_versions`         | A    | Enumeration-Versionen auflisten          | `listVersions`                                              |
| `create_enum`               | C    | Enumeration-Stammobjekt erstellen        | `createEnumeration`                                         |
| `create_enum_version`       | C    | Enumeration-Version erstellen            | `createEnumerationVersion` oder initial `createEnumeration` |
| `update_enum`               | U    | Enumeration-Stammdaten ersetzen          | `updateEnumeration`                                         |
| `update_enum_version`       | U    | Enumeration-Version und Werte bearbeiten | `updateEnumeration`                                         |
| `update_enum_version_state` | U    | Versionsstatus wechseln                  | `setVersionState`                                           |
| `delete_enum`               | D    | Enumeration loeschen                     | `deleteResource`                                            |
| `delete_enum_version`       | D    | Enumeration-Version loeschen             | `deleteResource`                                            |

#### Event APIs, Suche, Export und Migration

| Aktuelles Tool                | Gate | Heutiger Zweck                               | Zieloperation                                                   |
| ----------------------------- | ---- | -------------------------------------------- | --------------------------------------------------------------- |
| `get_event_apis`              | A    | Event APIs filtern und auflisten             | `searchCatalog`                                                 |
| `get_event_api`               | A    | Event-API-Stammdaten lesen                   | `inspectResource`                                               |
| `get_event_api_versions`      | A    | Event-API-Versionen auflisten                | `listVersions`                                                  |
| `get_event_api_version`       | A    | Event-API-Version lesen                      | `inspectResource`                                               |
| `search_applications`         | A    | Applications nach Suchbegriff suchen         | `searchCatalog`                                                 |
| `search_events`               | A    | Events nach Suchbegriff suchen               | `searchCatalog`                                                 |
| `search_schemas`              | A    | Schemas nach Suchbegriff suchen              | `searchCatalog`                                                 |
| `search_enumerations`         | A    | Enumerations nach Suchbegriff suchen         | `searchCatalog`                                                 |
| `search_event_apis`           | A    | Event APIs nach Suchbegriff suchen           | `searchCatalog`                                                 |
| `search_event_api_products`   | A    | Event-API-Produkte nach Suchbegriff suchen   | `searchCatalog`                                                 |
| `export_application_asyncapi` | A    | Application-Version als AsyncAPI exportieren | `exportAsyncApi`                                                |
| `export_event_api_asyncapi`   | A    | Event-API-Version als AsyncAPI exportieren   | `exportAsyncApi`                                                |
| `migrate_asyncapi`            | A    | AsyncAPI zwischen zwei Profilen migrieren    | `migrateAsyncApi`                                               |
| `stringify_json_schema`       | A    | JSON-Objekt in Text umwandeln                | Entfaellt extern, interne Normalisierung bei Schema-Operationen |

Event-API-Produkte sind heute nur ueber die Suche erreichbar.
Das Zielbild fuehrt dafuer keine bislang fehlenden Detail- oder Schreibfunktionen ein.

## 4. Gruppierungsprinzipien

### 4.1 Fachlicher Auftrag statt technischer Einzelschritt

Zusammengehoerige Erstellungen bilden eine Operation.
Das Modell liefert die fachlichen Eingaben, der Service uebernimmt ID-Verkettung und Ergebnispruefung.
Die interne Anzahl der Solace-Aufrufe kann gleich bleiben oder durch Pruefungen steigen.
Weniger Modellrunden bedeuten nicht automatisch weniger Backend-Aufrufe.

### 4.2 Kein einzelnes Universalwerkzeug

Ein Tool wie `execute(action, resourceType, payload)` reduziert Namen, aber versteckt fachliche Unterschiede.
Es erschwert Eingabevalidierung, Rechtepruefung und die Erkennung destruktiver Aktionen.
Die konkreten Create- und Update-Tools behalten deshalb eigene, ueberschaubare Vertraege.

Lesen, Versionslisten und Statuswechsel haben dagegen ausreichend gemeinsame Strukturen.
Hier begrenzt eine Ressourcentyp-Auswahl die benoetigten Varianten.
Jede Variante erhaelt ein eindeutig validierbares Eingabeschema.

### 4.3 Kleine Antworten statt unbegrenzter Vollstaendigkeit

Kompakte Antworten enthalten IDs, Namen, Versionsnummern, Status und relevante Referenzen.
Schema-Inhalte und abhaengige Ressourcen erscheinen nur bei ausdruecklichem Bedarf.
Listen liefern standardmaessig hoechstens 20 Eintraege je Seite.
Antworten melden weitere Seiten und ausgelassene Inhalte ausdruecklich.
Keine Operation laedt automatisch alle Versionen oder den gesamten Domain-Bestand.

Eine Antwort verwendet einen primaeren Datenblock.
Sie wiederholt grosse Inhalte nicht gleichzeitig in mehreren Ausgabeformen.
Ein spaeterer strukturierter Ausgabevertrag soll die bisherige freie SDK-Antwort ersetzen.

## 5. Zielkatalog: 23 Tools

Die Namen verwenden einheitlich camelCase.
Die Umbenennung allein reduziert keinen Overhead.
Die Einsparung entsteht durch weniger sichtbare Definitionen, kleinere Ergebnisse und weniger Aufrufketten.

| Nr. | Zieltool                   | Fachlicher Vertrag                                                                           | Gate                          |
| --: | -------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------- |
|   1 | `searchCatalog`            | Einen Ressourcentyp suchen oder gefiltert auflisten                                          | A                             |
|   2 | `inspectResource`          | Ressource mit ausgewaehlter Version und begrenzten Abhaengigkeiten lesen                     | A                             |
|   3 | `listVersions`             | Versionen eines angegebenen Ressourcentyps gefiltert auflisten                               | A                             |
|   4 | `createDomain`             | Application Domain mit optionalen initialen Topic Domains erstellen                          | C                             |
|   5 | `createTopicDomain`        | Einer bestehenden Domain eine Topic Domain hinzufuegen                                       | C                             |
|   6 | `createSchema`             | Schema mit verpflichtender initialer Version und Inhalt erstellen                            | C                             |
|   7 | `createEvent`              | Event mit verpflichtender initialer Version und Schema-Verknuepfung erstellen                | C                             |
|   8 | `createApplication`        | Application mit initialer Version, Event-Beziehungen und optionalen Consumern erstellen      | C                             |
|   9 | `createEnumeration`        | Enumeration mit initialer Version und Werten erstellen                                       | C                             |
|  10 | `createSchemaVersion`      | Version eines vorhandenen Schemas erstellen                                                  | C                             |
|  11 | `createEventVersion`       | Version eines vorhandenen Events mit optionaler neuer Schema-Version erstellen               | C                             |
|  12 | `createApplicationVersion` | Application-Version mit Beziehungen und optionalen Consumern erstellen                       | C                             |
|  13 | `createEnumerationVersion` | Version einer vorhandenen Enumeration erstellen                                              | C                             |
|  14 | `updateDomain`             | Domain-Stammdaten und Topic-Regeln gezielt aendern                                           | U                             |
|  15 | `updateSchema`             | Schema-Stammdaten und/oder konkrete Entwurfsversion gezielt aendern                          | U                             |
|  16 | `updateEvent`              | Event-Stammdaten und/oder konkrete Entwurfsversion gezielt aendern                           | U                             |
|  17 | `updateApplication`        | Application-Stammdaten und/oder konkrete Entwurfsversion einschliesslich Beziehungen aendern | U                             |
|  18 | `updateEnumeration`        | Enumeration-Stammdaten und/oder konkrete Entwurfsversion aendern                             | U                             |
|  19 | `configureConsumer`        | Consumer mit Subscriptions erstellen oder gezielt aktualisieren                              | C oder U, abhaengig vom Modus |
|  20 | `setVersionState`          | Explizit ausgewaehlte Versionen in einen Lifecycle-Status ueberfuehren                       | U                             |
|  21 | `deleteResource`           | Eine explizit bezeichnete Ressource ohne implizite Kaskade loeschen                          | D                             |
|  22 | `exportAsyncApi`           | Application- oder Event-API-Version exportieren und optional anschliessend migrieren         | A                             |
|  23 | `migrateAsyncApi`          | Vorliegenden AsyncAPI-Inhalt lokal migrieren                                                 | A                             |

`configureConsumer` erscheint nur, wenn mindestens ein zugehoeriger Schreibmodus aktiviert ist.
Der Service prueft den jeweiligen Modus erneut waehrend des Aufrufs.
Ein aktivierter Update-Modus darf keinen Create-Modus freischalten.

Die fachliche Toolanzahl bleibt 23, auch wenn der Client Definitionen verzoegert laedt.
Es braucht keinen zusaetzlichen Discovery-Router fuer dieses Zielbild.

## 6. Zentrale Eingabe- und Ausgabevertraege

### 6.1 Gemeinsame Referenzen und Versionsauswahl

Eine Ressourcenreferenz enthaelt den Ressourcentyp und eine stabile ID.
Fuer eine Versionsreferenz ersetzt die konkrete Versions-ID die Stammobjekt-ID.
Listen behalten bestehende Filter auf IDs, Domains, Namen, Broker, Typ und Freigabe bei, soweit unterstuetzt.
Der Zielvertrag unterscheidet Filterlisten von echter Suchbegriffsuche.
Nicht unterstuetzte Kombinationen liefern einen klaren Eingabefehler.
Eine kombinierte Suche ueber alle Ressourcentypen ist nicht der Standard.

Eine Versionsauswahl verwendet genau eine der folgenden Varianten:

- Eine konkrete `versionId`.
- Fuer Lesen: die Kombination aus Stammobjekt-ID und exakter `version`.
- Eine ausdrueckliche Lesestrategie, beispielsweise `latestReleased`.

Der Service definiert Reihenfolge und Gleichstandsbehandlung fuer jede Lesestrategie.
Schreiboperationen akzeptieren keine implizite Auswahl der neuesten Version.
Schreiboperationen auf bestehenden Versionen verlangen ausschliesslich deren konkrete Versions-ID.
Neue Versionen verlangen stattdessen die Stammobjekt-ID und ihre neue Versionsnummer.
Mehrdeutige Namen oder widerspruechliche IDs stoppen den Vorgang vor dem Schreiben.

### 6.2 `inspectResource`: fachlichen Kontext in einem Aufruf lesen

Eingaben:

- `resourceType`: Domain, Topic Domain, Event, Schema, Application, Consumer, Enumeration oder Event API.
- `id`: Stammobjekt-ID oder konkrete Ressourcen-ID, entfaellt bei alleiniger Versions-ID.
- `versionSelector`: optional fuer versionierte Stammobjekte, erforderlich fuer angeforderte Versionsinhalte.
- `include`: begrenzte Auswahl aus `schema`, `schemaContent`, `relationships`, `consumers` und `topicDomains`.
- `detail`: standardmaessig `summary`, alternativ `full` fuer die ausgewaehlten Inhalte.

Eine konkrete Versions-ID reicht aus, um auch das zugehoerige Stammobjekt intern aufzugeloesen.
Ohne Versionsauswahl liefert das Tool nur Stammdaten, keine stillschweigend ausgewaehlte Version.
Die Antwort nennt alle aufgeloesten IDs und die angewendete Auswahl.
Abhaengigkeiten werden begrenzt expandiert, nicht rekursiv unbegrenzt verfolgt.

Beispiel: Schema einschliesslich gewuenschter Version und Inhalt lesen.

```json
{
  "resourceType": "schema",
  "id": "schema-123",
  "versionSelector": { "version": "1.0.0" },
  "include": ["schemaContent"]
}
```

Beispiel: Event einschliesslich Version und zugehoerigem Schema lesen.

```json
{
  "resourceType": "event",
  "id": "event-123",
  "versionSelector": { "versionId": "event-version-456" },
  "include": ["schema", "schemaContent", "relationships"]
}
```

### 6.3 `createEvent`: Event und initiale Version gemeinsam erstellen

Verpflichtend sind Domain-ID, Name, Broker, Freigabeeinstellung und `initialVersion`.
`requiresApproval` bleibt als optionales Event-Merkmal erhalten.
Die initiale Version enthaelt Versionsnummer, optionale Beschreibung und optionalen Anzeigenamen.
Die Adresse bleibt optional, sofern Domain-Regeln sie nicht verlangen.

`schema` ist eine diskriminierte Auswahl mit genau einem Modus:

| Modus             | Eingaben                                                           | Wirkung                                                     |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `existingVersion` | `schemaVersionId`                                                  | Vorhandene Schema-Version pruefen und verknuepfen           |
| `newVersion`      | `schemaId`, Versionsnummer, Inhalt und optionale Versionsmetadaten | Version eines bestehenden Schemas erstellen und verknuepfen |
| `newSchema`       | Name, Schema-Typ, Freigabe und initiale Schema-Version             | Schema samt Version erstellen und verknuepfen               |

Die Domain eines neuen Schemas entspricht standardmaessig der Event-Domain.
Abweichende Domain-Referenzen erfordern ausdrueckliche Angaben und fachliche Freigabepruefungen.
Eine implizite Aenderung bestehender Schema-Versionen findet niemals statt.

```json
{
  "applicationDomainId": "domain-123",
  "name": "OrderCreated",
  "brokerType": "solace",
  "shared": false,
  "initialVersion": {
    "version": "1.0.0",
    "description": "Eine Bestellung wurde angelegt.",
    "eventAddress": {
      "addressType": "topic",
      "topic": "orders/created/v1"
    }
  },
  "schema": {
    "mode": "newSchema",
    "name": "OrderCreatedPayload",
    "schemaType": "jsonSchema",
    "shared": false,
    "initialVersion": {
      "version": "1.0.0",
      "content": {
        "type": "object",
        "properties": {
          "orderId": { "type": "string" }
        },
        "required": ["orderId"]
      }
    }
  }
}
```

Das Beispiel beschreibt den Zielvertrag, kein heute aufrufbares Tool.
Der Broker der Event-Adresse wird aus dem Event uebernommen, statt doppelt abgefragt.
Strukturierte Topic-Segmente sollen Literale, Variablen und Enumeration-Verweise unterscheiden.
Wenn die erste Umsetzung nur Literale unterstuetzt, muss sie andere Segmente ausdruecklich ablehnen.

Interner Ablauf bei `newSchema`:

1. Eingaben, Domain, Referenzen, Topic-Regeln und aktivierte Operationen pruefen.
2. Schema-Stammobjekt erstellen.
3. Initiale Schema-Version erstellen.
4. Event-Stammobjekt erstellen.
5. Initiale Event-Version mit der erzeugten Schema-Version erstellen.
6. Erzeugte Ressourcen und Beziehungen erneut lesen.
7. Kompaktes Gesamtergebnis mit allen IDs zurueckgeben.

`existingVersion` ueberspringt die Schritte 2 und 3.
`newVersion` erstellt nur die Schema-Version, nicht das Schema-Stammobjekt.
Die Operation endet standardmaessig im Entwurf.
Sie setzt keinen Lifecycle-Status automatisch auf `Released`.

### 6.4 Weitere Erstellungsoperationen

`createSchema` verlangt Stammobjektdaten und eine initiale Version mit nichtleerem Inhalt.
JSON-Inhalte duerfen als Objekt vorliegen und werden intern serialisiert.
Andere Schema-Typen erhalten ihre passende Textdarstellung.
Eine AsyncAPI-Migration darf nicht pauschal auf XSD, DTD, Avro oder Protobuf angewendet werden.
Ein vereinbartes Inhaltsprofil unterscheidet JSON Schema von vollstaendigen AsyncAPI-Dokumenten.

`createApplication` verlangt Stammobjektdaten und eine initiale Application-Version.
Diese Version darf produzierte und konsumierte Event-Versionen sowie Consumer mit Subscriptions enthalten.
Consumer referenzieren die neu erzeugte Application-Version intern.
Die Antwort bestaetigt die tatsaechlich gespeicherten Beziehungen.

`createEnumeration` verlangt eine initiale Version mit Werten.
`createDomain` nimmt optional initiale Topic Domains samt Broker und Praefix entgegen.
`createTopicDomain` deckt dieselbe Anlage fuer bereits bestehende Domains ab.

Die vier `create*Version`-Tools verlangen jeweils eine bestehende Stammobjekt-ID und die neue Versionsnummer.
Optionales Kopieren verlangt eine konkrete Ausgangsversions-ID.
`createEventVersion` verwendet dieselbe Schema-Auswahl wie `createEvent`.
`createApplicationVersion` erlaubt dieselben Beziehungen und Consumer wie die initiale Erstellung.

### 6.5 Updates: vorhandene Daten erhalten

Jedes `update*`-Tool trennt Stammobjekt-Aenderungen von Aenderungen einer konkreten Version.
Mindestens einer dieser Bereiche muss Aenderungen enthalten.
Versionierte Inhaltsaenderungen zielen standardmaessig ausschliesslich auf `Draft`.
Andere Lifecycle-Zustaende erfordern eine neue Version statt einer stillen Inhaltsaenderung.

Der Service liest den aktuellen Stand intern und ergaenzt technisch erforderliche Bestandsfelder.
Unangegebene Felder bleiben unveraendert.
Leere Arrays bedeuten nur bei ausdruecklicher Angabe das Entfernen einer Beziehungsliste.
Versehentliches Leeren bestehender Consumer ist ausgeschlossen.
Dieselben Regeln gelten fuer `configureConsumer` im Update-Modus.
Fehlende Subscriptions bleiben erhalten, waehrend `subscriptions: []` sie ausdruecklich entfernt.
Consumer-Loeschungen erfolgen ausschliesslich ueber `deleteResource`.

Eine Aenderung an einer bestehenden Schema-Version verlangt `updateSchema`.
`updateEvent` kann einen anderen Schema-Verweis setzen, aber kein gemeinsam verwendetes Schema stillschweigend ueberschreiben.
Eine neue Event-Version samt neuer Schema-Version entsteht ueber `createEventVersion`.

Updates koennen einen erwarteten Ausgangsstand enthalten.
Der Service nutzt serverseitige Konfliktmechanismen, sofern Solace sie bereitstellt.
Ein vorheriger Lesevergleich allein garantiert keinen Schutz vor gleichzeitigen Aenderungen.
Diese Grenze muss im Ergebnis erkennbar bleiben.

### 6.6 Lifecycle und Loeschung

`setVersionState` unterstuetzt `Draft`, `Released`, `Deprecated` und `Retired`.
Es nimmt eine ausdrueckliche Liste konkreter Versionsreferenzen und den gewuenschten Zielstatus entgegen.
Abhaengige Versionen werden nur dann mitgeaendert, wenn sie ebenfalls explizit aufgefuehrt sind.
Bei mehreren Versionen prueft und meldet der Service die Reihenfolge und jedes Teilergebnis.
Solace bleibt fuer erlaubte Statusuebergaenge massgeblich.

`deleteResource` akzeptiert genau eine konkrete Ressourcenreferenz.
Es unterstuetzt Stammobjekte, Versionen, Consumer, Application Domains und Topic Domains des heutigen Schreibumfangs.
Es loescht keine referenzierten Schemas oder weiteren Ressourcen implizit.
Eine explizite Bestaetigung und eine vorgeschaltete Abhaengigkeitspruefung schuetzen vor versehentlichen Loeschungen.
Die Umsetzung muss auch serverseitige Kaskaden identifizieren und gegebenenfalls blockieren.

Ein Lifecycle-Wechsel ist kein Broker-Deployment und keine Produktveroeffentlichung.
Ein missverstaendliches `publishEvent` gehoert deshalb nicht zum Zielkatalog.

### 6.7 Export und Migration

`exportAsyncApi` unterscheidet als Quelle `application` und `eventApi`.
Es verlangt eine konkrete Versions-ID und behaelt Format sowie Extension-Auswahl bei.
Ohne Migration bleiben die heute angebotenen Exportversionen erhalten.
Eine optionale Migration fuehrt den vorhandenen lokalen Migrationskern unmittelbar anschliessend aus.
Quellversion, Zielprofil und tatsaechliche Ergebnisversion stehen getrennt in der Antwort.
Zwischeninhalte werden standardmaessig nicht zurueckgegeben.

`migrateAsyncApi` bleibt fuer bereits vorliegende Inhalte eigenstaendig verfuegbar.
Eine erfolgreiche Migration bedeutet keine vollstaendige AsyncAPI-Spezifikationsvalidierung.
Die heutige Grundpruefung darf nicht als umfassender fachlicher Validierungsnachweis ausgegeben werden.

## 7. Fehler, Wiederholungen und Berechtigungen

### 7.1 Keine behauptete Atomaritaet

Mehrere Solace-Aufrufe bilden keine nachgewiesene Transaktion.
Ein Toolaufruf kann deshalb teilweise erfolgreich sein.
Die Antwort muss bereits erzeugte Ressourcen auch bei spaeteren Fehlern benennen.

Ein gemeinsamer Ergebnisrahmen fuer schreibende Operationen enthaelt:

```json
{
  "status": "completed",
  "resources": {
    "eventId": "event-123",
    "eventVersionId": "event-version-456",
    "schemaId": "schema-789",
    "schemaVersionId": "schema-version-012"
  },
  "steps": [{ "name": "createEventVersion", "status": "completed" }],
  "verification": { "status": "completed" },
  "warnings": [],
  "recovery": null
}
```

`status` unterscheidet `completed`, `partial` und `failed`.
Die Verifikation unterscheidet ebenfalls Erfolg, Fehler und einen unbekannten Ausgang nach Timeout.
Fehlerhafte oder teilweise ausgefuehrte Operationen muessen auch auf MCP-Ebene als Fehler erkennbar sein.
Bei Timeout darf die Antwort nicht behaupten, der letzte Schreibschritt sei sicher fehlgeschlagen.

Automatisches Zurueckloeschen ist nicht der Standard.
Es koennte geteilte Ressourcen entfernen und benoetigt zusaetzliche Berechtigungen.
Stattdessen liefert die Operation sichere Hinweise zur Fortsetzung.

### 7.2 Sichere Wiederholung

Die spaetere Umsetzung braucht eine ausdrueckliche Idempotenzstrategie fuer Erstellungsoperationen.
Ein Request-Schluessel allein reicht ohne verlaesslichen Speicher oder Backend-Unterstuetzung nicht aus.
Die HTTP-Schnittstelle besitzt derzeit keinen dauerhaften Workflow-Zustand.

Vor einer produktiven Einfuehrung muss ein nach Authentifizierungskontext getrennter Fortschrittsspeicher oder gleichwertiger Mechanismus feststehen.
Dieser Mechanismus ordnet Request-Schluessel, Eingabepruefsumme, Schritte und erzeugte IDs einander zu.
Eine Wiederholung darf nur belegbar zugehoerige Ressourcen weiterverwenden.
Eine Namensgleichheit allein beweist diese Zugehoerigkeit nicht.
Ohne verlaesslichen Mechanismus muss die Antwort automatisches Wiederholen ausdruecklich untersagen.

### 7.3 Gates und Backend-Rechte

Die vorhandenen Schreibschalter bleiben eine erste Zugriffsschranke.
Jeder eingeschlossene Schritt benoetigt zusaetzlich die entsprechenden Solace-Rechte.
Eine initiale Version kann andere Backend-Rechte verlangen als das Erstellen ihres Stammobjekts.
Vorabpruefungen sind nur so verbindlich wie die verfuegbaren Solace-Pruefmoeglichkeiten.
Fehlende Rechte muessen gegebenenfalls als Teilfehler behandelt werden.

Create-Buendel fuehren nur Erstellungen aus.
Lifecycle-Wechsel und Updates bestehender Ressourcen bleiben ausserhalb dieser Buendel.
Updates, die Ressourcen erstellen sollen, werden stattdessen als ausdrueckliche Create-Operation modelliert.
So hebelt kein Buendel die bestehenden Schalter aus.

Tenant-, Organisations- und Tokenkontext muessen in allen Schritten erhalten bleiben.
Zwischenspeicher und Wiederholungsdaten muessen denselben Kontext beruecksichtigen.
Antworten und Logs duerfen keine Zugangsdaten enthalten.

### 7.4 Laufzeit und Last

Der aktuelle HTTP-Server serialisiert SDK-Zugriffe wegen globaler Authentifizierungskonfiguration.
Laengere Buendel koennen daher andere Anfragen laenger blockieren.
Die Konsolidierung muss diese Isolation erhalten.
Sie darf Schritte nicht unkontrolliert parallelisieren.

Die spaetere Umsetzung begrenzt Schrittanzahl, Antwortgroesse und Backend-Laufzeiten.
Der HTTP-Request-Timeout allein ist kein Nachweis fuer einen wirksamen Abbruch laufender SDK-Aufrufe.
Ein asynchrones Jobmodell waere eine spaetere Erweiterung, nicht Voraussetzung dieses fachlichen Katalogs.

## 8. Erwartete Entlastung

### 8.1 Sichtbare Tooldefinitionen

| Konfiguration                      | Heute | Ziel | Reduktion der Toolanzahl |
| ---------------------------------- | ----: | ---: | -----------------------: |
| Standard, alle Schreibschalter aus |    36 |    5 |          rund 86 Prozent |
| Alle Schreibschalter an            |    72 |   23 |          rund 68 Prozent |

Weniger Tools garantieren nicht dieselbe prozentuale Tokenersparnis.
Groessere Eingabeschemas koennen einen Teil der Einsparung aufbrauchen.
Die Vertraege brauchen deshalb kompakte Beschreibungen und begrenzte Varianten.
Ausfuehrliche Beispiele gehoeren in Dokumentation statt in jede Tooldefinition.

### 8.2 Modellseitige Aufrufketten

Die folgenden Vergleiche gelten bei bereits bekannten IDs und vollstaendigen fachlichen Eingaben.
Zusaetzliche Suchaufrufe bleiben bei unbekannten oder mehrdeutigen Ressourcen notwendig.

| Aufgabe                                                                     | Heutige Toolaufrufe |            Zielaufrufe |
| --------------------------------------------------------------------------- | ------------------: | ---------------------: |
| Schema und konkrete Schema-Version lesen                                    |                   2 |   1: `inspectResource` |
| Event, Version und zugehoerige Schema-Version lesen                         |                   3 |   1: `inspectResource` |
| Event mit initialer Version und vorhandener Schema-Version erstellen        |                   2 |       1: `createEvent` |
| Schema, initiale Schema-Version, Event und initiale Event-Version erstellen |                   4 |       1: `createEvent` |
| Application, initiale Version und einen Consumer erstellen                  |                   3 | 1: `createApplication` |
| Application Domain mit einer Topic Domain erstellen                         |                   2 |      1: `createDomain` |
| Export abrufen und anschliessend migrieren                                  |                   2 |    1: `exportAsyncApi` |

Separate Modellaufrufe zur Ergebnispruefung koennen ebenfalls entfallen, weil die Buendel intern verifizieren.
Diese internen Pruefungen zaehlen weiterhin als Backend-Aufrufe.
Discovery-Runden und Toolaufrufe muessen getrennt gemessen werden.

### 8.3 Nachweis vor einer Umstellung

Ein spaeterer Vergleich nutzt identische Aufgaben und denselben Client.
Er erhebt mindestens:

- Groesse und Tokenumfang der tatsaechlich geladenen Tooldefinitionen.
- Anzahl clientseitiger Discoveries und Modellaufrufe pro Aufgabe.
- Antwortgroesse sowie Anteil ungenutzter Metadaten.
- Backend-Aufrufe, Laufzeit und Wartezeit anderer Anfragen.
- Erfolgsquote, Teilfehler und sichere Fortsetzung nach Timeout.

Toolanzahl und Aufrufketten sind hier statisch ermittelt.
Tokenverbrauch, Laufzeiten und Verhalten einzelner Clients wurden nicht experimentell gemessen.

## 9. Spaetere Umstellung

Diese Schritte beschreiben eine kuenftige Implementierung, keine aktuelle Aenderung.

1. Fachliche Vertraege, Versionsauswahl und Fehlerrahmen anhand dieses Dokuments abstimmen.
2. Eine gemeinsame fachliche Serviceschicht fuer Lesen, Erstellung, Updates und Verifikation einfuehren.
3. Zuerst `inspectResource`, `createSchema` und `createEvent` umsetzen und gegen typische Aufgaben pruefen.
4. Die uebrigen Tools mit der vollstaendigen Alt-Neu-Zuordnung abdecken.
5. Ein neues Schnittstellenprofil oder einen getrennten Endpunkt fuer die gebuendelten Tools bereitstellen.
6. Bestehende Clients voruebergehend auf dem alten Profil belassen.
7. Clients, Beispiele und `skills/solace-event-portal/SKILL.md` auf das neue Profil umstellen.
8. Das alte Profil nach einer vereinbarten Uebergangsfrist abschalten.

Ein Client soll nicht gleichzeitig beide vollstaendigen Toolkataloge laden.
Andernfalls steigt der Kontextumfang waehrend der Umstellung.
Die konkrete Profilkonfiguration ist eine spaetere technische Entscheidung.
Ein neues Profil ist keine heute vorhandene Serverfunktion.

Das neue Profil bietet bewusst keine vollstaendige Verhaltensgleichheit zum alten Katalog.
Reine Stammobjekt-Erstellungen ohne initiale Version entfallen fuer Events, Schemas, Applications und Enumerations.
Schema-Versionen ohne Inhalt entfallen ebenfalls.
Inhaltsaenderungen ausserhalb von `Draft` verlangen im neuen Profil eine neue Version.
Diese Einschraenkungen muessen vor der Umstellung mit bestehenden Clients abgestimmt werden.

Die Serviceschicht soll nicht bestehende MCP-Callbacks aufrufen.
Diese Callbacks liefern bereits verpackte MCP-Antworten statt wiederverwendbarer fachlicher Ergebnisse.
Alte und neue Adapter koennen waehrend der Uebergangszeit dieselbe Serviceschicht nutzen.

## 10. Abnahmekriterien fuer die spaetere Umsetzung

- Das neue Profil bietet maximal die 23 beschriebenen Tools an.
- Ohne Schreibfreigaben bleiben genau die fuenf lesenden beziehungsweise lokalen Zieltools sichtbar.
- Jedes bisherige Tool besitzt eine dokumentierte Zieloperation oder einen bewusst internen Ersatz.
- Ein neues Event samt initialer Version entsteht durch einen Modellaufruf.
- Schema, ausgewaehlte Version und Inhalt lassen sich gemeinsam lesen.
- Bestehende Filter und reine Suchmoeglichkeiten bleiben im fachlichen Umfang erhalten.
- Versionierte Inhalte erfordern bei Aenderungen eine konkrete Versionsreferenz.
- Updates erhalten ungenannte Felder, Consumer und Beziehungen.
- Neue Versionen veraendern keine bereits referenzierten Schema-Versionen.
- Statuswechsel und Loeschungen erfolgen niemals als versteckte Nebeneffekte.
- Teilfehler geben bekannte Ressourcen-IDs und den unklaren Ausgang einzelner Schritte zurueck.
- Wiederholungen nach Timeout erzeugen keine unbeabsichtigten Duplikate.
- Gates, Backend-Rechte und Authentifizierungskontexte gelten fuer jeden Teilschritt.
- Messungen bestaetigen die Entlastung beim vorgesehenen Client.

## 11. Vor einer Umsetzung zu klaeren

| Entscheidung                               | Empfehlung                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Ablage des abgestimmten Konzepts           | Spaeter `docs/mcp-tool-konsolidierung.md` im Repository                                    |
| Neues Profil oder neuer Endpunkt           | Getrennte Kataloge, niemals beide standardmaessig gemeinsam laden                          |
| Neue Namen                                 | Durchgaengig camelCase, Umstieg als versionierte Schnittstellenaenderung behandeln         |
| Versionsauswahl                            | Konkrete IDs fuer Schreiben, ausdrueckliche Strategien nur fuer Lesen                      |
| Schema-Inhaltsprofil                       | JSON Schema und AsyncAPI-Dokumente ausdruecklich unterscheiden                             |
| Idempotenz und Fortschritt                 | Dauerhafte, authentifizierungskontextbezogene Zuordnung vor produktiver Freigabe festlegen |
| Fehlerbereinigung                          | Keine automatische Rueckloeschung als Standard                                             |
| Freigabe                                   | Eigene explizite Operation, nicht Teil von `createEvent`                                   |
| Legacy-Bearbeitung freigegebener Versionen | Im neuen Standardprofil zugunsten neuer Versionen einschraenken                            |

## 12. Quellennachweise

Alle Pfade beziehen sich auf den untersuchten Repository-Stand.

| Quelle                                                 | Relevante Stelle | Aussage                                                                |
| ------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------- |
| `apps/mcp/src/tools/index.ts`                          | Zeile 12         | Registrierung der neun Toolgruppen                                     |
| `apps/mcp/src/tools/application.tools.ts`              | Zeile 26         | 16 Application- und Consumer-Tools                                     |
| `apps/mcp/src/tools/application.tools.ts`              | Zeile 215        | Versionsupdate sendet derzeit `consumers: []`                          |
| `apps/mcp/src/tools/domain.tools.ts`                   | Zeile 20         | Neun Domain- und Topic-Domain-Tools                                    |
| `apps/mcp/src/tools/domain.tools.ts`                   | Zeile 44         | Auskommentierter Ansatz zur gemeinsamen Domain-Erstellung              |
| `apps/mcp/src/tools/event.tools.ts`                    | Zeile 24         | Elf Event-Tools und getrennte Erstellung von Stammobjekt und Version   |
| `apps/mcp/src/tools/event.tools.ts`                    | Zeile 78         | Topic-Segmente werden heute als Literale angelegt                      |
| `apps/mcp/src/tools/schema.tools.ts`                   | Zeile 21         | Elf Schema-Tools und getrennte Versionsinhalte                         |
| `apps/mcp/src/tools/enum.tools.ts`                     | Zeile 20         | Elf Enumeration-Tools                                                  |
| `apps/mcp/src/tools/eventApi.tools.ts`                 | Zeile 10         | Vier ausschliesslich lesende Event-API-Tools                           |
| `apps/mcp/src/tools/search.tools.ts`                   | Zeile 6          | Sechs separate Suchtools                                               |
| `apps/mcp/src/tools/export.tools.ts`                   | Zeile 11         | Zwei getrennte Exporttools                                             |
| `apps/mcp/src/tools/migration.tools.ts`                | Zeile 10         | Lokale Migration und JSON-Serialisierung                               |
| `apps/mcp/src/tools/helpers.ts`                        | Zeile 8          | Vollstaendige JSON-Serialisierung von Ergebnissen                      |
| `apps/mcp/src/lib/search.service.ts`                   | Zeile 40         | Gemeinsamer Suchservice fuer sechs Ressourcentypen                     |
| `apps/mcp/src/runServer.ts`                            | Zeile 87         | Serialisierung zum Schutz des Authentifizierungskontexts               |
| `apps/mcp/src/runServer.ts`                            | Zeile 106        | Neue MCP-Serverinstanz und Toolregistrierung je HTTP-Anfrage           |
| `apps/mcp/src/lib/state.service.ts`                    | Zeile 7          | Prozessweiter Lifecycle-Cache als Pruefpunkt fuer Organisationsgrenzen |
| `skills/solace-event-portal/SKILL.md`                  | Zeile 65         | Heutige fachliche Erstellungsreihenfolge                               |
| `packages/migration-core/src/AsyncApiSpecification.ts` | Zeile 52         | Begrenzte Grundpruefung des AsyncAPI-Dokuments                         |
| `docs/mcp.md`                                          | Zeile 148        | Bestehende, nicht vollstaendige Tooldokumentation                      |

## Fazit

Die fachliche Konsolidierung ist anhand des aktuellen Modells sinnvoll konzipierbar.
Sie verschiebt die technische Verkettung vom Modell in den MCP-Service.
Der groesste direkte Nutzen entsteht durch `createEvent`, `inspectResource` und kompakte Antworten.
Eine getrennte Migration der Toolkataloge verhindert, dass die Umstellung den Kontextverbrauch zunaechst dauerhaft vergroessert.
Atomaritaet, Idempotenz und konkrete Tokenersparnis sind keine bereits nachgewiesenen Eigenschaften.
