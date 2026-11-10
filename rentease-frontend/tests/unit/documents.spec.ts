import { AxiosHeaders } from 'axios';
import api from '@/services/api';
import { loadDocument } from '@/services/documents';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }));

describe('loadDocument', () => {
  test('returns a valid PDF and uses the server filename', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
      headers: { 'content-disposition': 'attachment; filename="statement.pdf"' },
      status: 200,
      statusText: 'OK',
      config: { headers: new AxiosHeaders() },
    });

    await expect(loadDocument('bills', 42, true)).resolves.toMatchObject({
      filename: 'statement.pdf',
    });
    expect(api.get).toHaveBeenCalledWith('/documents/bills/42', {
      params: { download: 1 },
      responseType: 'blob',
    });
  });

  test('rejects a non-PDF response instead of presenting it as a PDF', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: new Blob(['upstream error'], { type: 'text/html' }),
      headers: {},
      status: 502,
      statusText: 'Bad Gateway',
      config: { headers: new AxiosHeaders() },
    });

    await expect(loadDocument('bills', 42, false))
      .rejects.toThrow('The document could not be prepared. Please try again.');
  });
});
