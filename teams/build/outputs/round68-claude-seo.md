# Round 68 — Claude: two search fixes (sitemap TEST/explore, /signin noindex)

Status: started 2026-11-26T21:19Z. (Updated below as I go.)

Job: `publicPaths()` in commons/server.mjs leaves out TEST-titled market listings and `/explore`; `/signin` answers `X-Robots-Tag: noindex`; test `commons/test/seo-sitemap-signin.mjs`.
