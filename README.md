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
