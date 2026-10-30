// Request timing for the Edge Functions. One JSON line per request and per model call, written
// to the function logs (supabase functions logs). Only numbers, status codes and token counts go
// in: never the image, the word, the prompt or the model's output.

/** Runs a handler and logs its status and duration. The response is returned unchanged. */
export async function timedRequest(
  fn: string,
  req: Request,
  handle: (req: Request) => Promise<Response>,
): Promise<Response> {
  const started = performance.now();
  const res = await handle(req);
  console.log(JSON.stringify({
    event: 'request',
    fn,
    method: req.method,
    status: res.status,
    ms: Math.round(performance.now() - started),
  }));
  return res;
}

/** Logs one model call: how long it took and how many tokens it used, when the provider reports them. */
export function logModelCall(
  fn: string,
  started: number,
  usage?: { input_tokens?: number; output_tokens?: number } | null,
): void {
  console.log(JSON.stringify({
    event: 'model',
    fn,
    ms: Math.round(performance.now() - started),
    input_tokens: usage?.input_tokens ?? null,
    output_tokens: usage?.output_tokens ?? null,
  }));
}
