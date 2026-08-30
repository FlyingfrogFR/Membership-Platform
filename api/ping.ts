// Temporary platform probe (no imports at all): if this endpoint also fails,
// the problem is project-level, not in the submission code. Remove once the
// direct-send functions are confirmed healthy in production.
export function GET(): Response {
  return new Response(JSON.stringify({ pong: true }), { headers: { 'Content-Type': 'application/json' } })
}
