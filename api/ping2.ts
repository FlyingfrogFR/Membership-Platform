// Second temporary probe, classic Node signature (no imports, no web
// Response/Request globals). Compared with /api/ping (web-handler style):
// - ping fails + ping2 works  -> the runtime's web-handler path is the problem
// - both fail                 -> project-level runtime issue (Node version…)
// Remove with ping once direct send is confirmed healthy in production.
export default function handler(req: { method?: string }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (s: string) => void }): void {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ pong2: true, method: req.method ?? '' }))
}
