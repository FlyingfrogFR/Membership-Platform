// Vercel type-strips these files to per-file ESM (no bundling), so two rules
// keep the functions loadable in production: package.json must carry
// "type": "module" (the emitted .js files use export syntax), and every
// relative import in this graph needs an explicit .js extension — Node ESM
// does not resolve extensionless specifiers at runtime.
//
// No top-level imports here: the endpoint itself always loads, and a failure
// while importing the shared module (or handling the request) is caught and
// returned as JSON instead of an opaque FUNCTION_INVOCATION_FAILED.
export async function POST(request: Request): Promise<Response> {
  try {
    const { handleNeedSubmit, realDeps } = await import('./_shared.js')
    return await handleNeedSubmit(request, realDeps)
  } catch (error) {
    console.error('submit-need failed:', error)
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    return new Response(JSON.stringify({ error: detail }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
