'use client';

import { useEffect, useState } from 'react';
import { ConfidenceBadge } from '@/components/Badge';
import type { DocLinksResult } from '@/lib/types';

export default function DocLinkerPage() {
  const [result, setResult] = useState<DocLinksResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    try {
      const res = await fetch('/api/doc-links');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load doc links');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load doc links');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Doc Linker</h1>
        <p className="text-sm text-gray-500">Tickets matched to documentation, and gaps in both directions.</p>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {!error && !result && <p className="text-sm text-gray-500">Loading…</p>}

      {result && (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Ticket ↔ Document matches</h2>
            <div className="rounded-lg border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Ticket</th>
                    <th className="px-3 py-2">Matched document</th>
                    <th className="px-3 py-2">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {result.matches.map((m) => (
                    <tr key={m.ticketId} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium text-gray-900">{m.ticketId}</td>
                      <td className="px-3 py-2">
                        <a href={m.doc.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {m.doc.title}
                        </a>
                      </td>
                      <td className="px-3 py-2">
                        <ConfidenceBadge confidence={m.confidence} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">
              Missing documentation <span className="text-gray-400">({result.missingDocTicketIds.length})</span>
            </h2>
            {result.missingDocTicketIds.length === 0 ? (
              <p className="text-sm text-gray-400">Every ticket has a matching doc.</p>
            ) : (
              <ul className="list-inside list-disc rounded-lg border bg-white p-3 text-sm text-gray-700">
                {result.missingDocTicketIds.map((id) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">
              Orphaned documentation <span className="text-gray-400">({result.orphanedDocs.length})</span>
            </h2>
            {result.orphanedDocs.length === 0 ? (
              <p className="text-sm text-gray-400">No documentation is orphaned.</p>
            ) : (
              <ul className="rounded-lg border bg-white p-3 text-sm text-gray-700">
                {result.orphanedDocs.map((doc) => (
                  <li key={doc.url}>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {doc.title}
                    </a>
                    <span className="text-gray-400"> — last updated {doc.lastUpdated}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
