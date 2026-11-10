import api from './api';

export type DocumentKind = 'leases' | 'bills' | 'payments';

function blobText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('The document response could not be read.'));
    reader.readAsText(blob);
  });
}

function filenameFrom(header: string | undefined, fallback: string) {
  const match = /filename="([^"]+)"/.exec(header || '');
  return match?.[1] || fallback;
}

async function messageFrom(error: unknown) {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await blobText(data)) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      /* The server returned a file error without a readable message. */
    }
  }
  return 'The document could not be prepared. Please try again.';
}

export async function loadDocument(kind: DocumentKind, id: number, download: boolean) {
  try {
    const response = await api.get(`/documents/${kind}/${id}`, {
      params: download ? { download: 1 } : undefined,
      responseType: 'blob',
    });
    const blob = response.data as Blob;
    if ((await blobText(blob.slice(0, 5))) !== '%PDF-') {
      throw new Error(await messageFrom({ response: { data: blob } }));
    }
    const fallback = {
      leases: `RentEase-Lease-Agreement-${id}.pdf`,
      bills: `RentEase-Billing-Statement-${id}.pdf`,
      payments: `RentEase-Payment-Receipt-${id}.pdf`,
    }[kind];
    return {
      blob,
      filename: filenameFrom(response.headers['content-disposition'], fallback),
    };
  } catch (error) {
    if (error instanceof Error && !('response' in error)) throw error;
    throw new Error(await messageFrom(error));
  }
}
