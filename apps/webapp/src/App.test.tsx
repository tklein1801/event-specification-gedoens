import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('AsyncAPI migration app', () => {
  afterEach(cleanup);

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('persists the selected color mode', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: 'Use dark mode' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('esg-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Use light mode' })).toBeInTheDocument();
  });

  it('opens both editors as full-page dialogs and restores them', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: 'Maximize source editor' }));
    expect(screen.getByRole('dialog', { name: 'Source specification' })).toHaveClass(
      'fixed',
      'inset-3',
    );
    expect(screen.getByRole('button', { name: 'Restore source editor' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');

    await userEvent.click(screen.getByRole('button', { name: 'Maximize result editor' }));
    expect(screen.getByRole('dialog', { name: 'Migrated specification' })).toHaveClass('fixed');
    expect(screen.getByRole('button', { name: 'Restore result editor' })).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('editor-dialog-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('links to the repository and shows the app version', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: /view on github/i })).toHaveAttribute(
      'href',
      'https://github.com/tklein1801/event-specification-gedoens',
    );
    expect(screen.getByText('AsyncAPI Migration Studio · v0.1.0')).toBeInTheDocument();
  });

  it('does not show an idle migration notice', () => {
    render(<App />);

    expect(screen.queryByText('Ready for a local migration.')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('offers both migration directions', () => {
    render(<App />);

    expect(screen.getByLabelText('Migration direction')).not.toBeDisabled();
    expect(
      screen.getByRole('option', { name: 'AsyncAPI 3.x → 2.x · unstructured' }),
    ).not.toBeDisabled();
    expect(
      screen.getByText('Choose the direction that matches the input specification.'),
    ).toBeInTheDocument();
  });

  it('inspects source and target specifications from the info card', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('AsyncAPI source'), {
      target: {
        value: JSON.stringify({
          asyncapi: '2.6.0',
          channels: {
            orders: {
              subscribe: { message: { $ref: '#/components/messages/OrderCreated' } },
            },
          },
          components: {
            messages: { OrderCreated: { name: 'OrderCreated.v1' } },
            schemas: { Order: { type: 'object' } },
            messageTraits: { CloudEventContext: {} },
          },
        }),
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Open specification info' }));
    const infoCard = screen.getByLabelText('Specification information');

    expect(within(infoCard).getByText('2.6.0')).toBeInTheDocument();
    expect(within(infoCard).getByText('PUB')).toBeInTheDocument();
    expect(within(infoCard).getByText('OrderCreated.v1')).toBeInTheDocument();

    await userEvent.click(
      within(infoCard).getByRole('button', { name: 'Copy event OrderCreated.v1' }),
    );
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      JSON.stringify({ name: 'OrderCreated.v1' }, null, 2),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Event OrderCreated.v1 copied to the clipboard.',
    );

    await userEvent.click(within(infoCard).getByRole('button', { name: 'Messages 1' }));
    expect(within(infoCard).queryByText('OrderCreated.v1')).not.toBeInTheDocument();
    expect(within(infoCard).getByText('OrderCreated')).toBeInTheDocument();

    await userEvent.click(within(infoCard).getByRole('button', { name: 'Schemas 1' }));
    expect(within(infoCard).queryByText('OrderCreated')).not.toBeInTheDocument();
    expect(within(infoCard).getByText('Order')).toBeInTheDocument();
    await userEvent.click(within(infoCard).getByRole('button', { name: 'Copy Schema Order' }));
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      JSON.stringify({ type: 'object' }, null, 2),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Schema Order copied to the clipboard.');

    await userEvent.click(within(infoCard).getByRole('button', { name: 'MessageTraits 1' }));
    expect(within(infoCard).queryByText('Order')).not.toBeInTheDocument();
    expect(within(infoCard).getByText('CloudEventContext')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /migrate specification/i }));
    await screen.findByText(/Migration complete/);
    await userEvent.click(within(infoCard).getByRole('tab', { name: /target/i }));
    expect(within(infoCard).getByText('3.0.0')).toBeInTheDocument();

    await userEvent.click(
      within(infoCard).getByRole('button', { name: 'Close specification info' }),
    );
    expect(screen.queryByLabelText('Specification information')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open specification info' })).toBeInTheDocument();
  });

  it('copies a migrated event with its deeply resolved payload schema', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('AsyncAPI source'), {
      target: {
        value: JSON.stringify({
          asyncapi: '2.6.0',
          channels: {
            orders: {
              subscribe: { message: { $ref: '#/components/messages/OrderCreated' } },
            },
          },
          components: {
            messages: {
              OrderCreated: {
                name: 'OrderCreated',
                payload: { $ref: '#/components/schemas/Order' },
              },
            },
            schemas: {
              Order: {
                type: 'object',
                properties: { customer: { $ref: '#/components/schemas/Customer' } },
              },
              Customer: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        }),
      },
    });

    await userEvent.click(screen.getByRole('button', { name: /migrate specification/i }));
    await screen.findByText(/Migration complete/);
    await userEvent.click(screen.getByRole('button', { name: 'Open specification info' }));
    const infoCard = screen.getByLabelText('Specification information');
    await userEvent.click(within(infoCard).getByRole('tab', { name: /target/i }));
    await userEvent.click(
      within(infoCard).getByRole('button', { name: 'Copy event OrderCreated' }),
    );

    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      expect.not.stringContaining('$ref'),
    );
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      expect.stringContaining('"customer"'),
    );
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(expect.stringContaining('"id"'));
  });

  it('validates an empty input', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /migrate specification/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Provide an AsyncAPI specification');
  });

  it('offers YAML and JSON input and migrates pasted YAML', async () => {
    render(<App />);

    expect(screen.getByText('AsyncAPI YAML or JSON')).toBeInTheDocument();
    expect(screen.getByLabelText('Upload AsyncAPI file')).toHaveAttribute(
      'accept',
      '.json,.yaml,.yml,application/json,application/yaml,text/yaml',
    );
    fireEvent.change(screen.getByLabelText('AsyncAPI source'), {
      target: { value: 'asyncapi: 2.6.0\ninfo:\n  title: Orders\n  version: 1.0.0' },
    });
    await userEvent.click(screen.getByRole('button', { name: /migrate specification/i }));

    await waitFor(() => {
      const output = screen.getByLabelText<HTMLTextAreaElement>('Migrated AsyncAPI result');
      expect(output.value).toContain('asyncapi: 3.0.0');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Migration complete');
  });

  it('migrates JSON containing duplicate schema keys and retains the last value', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('AsyncAPI source'), {
      target: {
        value: `{
          "asyncapi": "2.6.0",
          "components": {
            "messages": {
              "OrderMessage": { "payload": { "$ref": "#/components/schemas/Order" } }
            },
            "schemas": {
              "Order": { "type": "string" },
              "Order": { "type": "object" }
            }
          }
        }`,
      },
    });
    await userEvent.click(screen.getByRole('button', { name: /migrate specification/i }));

    await waitFor(() => {
      const output = screen.getByLabelText<HTMLTextAreaElement>('Migrated AsyncAPI result');
      expect(JSON.parse(output.value).components.schemas.Order.properties.data).toEqual({
        type: 'object',
      });
    });
    expect(screen.getByRole('status')).toHaveTextContent('Migration complete');
  });

  it('loads a local AsyncAPI file into the editor', async () => {
    render(<App />);
    const file = new File(['{"asyncapi":"2.6.0"}'], 'orders.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue('{"asyncapi":"2.6.0"}'),
    });

    await userEvent.upload(screen.getByLabelText('Upload AsyncAPI file'), file);

    expect(await screen.findByText('Loaded orders.json')).toBeInTheDocument();
    expect(screen.getByLabelText('AsyncAPI source')).toHaveValue('{"asyncapi":"2.6.0"}');
    expect(screen.getByRole('status')).toHaveTextContent('orders.json was uploaded successfully.');
  });

  it('loads a local YAML file into the editor', async () => {
    render(<App />);
    const content = 'asyncapi: 2.6.0';
    const file = new File([content], 'orders.yaml', {
      type: 'application/yaml',
    });
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue(content),
    });

    await userEvent.upload(screen.getByLabelText('Upload AsyncAPI file'), file);

    expect(await screen.findByText('Loaded orders.yaml')).toBeInTheDocument();
    expect(screen.getByLabelText('AsyncAPI source')).toHaveValue(content);
    expect(screen.getByRole('status')).toHaveTextContent('orders.yaml was uploaded successfully.');
  });

  it('shows migration errors from invalid input', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('AsyncAPI source'), {
      target: { value: 'asyncapi: [' },
    });
    await userEvent.click(screen.getByRole('button', { name: /migrate specification/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('valid JSON or YAML');
    expect(screen.getByLabelText('Migrated AsyncAPI result')).toHaveValue('');
  });

  it('copies the migrated result', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('AsyncAPI source'), {
      target: { value: '{"asyncapi":"2.6.0"}' },
    });
    await userEvent.click(screen.getByRole('button', { name: /migrate specification/i }));
    await screen.findByText(/Migration complete/);
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"asyncapi": "3.0.0"'),
    );
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('downloads the migrated result without a server round trip', async () => {
    const createObjectURL = vi.fn(() => 'blob:migrated');
    const revokeObjectURL = vi.fn();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);
    fireEvent.change(screen.getByLabelText('AsyncAPI source'), {
      target: { value: '{"asyncapi":"2.6.0"}' },
    });
    await userEvent.click(screen.getByRole('button', { name: /migrate specification/i }));
    await screen.findByText(/Migration complete/);
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:migrated');
    expect(screen.getByRole('status')).toHaveTextContent(
      'asyncapi.migrated.json download started.',
    );
  });
});
