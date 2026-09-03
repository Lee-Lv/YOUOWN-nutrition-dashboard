export async function POST() {
  return Response.json(
    {
      ok: false,
      error: "Direct sync is retired. The dashboard now reads Google Sheet automatically.",
    },
    { status: 410 },
  );
}
