import { runUpdate } from './update.ts';

const args = new Set(process.argv.slice(2));
const now = new Date();
// Daily thumbnail refresh in the 11:23 UTC run: the RSS feeds often fail at night.
const refreshThumbs = args.has('--refresh-thumbs') || now.getUTCHours() === 11;

const result = await runUpdate({
  root: process.cwd(),
  now,
  dryRun: args.has('--dry-run'),
  refreshThumbs,
  fetchImpl: fetch,
  log: (message) => console.log(message),
});

if (result.status === 'skipped') {
  // Shows in the GitHub Actions run summary; the site keeps the last good data.
  console.log(`::warning title=Video update skipped::${result.reason}`);
} else if (result.status === 'unchanged') {
  console.log('No changes.');
} else {
  console.log(`Updated: ${result.added.length} added, ${result.removed.length} removed, ${result.thumbs.length} thumbnails written.`);
}
