// app/api/viton/route.js
import { NextResponse } from 'next/server';

const BASE = process.env.FITROOM_BASE || 'https://platform.fitroom.app';
const KEY = process.env.FITROOM_API_KEY;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function POST(req) {
    if (!KEY) {
        return NextResponse.json({ error: 'Missing FITROOM_API_KEY in server env' }, { status: 500 });
    }

    // parse incoming form
    const incoming = await req.formData();
    const modelImage = incoming.get('model_image');
    const clothImage = incoming.get('cloth_image');
    const cloth_type = incoming.get('cloth_type') || 'upper';
    const hd_mode = incoming.get('hd_mode');

    if (!modelImage || !clothImage) {
        return NextResponse.json({ error: 'model_image and cloth_image are required' }, { status: 400 });
    }

    // Build outbound form
    const outbound = new FormData();
    outbound.append('model_image', modelImage, modelImage.name || 'model.jpg');
    outbound.append('cloth_image', clothImage, clothImage.name || 'cloth.jpg');
    outbound.append('cloth_type', cloth_type);
    if (hd_mode) outbound.append('hd_mode', 'true');

    try {
    const createRes = await fetch(`${BASE}/api/tryon/v2/tasks`, {
      method: 'POST',
      headers: { 'X-API-KEY': KEY },
      body: outbound,
    });
    const createJson = await createRes.json();
    const taskId = createJson?.id || createJson?.result?.task_id;
    if (!taskId) return NextResponse.json({ error: 'No task id', details: createJson }, { status: 502 });

    // poll until completed
    const maxAttempts = 15;
    for (let i = 0; i < maxAttempts; i++) {
      const statusRes = await fetch(`${BASE}/api/tryon/v2/tasks/${taskId}`, {
        headers: { 'X-API-KEY': KEY },
      });
      const statusJson = await statusRes.json();
      const st = (statusJson?.result?.status || statusJson.status || '').toUpperCase();
      if (st === 'COMPLETED') {
        // 🟢 send only the signed URL back
        return NextResponse.json({
          status: 'COMPLETED',
          imageUrl: statusJson.result.download_signed_url,
        });
      }
      if (st === 'FAILED' || st === 'ERROR') {
        return NextResponse.json({ status: st, details: statusJson }, { status: 200 });
      }
      await sleep(2000);
    }

    return NextResponse.json({ status: 'TIMEOUT' }, { status: 504 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}