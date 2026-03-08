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

  const visibleOptions = useMemo(() => {
    const hasKnown = sortedOptions.some((item) => item.label !== 'Unknown quality' || (item.height ?? 0) > 0);
    if (!hasKnown) return sortedOptions;
    return sortedOptions.filter((item) => item.label !== 'Unknown quality' && (item.height ?? 0) > 0);
  }, [sortedOptions]);

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

  async function download(option: VideoOption, format: 'video' | 'mp3') {
    setError(null);
    const key = `${option.url}|${format}`;
    setDownloading(key);

    try {
      const fallbacks = sortedOptions.filter((item) => (item.height ?? 0) < (option.height ?? 0)).map((item) => item.url);
      const anchor = document.createElement('a');
      const params = new URLSearchParams();
      params.set('url', option.url);
      params.set('filename', 'video');
      params.set('format', format);
      for (const fallback of fallbacks) {
        params.append('fallback', fallback);
      }
      anchor.href = `/api/download?${params.toString()}`;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown download error.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-6">
      <section className="text-center w-full rounded-[32px] bg-white/5 p-8 shadow-2xl backdrop-blur-[25px] backdrop-saturate-[180%]">
        <h1 className="text-3xl font-semibold tracking-tight">🚀 Universal Downlink Video Service</h1>
        <p className="mt-2 text-sm text-white/70">Paste a video page URL and download either MP4 video or MP3 audio.</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            placeholder="https://example.com/video"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="w-full rounded-2xl bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-300/60"
          />
          <button
            type="button"
            onClick={analyze}
            disabled={loading || !url}
            className="rounded-2xl bg-blue-400/90 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
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

        {!!visibleOptions.length && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-white/70">Choose quality:</p>
            <div className="flex flex-wrap gap-3">
              {visibleOptions.map((option) => (
                <div key={option.url} className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 p-2">
                  <button
                    onClick={() => download(option, 'video')}
                    disabled={downloading !== null}
                    className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20 disabled:opacity-50"
                  >
                    {downloading === `${option.url}|video` ? 'Downloading…' : `Video ${option.label}`}
                  </button>
                  <button
                    onClick={() => download(option, 'mp3')}
                    disabled={downloading !== null}
                    className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20 disabled:opacity-50"
                  >
                    {downloading === `${option.url}|mp3` ? 'Converting…' : `MP3 ${option.label}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
