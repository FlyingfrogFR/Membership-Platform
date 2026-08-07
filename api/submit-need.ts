import { handleNeedSubmit, realDeps } from './_shared'

export function POST(request: Request): Promise<Response> {
  return handleNeedSubmit(request, realDeps)
}
