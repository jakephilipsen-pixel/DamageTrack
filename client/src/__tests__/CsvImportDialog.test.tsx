import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CsvImportDialog } from '../components/ui/CsvImportDialog';

// Mock the API functions
vi.mock('../api/customers', () => ({
  importCustomersCSV: vi.fn(),
}));
vi.mock('../api/products', () => ({
  importProductsCSV: vi.fn(),
}));
vi.mock('../api/users', () => ({
  importUsersCSV: vi.fn(),
}));

// Mock URL.createObjectURL / revokeObjectURL which aren't in jsdom
Object.defineProperty(globalThis, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  },
  writable: true,
});

import { importCustomersCSV } from '../api/customers';

describe('CsvImportDialog', () => {
  const defaultProps = {
    entity: 'customers' as const,
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<CsvImportDialog {...defaultProps} />);
    expect(screen.getByText(/Import Customers via CSV/i)).toBeInTheDocument();
  });

  it('shows the Download Template button', () => {
    render(<CsvImportDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: /download template/i })).toBeInTheDocument();
  });

  it('shows required column headers', () => {
    render(<CsvImportDialog {...defaultProps} />);
    expect(screen.getByText(/name,code,email,phone,contactName/i)).toBeInTheDocument();
  });

  it('shows success state after successful upload', async () => {
    (importCustomersCSV as any).mockResolvedValueOnce({ created: 3, errors: [] });

    render(<CsvImportDialog {...defaultProps} />);

    // Simulate file selection and upload click
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(['name,code\nAcme,ACME'], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(fileInput, 'files', { value: [mockFile], configurable: true });
    fireEvent.change(fileInput);

    const uploadBtn = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadBtn);

    const successText = await screen.findByText(/3/);
    expect(successText).toBeInTheDocument();
  });

  it('shows error message when upload fails', async () => {
    (importCustomersCSV as any).mockRejectedValueOnce({
      response: { data: { error: 'Invalid CSV format' } },
    });

    render(<CsvImportDialog {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(['bad content'], 'bad.csv', { type: 'text/csv' });
    Object.defineProperty(fileInput, 'files', { value: [mockFile], configurable: true });
    fireEvent.change(fileInput);

    const uploadBtn = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadBtn);

    const errorText = await screen.findByText(/Invalid CSV format/i);
    expect(errorText).toBeInTheDocument();
  });
});
