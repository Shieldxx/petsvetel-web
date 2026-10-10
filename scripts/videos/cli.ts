import { runUpdate } from './update.ts';

const args = new Set(process.argv.slice(2));
const now = new Date();
const scheduled = process.env.GITHUB_EVENT_NAME === 'schedule';
// Daily thumbnail refresh in the 11:23 UTC run: the RSS feeds often fail at night.
const refreshThumbs = args.has('--refresh-thumbs') || now.getUTCHours() === 11;

const result = await runUpdate({
  root: process.cwd(),
  now,
  dryRun: args.has('--dry-run'),
  refreshThumbs,
  allowMassRemoval: args.has('--allow-mass-removal'),
  fetchImpl: fetch,
  log: (message) => console.log(message),
});

if (result.status === 'skipped') {
  // Shows in the GitHub Actions run summary; the site keeps the last good data.
  console.log(`::warning title=Video update skipped::${result.reason}`);
  // Nightly blips stay quiet, but the daily 11 UTC run and any manual or local run fail,
  // so a lasting outage reaches the owner as a GitHub Actions failure email.
  if (!scheduled || now.getUTCHours() === 11) process.exitCode = 1;
} else if (result.status === 'unchanged') {
  console.log('No changes.');
} else {
  console.log(`Updated: ${result.added.length} added, ${result.removed.length} removed, ${result.thumbs.length} thumbnails written.`);
}
