// Must stay .ts: Vercel's api/ detector only registers js|mjs|ts|tsx files.
// And package.json must stay WITHOUT "type": "module": Vercel compiles this
// file to CommonJS, which an ESM-typed package would make Node load as ESM —
// crashing every invocation (FUNCTION_INVOCATION_FAILED). ESM-only tooling
// files opt in individually via the .mts extension instead.
import { handleNeedSubmit, json, realDeps } from './_shared'

export async function POST(request: Request): Promise<Response> {
  try {
    return await handleNeedSubmit(request, realDeps)
  } catch (error) {
    // Surface the real cause to the form (shown in its error line) and to the
    // Vercel function logs, instead of an opaque platform 500.
    console.error('submit-need failed:', error)
    return json(500, { error: error instanceof Error ? error.message : 'internal' })
  }
}
