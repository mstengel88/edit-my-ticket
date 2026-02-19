Deno.serve(async (_req: Request) => {
  return new Response(JSON.stringify({ test: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
