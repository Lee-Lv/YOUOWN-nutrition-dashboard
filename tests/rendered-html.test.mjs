import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async (t) => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  let worker;
  try {
    ({ default: worker } = await import(workerUrl.href));
  } catch (error) {
    // The standard Node loader cannot resolve Vinext's Cloudflare runtime
    // module. Keep this assertion for a compatible worker runtime while
    // allowing the portable installer test suite to validate everything else.
    if (error?.code === "ERR_UNSUPPORTED_ESM_URL_SCHEME" && String(error.message).includes("cloudflare:")) {
      t.skip("requires a Cloudflare-compatible module loader");
      return;
    }
    throw error;
  }

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});
