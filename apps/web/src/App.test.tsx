import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('AsyncAPI migration app', () => {
  afterEach(cleanup);

  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('validates an empty input', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /migrate specification/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Provide an AsyncAPI specification');
  });

  it('migrates pasted YAML with the shared core and displays formatted output', async () => {
    render(<App />);
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
  });
});
