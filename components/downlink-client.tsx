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
      params.set('sourceUrl', url);
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
    <div className="h-screen w-full overflow-y-hidden flex flex-col">
      <header className="flex justify-center pt-6 shrink-0">
        <div className="logo-cluster relative z-30" aria-hidden="true">
          <span className="water-logo" />
          <span className="water-mini water-mini-a" />
          <span className="water-mini water-mini-b" />
          <span className="water-mini water-mini-c" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-6 pb-6 pt-6">
        <section className="w-full rounded-[32px] bg-white/5 p-8 text-center shadow-2xl backdrop-blur-[25px] backdrop-saturate-[180%]">
          <h1 className="text-3xl font-semibold tracking-tight">
            Universal Downlink Service
          </h1>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              placeholder="Paste a video page URL and download either MP4 video or MP3 audio"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="w-full rounded-2xl bg-black/20 px-4 py-3 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-300/60 sm:text-sm"
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
              <div className="h-2 w-1/4 animate-pulseBar bg-gradient-to-r from-fuchsia-300 via-violet-200 to-indigo-300" />
              <p className="mt-2 px-1 pb-2 text-xs text-white/70">
                Deep Link Analyzing… inspecting tags, metadata, and hidden states.
              </p>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

          {!!visibleOptions.length && (
            <div className="mt-8 rounded-3xl border border-cyan-200/20 bg-slate-900/35 p-4 shadow-[0_16px_45px_-20px_rgba(56,189,248,0.45)] backdrop-blur-xl sm:p-5">
              <div className="mb-4 flex items-end justify-between border-b border-white/10 pb-3">
                <div className="text-left">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/70">Download Console</p>
                  <h2 className="mt-1 text-xl font-semibold leading-none text-white sm:text-2xl">Choose Quality</h2>
                </div>
                <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-cyan-100/75">
                  {visibleOptions.length} Options
                </span>
              </div>

              <div className="grid gap-3">
                {visibleOptions.map((option) => (
                  <div
                    key={option.url}
                    className="rounded-2xl border border-white/15 bg-gradient-to-r from-white/10 via-white/5 to-transparent p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/55">Profile</span>
                      <span className="text-base font-semibold text-cyan-100 sm:text-lg">{option.label}</span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => download(option, 'video')}
                      disabled={downloading !== null}
                      className="group flex flex-1 items-center justify-between rounded-xl border border-cyan-200/35 bg-cyan-300/10 px-4 py-3 text-left transition hover:border-cyan-200/60 hover:bg-cyan-300/20 disabled:opacity-50"
                    >
                      <span>
                        <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-cyan-100/70">Download</span>
                        <span className="block text-sm font-semibold text-cyan-50 sm:text-base">VIDEO</span>
                      </span>
                      <span className="text-xs font-medium text-cyan-100/80">
                        {downloading === `${option.url}|video` ? 'Processing…' : 'MP4'}
                      </span>
                    </button>
                    <button
                      onClick={() => download(option, 'mp3')}
                      disabled={downloading !== null}
                      className="group flex flex-1 items-center justify-between rounded-xl border border-blue-200/30 bg-blue-300/10 px-4 py-3 text-left transition hover:border-blue-200/60 hover:bg-blue-300/20 disabled:opacity-50"
                    >
                      <span>
                        <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-blue-100/70">Extract</span>
                        <span className="block text-sm font-semibold text-blue-50 sm:text-base">AUDIO</span>
                      </span>
                      <span className="text-xs font-medium text-blue-100/80">
                        {downloading === `${option.url}|mp3` ? 'Converting…' : 'MP3'}
                      </span>
                    </button>
                  </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
