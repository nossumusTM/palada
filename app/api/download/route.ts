import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { downloadWithFallback } from '@/lib/video-extractor';

export const runtime = 'nodejs';

type DownloadFormat = 'video' | 'mp3';

function safeFilename(base: string, format: DownloadFormat) {
  const clean = `${base.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 60) || 'video'}_highest_quality`;
  return format === 'mp3' ? `${clean}.mp3` : `${clean}.mp4`;
}

function getDownloadParams(params: {
  url: unknown;
  fallbacks: unknown;
  filename: unknown;
  format?: unknown;
  sourceUrl?: unknown;
}) {
  const primary = typeof params.url === 'string' ? params.url : '';
  const fallbacks = Array.isArray(params.fallbacks)
    ? params.fallbacks.filter((item): item is string => typeof item === 'string')
    : [];
  const format: DownloadFormat = params.format === 'mp3' ? 'mp3' : 'video';
  const sourceUrl = typeof params.sourceUrl === 'string' ? params.sourceUrl : '';
  const filename = safeFilename(typeof params.filename === 'string' ? params.filename : 'video', format);
  return { primary, fallbacks, filename, format, sourceUrl };
}

async function toMp3Response(response: Response, filename: string) {
  if (!response.body) {
    throw new Error('No stream body received for conversion.');
  }

  const ffmpeg = spawn('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    'pipe:0',
    '-vn',
    '-acodec',
    'libmp3lame',
    '-b:a',
    '192k',
    '-f',
    'mp3',
    'pipe:1'
  ]);

  const input = Readable.fromWeb(response.body as any);
  input.pipe(ffmpeg.stdin);

  ffmpeg.stdin.on('error', () => {
    // Ignore broken pipe when ffmpeg exits early due to bad input stream.
  });

  const output = Readable.toWeb(ffmpeg.stdout) as ReadableStream;
  return new NextResponse(output, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { primary, fallbacks, filename, format, sourceUrl } = getDownloadParams({
      url: body.url,
      fallbacks: body.fallbacks,
      filename: body.filename,
      format: body.format,
      sourceUrl: body.sourceUrl
    });

    if (!primary) {
      return NextResponse.json({ error: 'A video URL is required.' }, { status: 400 });
    }

    const response = await downloadWithFallback([primary, ...fallbacks], sourceUrl);
    if (format === 'mp3') {
      return await toMp3Response(response, filename);
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...(response.headers.get('content-length') ? { 'Content-Length': response.headers.get('content-length') as string } : {}),
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams;
    const { primary, fallbacks, filename, format, sourceUrl } = getDownloadParams({
      url: search.get('url'),
      fallbacks: search.getAll('fallback'),
      filename: search.get('filename'),
      format: search.get('format'),
      sourceUrl: search.get('sourceUrl')
    });

    if (!primary) {
      return NextResponse.json({ error: 'A video URL is required.' }, { status: 400 });
    }

    const response = await downloadWithFallback([primary, ...fallbacks], sourceUrl);
    if (format === 'mp3') {
      return await toMp3Response(response, filename);
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...(response.headers.get('content-length') ? { 'Content-Length': response.headers.get('content-length') as string } : {}),
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
