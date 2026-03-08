import { NextRequest, NextResponse } from 'next/server';
import { analyzeVideoUrl } from '@/lib/video-extractor';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = typeof body.url === 'string' ? body.url : '';

    if (!url) {
      return NextResponse.json({ error: 'A URL is required.' }, { status: 400 });
    }

    const options = await analyzeVideoUrl(url);
    return NextResponse.json({ options });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
