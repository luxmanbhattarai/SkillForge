# Endpoints and page rendering options

- Endpoints: `+server.js` files export HTTP method handlers
  (`GET`, `POST`, ...) returning a `Response`. Keep them thin and
  validate every request.
- Page options: export `prerender`, `ssr`, and `csr` from
  `+page.js` / `+layout.js` to control rendering per route. SSR is
  the default; prerender content pages; disable `ssr` only for
  pages that cannot render on the server.
