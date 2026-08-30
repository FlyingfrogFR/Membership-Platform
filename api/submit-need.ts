// No top-level imports: the endpoint itself always loads, and a failure while
// importing the shared module (or handling the request) is caught and returned
// as JSON — instead of an opaque FUNCTION_INVOCATION_FAILED with no detail.
export async function POST(request: Request): Promise<Response> {
  try {
    const { handleNeedSubmit, realDeps } = await import('./_shared')
    return await handleNeedSubmit(request, realDeps)
  } catch (error) {
    console.error('submit-need failed:', error)
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    return new Response(JSON.stringify({ error: detail }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
