import { handleSectionSubmit, realDeps } from './_shared'

export function POST(request: Request): Promise<Response> {
  return handleSectionSubmit(request, realDeps)
}
