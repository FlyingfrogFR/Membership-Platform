// .mts on purpose: with "type": "module" in package.json, a .ts function can
// be emitted as CommonJS yet loaded as ESM, crashing every invocation
// (FUNCTION_INVOCATION_FAILED). The .mts extension pins the emit to ESM.
import { handleSectionSubmit, json, realDeps } from './_shared'

export async function POST(request: Request): Promise<Response> {
  try {
    return await handleSectionSubmit(request, realDeps)
  } catch (error) {
    // Surface the real cause to the form (shown in its error line) and to the
    // Vercel function logs, instead of an opaque platform 500.
    console.error('submit-section failed:', error)
    return json(500, { error: error instanceof Error ? error.message : 'internal' })
  }
}
