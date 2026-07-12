# Structured and unstructured CloudEvents

CloudEvents serialization and AsyncAPI versions are separate concepts. This project combines them into two migration targets:

- **Unstructured** refers to CloudEvents binary mode represented as AsyncAPI 2.x.
- **Structured** refers to CloudEvents structured mode represented as AsyncAPI 3.x.

CloudEvents also defines batch mode, but this project does not migrate batch payloads.

## Key differences

| Area                                  | Unstructured CloudEvent                                                                         | Structured CloudEvent                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| AsyncAPI version used by this project | AsyncAPI 2.x                                                                                    | AsyncAPI 3.x                                                                        |
| CloudEvent context                    | Attributes such as `id`, `source`, `specversion`, and `type` are represented as message headers | CloudEvent attributes and business data share one payload envelope                  |
| Business data                         | The message payload contains only the business data                                             | The business data is stored in `payload.data`                                       |
| Content type                          | Usually the business payload type, such as `application/json`                                   | The complete envelope uses `application/cloudevents+json`                           |
| Schema scope                          | The payload schema validates the business data                                                  | The payload schema validates the CloudEvent envelope and its `data` field           |
| Operations                            | `publish` and `subscribe` are nested below a channel                                            | Top-level operations use `send` and `receive` and reference channels and messages   |
| Channels                              | The channel key normally contains the transport address                                         | A logical channel key can be separate from its `address`                            |
| Messages                              | A `publish` or `subscribe` operation contains its message                                       | A channel declares available messages and an operation references selected messages |

The direction describes the documented application's perspective. During migration, AsyncAPI 2 `subscribe` maps to AsyncAPI 3 `send`, while AsyncAPI 2 `publish` maps to AsyncAPI 3 `receive`.

## Message example

An unstructured message keeps CloudEvent attributes and business data separate:

```yaml
headers:
  type: object
  required: [specversion, id, source, type]
  properties:
    specversion:
      type: string
      const: '1.0'
    id:
      type: string
    source:
      type: string
    type:
      type: string
payload:
  $ref: '#/components/schemas/OrderCreated'
```

The equivalent structured message places both parts in one envelope:

```yaml
contentType: application/cloudevents+json
payload:
  type: object
  required: [specversion, id, source, type, data]
  properties:
    specversion:
      type: string
      const: '1.0'
    id:
      type: string
    source:
      type: string
    type:
      type: string
    time:
      type: string
      format: date-time
    datacontenttype:
      type: string
      const: application/json
    data:
      $ref: '#/components/schemas/OrderCreated'
```

## AsyncAPI document structure

In AsyncAPI 2, operations and messages are nested inside a channel:

```yaml
asyncapi: 2.6.0
channels:
  orders.created:
    subscribe:
      operationId: sendOrderCreated
      message:
        $ref: '#/components/messages/OrderCreated'
```

In AsyncAPI 3, the channel, operation, and message selection are separated:

```yaml
asyncapi: 3.0.0
channels:
  orderCreated:
    address: orders.created
    messages:
      OrderCreated:
        $ref: '#/components/messages/OrderCreated'

operations:
  sendOrderCreated:
    action: send
    channel:
      $ref: '#/channels/orderCreated'
    messages:
      - $ref: '#/channels/orderCreated/messages/OrderCreated'
```

This separation makes the application's action explicit and allows channels to declare multiple messages independently of the operations that use them.
