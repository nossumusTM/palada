'use client';

import { useMemo, useState } from 'react';

type VideoOption = {
  url: string;
  label: string;
  width?: number;
  height?: number;
  bitrate?: number;
  size?: number;
  source: string;
};

export function DownlinkClient() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<VideoOption[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => (b.height ?? 0) - (a.height ?? 0)),
    [options]
  );

  async function analyze() {
    setError(null);
    setLoading(true);
    setOptions([]);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to analyze URL.');
      }
      setOptions(data.options ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown analyze error.');
    } finally {
      setLoading(false);
    }
  }

  async function download(option: VideoOption) {
    setError(null);
    setDownloading(option.url);

    try {
      const fallbacks = sortedOptions.filter((item) => (item.height ?? 0) < (option.height ?? 0)).map((item) => item.url);
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: option.url,
          fallbacks,
          filename: 'video'
        })
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? 'Download failed.');
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = 'video_highest_quality.mp4';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown download error.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-6">
      <section className="w-full rounded-[32px] border border-white/30 bg-white/5 p-8 shadow-2xl backdrop-blur-[25px] backdrop-saturate-[180%]">
        <h1 className="text-3xl font-semibold tracking-tight">🚀 Universal Downlink Video Service</h1>
        <p className="mt-2 text-sm text-white/70">Paste any video URL, analyze deep sources, and force-save the highest quality MP4.</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            placeholder="https://example.com/video"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="w-full rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-300/60"
          />
          <button
            type="button"
            onClick={analyze}
            disabled={loading || !url}
            className="rounded-2xl bg-violet-400/90 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>

        {loading && (
          <div className="mt-5 overflow-hidden rounded-full bg-white/10">
            <div className="h-2 w-1/4 bg-gradient-to-r from-fuchsia-300 via-violet-200 to-indigo-300 animate-pulseBar" />
            <p className="mt-2 px-1 pb-2 text-xs text-white/70">Deep Link Analyzing… inspecting tags, metadata, and hidden states.</p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

        {!!sortedOptions.length && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-white/70">Choose quality:</p>
            <div className="flex flex-wrap gap-3">
              {sortedOptions.map((option) => (
                <button
                  key={option.url}
                  onClick={() => download(option)}
                  disabled={downloading !== null}
                  className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20 disabled:opacity-50"
                >
                  {downloading === option.url ? 'Downloading…' : `Download ${option.label}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
