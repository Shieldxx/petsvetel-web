# petsvetel-web

Web YouTube kanálu [Pět světel](https://www.youtube.com/@PetSvetel) na [petsvetel.cz](https://petsvetel.cz).

## Jak to funguje

- Astro vyrobí statický web z `src/data/videos.json` a miniatur v `src/assets/thumbs/`. Build na síť nesahá.
- Data plní jen GitHub Action `Update videos`: každou hodinu stáhne YouTube RSS (kanál, dlouhá videa, Shorty), sloučí je s uloženými daty a commitne jen při změně.
- Commit spustí Cloudflare Workers Builds, které web nasadí (statické soubory, bez Worker skriptu).
- Když RSS nefunguje, Action nic necommitne a web jede na posledních datech.

## Příkazy

| Příkaz | Co dělá |
| --- | --- |
| `npm run dev` | vývojový server |
| `npm test` | jednotkové testy |
| `npm run test:e2e` | Playwright proti lokálnímu `wrangler dev` |
| `npm run videos:dry` | ukáže, co by se změnilo v datech videí |
| `npm run videos` | aktualizuje data videí lokálně |

Ruční aktualizace dat: GitHub, záložka Actions, `Update videos`, `Run workflow`.

Spec a plán: Obsidian KB, `Projects/Pět světel/Pět světel - Web.md`.

## Nasazení

- Cloudflare Workers Builds staví každý push do `main` (`npm run build`, `npx wrangler deploy`). GitHub aplikace Cloudflare Workers and Pages musí mít přístup k tomuto repu, jinak se na push nereaguje.
- Produkce: https://petsvetel.cz, náhled: https://petsvetel-web.davkohout.workers.dev s `X-Robots-Tag: noindex`.
- `www.petsvetel.cz` přesměrovává Redirect Rule na apex, Always Use HTTPS je zapnuté.
- Pošta: Cloudflare Email Routing, `kontakt@petsvetel.cz` jen přeposílá. DMARC `p=reject`.
- Analytika: Cloudflare Web Analytics (bez cookies). Google Search Console je připojená.
