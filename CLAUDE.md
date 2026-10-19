@AGENTS.md

# Habla — personal Spanish study app

Single-user study app (Spanish ↔ Polish, English UI) deployed on Vercel. All progress lives in the
browser's localStorage (`src/lib/progress.ts`); there is no backend. Pushing to `main` redeploys.

## Adding a study set (the usual task)

The user attaches materials (vocab lists, textbook pages, photos…); turn them into a set:

1. Create `content/sets/NN-<slug>.json` (NN = next number, keeps sets ordered on the home screen).
2. Shape (see `src/lib/types.ts`, validated at build time by `src/lib/sets.ts`):
   ```json
   {
     "slug": "food-basics", "title": "Food & Drink", "description": "One short sentence.",
     "emoji": "🥘", "accent": "blue | purple | green", "unit": "A1 · Unit 3",
     "cards": [
       { "id": "pan", "es": "el pan", "pl": "chleb",
         "alt": { "pl": ["pieczywo"] },
         "hint": { "pl": "shown under the Polish prompt to disambiguate" },
         "note": "Grammar / usage tip shown after answering.",
         "example": { "es": "Quiero pan.", "pl": "Chcę chleba." } }
     ]
   }
   ```
3. Rules:
   - `id` is permanent (progress is keyed by `slug:id:direction`). Never rename ids or slugs of
     existing sets; fixing a typo in `es`/`pl` is fine. Use a short ASCII slug of the Spanish word.
   - Include the article for nouns (`el pan`, `la casa`) — the grader lets the user omit it but
     reminds them. Gender pairs: `alto/a`, `profesor/a`, `el/la estudiante` all expand automatically.
   - Several meanings: separate with `, ` in the field or list extras in `alt`. `(się) uczyć` makes
     the bracketed part optional.
   - If two cards share a translation (ser/estar → być), add a `hint` for that prompt language.
   - Correct accents/ñ/Polish diacritics in the source — missing accents are flagged to the user.
   - Aim for 15–35 cards per set; split bigger material into several sets.
4. Verify: `npm test && npm run build` (a malformed set fails the build), then commit and push.

## Code map
- `src/lib/grade.ts` — forgiving answer checking (accents, keyboard-adjacent typos, articles, alternatives). Tests in `grade.test.ts` (`npm test`).
- `src/lib/srs.ts` — spaced repetition per card per direction; `progress.ts` — localStorage store.
- `src/components/study/` — Flashcards, StudySession (Learn / Write / Review), MatchGame.
- Pages are statically generated; anything date- or storage-dependent renders only after hydration (`useHydrated`).
