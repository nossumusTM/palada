import { NextRequest, NextResponse } from 'next/server';
import { downloadWithFallback } from '@/lib/video-extractor';

export const runtime = 'nodejs';

function safeFilename(base: string) {
  return `${base.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 60) || 'video'}_highest_quality.mp4`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const primary = typeof body.url === 'string' ? body.url : '';
    const fallbacks: string[] = Array.isArray(body.fallbacks) ? body.fallbacks.filter((item): item is string => typeof item === 'string') : [];

    if (!primary) {
      return NextResponse.json({ error: 'A video URL is required.' }, { status: 400 });
    }

    const response = await downloadWithFallback([primary, ...fallbacks]);
    const filename = safeFilename(typeof body.filename === 'string' ? body.filename : 'video');

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
