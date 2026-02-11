import { telemetry } from '@/lib/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const metrics = telemetry.getMetrics();

  return Response.json(metrics, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
}
