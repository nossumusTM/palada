import * as cheerio from 'cheerio';

type Candidate = {
  url: string;
  width?: number;
  height?: number;
  bitrate?: number;
  source: string;
};

export type VideoOption = {
  url: string;
  label: string;
  width?: number;
  height?: number;
  bitrate?: number;
  size?: number;
  source: string;
};

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
];

const BLOCKED_EXTENSIONS = ['.avif', '.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg'];

const MP4_PATTERN = /https?:\\/\\/[^"'\\s)<>]+\.mp4(?:\?[^"'\\s<>]*)?/gi;
const GENERIC_URL_PATTERN = /https?:\\/\\/[^"'\\s)<>]+/gi;

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomUA(attempt: number) {
  return USER_AGENTS[attempt % USER_AGENTS.length];
}

async function fetchWithRetry(url: string, init: RequestInit = {}, retries = 4): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const headers = new Headers(init.headers ?? {});
    headers.set('User-Agent', randomUA(attempt));
    headers.set('Accept', 'text/html,application/json,application/xhtml+xml;q=0.9,*/*;q=0.8');

    try {
      const response = await fetch(url, { ...init, headers, redirect: 'follow' });
      if (response.status !== 429) {
        return response;
      }
      await wait(250 * 2 ** attempt);
    } catch (error) {
      lastError = error as Error;
      await wait(250 * 2 ** attempt);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Failed to fetch remote resource after retries.');
}

function isMp4(url: string) {
  const lowered = url.toLowerCase();
  if (!lowered.includes('.mp4')) return false;
  return !BLOCKED_EXTENSIONS.some((ext) => lowered.includes(ext));
}

function toAbsolute(url: string, base: string) {
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

function parseResolution(url: string, text?: string) {
  const target = `${url} ${text ?? ''}`;
  const short = target.match(/(\d{3,4})p/i);
  if (short) {
    const height = Number(short[1]);
    return { height, width: Math.round((height * 16) / 9) };
  }

  const pair = target.match(/(\d{3,4})[xX](\d{3,4})/);
  if (pair) {
    return { width: Number(pair[1]), height: Number(pair[2]) };
  }

  return {};
}

function parseBitrate(url: string, text?: string) {
  const target = `${url} ${text ?? ''}`;
  const kbps = target.match(/(\d{3,6})\s?k(?:bps|b\/s)/i);
  if (kbps) return Number(kbps[1]) * 1000;
  const bps = target.match(/(?:bitrate|br)[=_:-]?(\d{4,8})/i);
  return bps ? Number(bps[1]) : undefined;
}

function collectFromHtml(html: string, pageUrl: string): Candidate[] {
  const $ = cheerio.load(html);
  const found = new Map<string, Candidate>();

  const add = (raw: string | undefined, source: string, hintText?: string) => {
    if (!raw) return;
    const normalized = toAbsolute(raw.trim(), pageUrl);
    if (!normalized || !isMp4(normalized)) return;
    const resolution = parseResolution(normalized, hintText);
    const bitrate = parseBitrate(normalized, hintText);
    found.set(normalized, {
      url: normalized,
      ...resolution,
      bitrate,
      source
    });
  };

  $('video').each((_, el) => {
    add($(el).attr('src'), 'video-tag', $(el).attr('data-res'));
    $(el)
      .find('source')
      .each((__, sourceEl) => {
        add($(sourceEl).attr('src'), 'source-tag', `${$(sourceEl).attr('label') ?? ''} ${$(sourceEl).attr('res') ?? ''}`);
      });
  });

  $('meta').each((_, el) => {
    const property = ($(el).attr('property') ?? $(el).attr('name') ?? '').toLowerCase();
    if (property.includes('og:video') || property.includes('twitter:player') || property.includes('og:video:url')) {
      add($(el).attr('content'), 'meta-tag');
    }
  });

  $('script').each((_, el) => {
    const text = $(el).html() ?? '';
    const directMp4 = text.match(MP4_PATTERN) ?? [];
    directMp4.forEach((url) => add(url, 'script-state', text));

    const generic = text.match(GENERIC_URL_PATTERN) ?? [];
    generic.forEach((url) => {
      if (isMp4(url)) add(url, 'script-state', text);
    });

    const jsonLdType = ($(el).attr('type') ?? '').toLowerCase();
    if (jsonLdType.includes('ld+json')) {
      directMp4.forEach((url) => add(url, 'json-ld', text));
    }
  });

  const inlineDirect = html.match(MP4_PATTERN) ?? [];
  inlineDirect.forEach((url) => add(url, 'raw-html'));

  return Array.from(found.values());
}

async function probeSize(url: string): Promise<number | undefined> {
  try {
    const head = await fetchWithRetry(url, { method: 'HEAD' }, 2);
    const length = head.headers.get('content-length');
    if (length) return Number(length);
  } catch {
    return undefined;
  }
  return undefined;
}

function score(option: Candidate & { size?: number }) {
  return (option.height ?? 0) * 1_000_000 + (option.bitrate ?? 0) + ((option.size ?? 0) / 1000);
}

function qualityLabel(option: Candidate) {
  if (option.height && option.height >= 2160) return '4K';
  if (option.height) return `${option.height}p`;
  return 'Unknown quality';
}

export async function analyzeVideoUrl(inputUrl: string): Promise<VideoOption[]> {
  const pageResponse = await fetchWithRetry(inputUrl);
  if (!pageResponse.ok) {
    throw new Error(`Failed to retrieve URL (${pageResponse.status}).`);
  }

  const html = await pageResponse.text();
  const candidates = collectFromHtml(html, inputUrl);
  if (!candidates.length) {
    throw new Error('No MP4 links discovered in the provided URL.');
  }

  const enriched = await Promise.all(
    candidates.map(async (candidate) => ({
      ...candidate,
      size: await probeSize(candidate.url)
    }))
  );

  const dedupedByQuality = new Map<string, (Candidate & { size?: number })>();
  for (const candidate of enriched) {
    const key = String(candidate.height ?? 'unknown');
    const existing = dedupedByQuality.get(key);
    if (!existing || score(candidate) > score(existing)) {
      dedupedByQuality.set(key, candidate);
    }
  }

  return Array.from(dedupedByQuality.values())
    .sort((a, b) => score(b) - score(a))
    .map((candidate) => ({
      url: candidate.url,
      label: qualityLabel(candidate),
      width: candidate.width,
      height: candidate.height,
      bitrate: candidate.bitrate,
      size: candidate.size,
      source: candidate.source
    }));
}

export async function downloadWithFallback(urls: string[]): Promise<Response> {
  let lastStatus = 500;

  for (let index = 0; index < urls.length; index += 1) {
    const response = await fetchWithRetry(urls[index], {
      method: 'GET',
      headers: {
        Accept: 'video/mp4,application/octet-stream;q=0.9,*/*;q=0.8',
        Connection: 'keep-alive'
      }
    }, 3);

    if (response.ok && response.body) {
      return response;
    }

    lastStatus = response.status;
  }

  throw new Error(`Unable to fetch any downloadable stream (last status ${lastStatus}).`);
}
