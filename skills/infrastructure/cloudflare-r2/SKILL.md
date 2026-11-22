---
name: cloudflare-r2
description: >
  Use this skill when storing and serving files with Cloudflare R2 object
  storage: creating R2 buckets, binding R2 to Workers, uploading and
  downloading objects, setting public access or presigned URLs, choosing
  R2 over other Cloudflare storage, and managing object lifecycle. Trigger
  keywords: R2, Cloudflare R2, object storage, bucket, S3-compatible,
  upload, download, presigned URL, wrangler r2.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js, the Wrangler CLI, a Cloudflare account, and network access to Cloudflare.
---

# Cloudflare R2

## Purpose

This skill covers Cloudflare R2, the S3-compatible object storage service
built for the Cloudflare platform. It produces bucket setups, Worker
bindings, and upload/download code that store files safely and serve them
efficiently.

## When to Use

- Creating an R2 bucket for user uploads, images, videos, backups, or
  generated files.
- Uploading, downloading, listing, or deleting objects from Worker code.
- Serving public assets from R2 through a custom domain or a Worker.
- Generating presigned URLs for time-limited private downloads.
- Migrating files from S3-compatible storage to R2.

## When Not to Use

- Relational data with queries and joins — use `cloudflare-d1`.
- Small, frequently-read configuration or session values — use
  `cloudflare-kv`.
- Background job processing — use `cloudflare-queues`.
- Stateful coordination — use `durable-objects`.
- Writing the Worker itself — use `cloudflare-workers`.
- Static site hosting with build and preview workflows — consider
  Cloudflare Pages or `vercel` instead.

## Prerequisites

- A Cloudflare account and Wrangler installed and authenticated.
  Wrangler 4.x is the current major version. In Wrangler 4, `wrangler
  r2 object` commands default to local mode; add `--remote` to operate
  on the live bucket.
- A Worker project with a `wrangler.toml` that will declare the R2 binding.
- An understanding of object keys (paths), content types, and the
  difference between public and private buckets.
- For S3-compatible access from outside Workers: R2 API tokens created in
  the Cloudflare dashboard.
- Version range: Wrangler 4.x.

## Official Documentation

- [Cloudflare R2 docs](https://developers.cloudflare.com/r2/) — concepts,
  buckets, bindings, and S3 compatibility.
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  how bindings reach Worker code.
- [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/) —
  CLI reference including `wrangler r2` commands.

## Required Workflow

1. Create the bucket with `wrangler r2 bucket create` and record the
   bucket name.
2. Add the `[[r2_buckets]]` binding to `wrangler.toml`.
3. Decide the access model before writing code: private bucket served
   through a Worker, or public bucket behind a custom domain.
4. Write upload and download code that sets the correct content type and
   validates file size and type before storing.
5. Store object metadata (key, content type, size, owner) in D1 or KV;
   do not rely on listing the bucket as a database.
6. Test uploads and downloads locally with `wrangler dev`.
7. Deploy and verify the full upload and download flow against the live
   bucket.
8. Document the bucket name, access model, and lifecycle rules.

## Implementation Standards

- Use descriptive, namespaced object keys such as
  `uploads/<user-id>/<uuid>.<ext>` so keys never collide and are easy to
  list by prefix.
- Always set the content type on upload; never trust the client-supplied
  content type without validation.
- Enforce a maximum file size in the Worker before accepting an upload.
- Generate unique keys server-side; never let clients choose arbitrary
  keys that could overwrite other users' objects.
- Keep buckets private by default; make a bucket public only when the
  content is genuinely meant for the open web.
- Use presigned URLs for private downloads with a short expiry rather
  than making objects public.
- Store the object key in D1 alongside the owning record; the bucket is
  storage, not a database.

## Best Practices

- Serve public assets through a custom domain or a Worker so caching and
  access control apply.
- Use multipart upload for large files rather than a single request.
- Set cache headers on responses for immutable assets so the CDN caches
  them.
- Use lifecycle rules to delete temporary uploads and old objects that
  are no longer referenced.
- Version object keys (for example with a content hash) when content
  changes, so cached copies do not go stale.
- Log upload and delete operations so orphaned objects can be found and
  cleaned up.

## Security Considerations

- Never make a bucket public when it holds user uploads, backups, or
  anything sensitive.
- Validate file type by inspecting content, not only by extension or the
  client-supplied content type.
- Do not serve user-uploaded HTML or scripts from a domain that shares
  cookies with the main application; serve untrusted content from a
  separate domain.
- Use presigned URLs with short expiry for private file access; do not
  expose long-lived public URLs to private content.
- Scope R2 API tokens to the buckets they need; rotate and revoke tokens
  that are no longer used.
- Scan or quarantine uploads when the application accepts files from
  untrusted users.

## Performance Considerations

- R2 has no egress fees on the Cloudflare network; serving through a
  Worker or custom domain keeps traffic on that network.
- Use range requests for large downloads such as video so clients can
  resume and seek.
- Upload large files with multipart upload to improve reliability and
  allow retries of individual parts.
- Cache immutable public objects aggressively; use content-hashed keys
  so a new version is a new URL.
- Avoid listing large buckets frequently; keep an index in D1 instead.

## Common Mistakes

- Letting clients choose object keys — one user can overwrite another
  user's file; generate keys server-side.
- Trusting the client-supplied content type — validate it before storing
  and serving.
- Storing files in D1 or KV — both are wrong for blobs; use R2.
- Making a bucket public to fix a download problem — use a Worker or a
  presigned URL instead.
- Forgetting to set content type — browsers may misinterpret the file or
  refuse to display it.
- Treating bucket listing as a database — list operations are slow and
  paginated; index metadata in D1.

## Examples

Create a bucket and bind it:

```bash
wrangler r2 bucket create my-uploads
```

```toml
# wrangler.toml
[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "my-uploads"
```

Upload and download from a Worker:

```ts
export interface Env {
  UPLOADS: R2Bucket;
}

// Upload with a server-generated key and validated content type.
const key = `uploads/${userId}/${crypto.randomUUID()}.png`;
await env.UPLOADS.put(key, fileBody, {
  httpMetadata: { contentType: "image/png" },
});

// Download, returning 404 when the object does not exist.
const object = await env.UPLOADS.get(key);
if (object === null) {
  return new Response("Not found", { status: 404 });
}
return new Response(object.body, {
  headers: { "Content-Type": "image/png" },
});
```

## Validation Checklist

- [ ] The bucket exists and the binding in `wrangler.toml` uses the
      correct bucket name.
- [ ] Uploads set a validated content type and enforce a size limit.
- [ ] Object keys are generated server-side and cannot collide or
      overwrite other users' files.
- [ ] Private content is not publicly accessible; downloads go through a
      Worker or presigned URL.
- [ ] The full upload and download flow works after deployment.
- [ ] Object metadata is indexed in D1 or KV, not only in the bucket.

## Expected Deliverables

- The R2 bucket created and bound in `wrangler.toml`.
- Worker code for upload and download with validation and correct content
  types.
- Documentation of the bucket name, access model, and lifecycle rules.
- Verification that the upload and download flow works after deployment.

## References

- [Cloudflare R2 docs](https://developers.cloudflare.com/r2/) — buckets,
  bindings, and S3 compatibility.
- [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/) —
  CLI reference.
- Related skills in this repository: `cloudflare`, `cloudflare-workers`,
  `cloudflare-d1`, `cloudflare-kv`, `deployment`.
