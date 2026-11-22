import { test } from "node:test";
import assert from "node:assert";
import { build } from "./app.js";

test("POST /v1/orders validates the body", async () => {
  const app = build();
  const res = await app.inject({
    method: "POST",
    url: "/v1/orders",
    payload: { totalMinor: -5, currency: "USD" },
  });
  assert.equal(res.statusCode, 400);
});
