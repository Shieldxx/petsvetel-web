import type { Series } from './lib/types.ts';

export const site = {
  name: 'Pět světel',
  url: 'https://petsvetel.cz',
  tagline: 'Český kanál o motorsportu: F1, NLS, IMSA a simracing.',
  description:
    'Pět světel je český YouTube kanál o motorsportu: F1, NLS, IMSA a simracing. Měsíc v motorsportu, vysvětlení pravidel a tipy před závody.',
  channelId: 'UCcj_RIb74fEMw3RbdQWCLIg',
  channelUrl: 'https://www.youtube.com/@PetSvetel',
  subscribeUrl: 'https://www.youtube.com/@PetSvetel?sub_confirmation=1',
  /** Videos published before this Prague calendar day are shown as archive */
  relaunchDate: '2026-09-25',
  contactEmail: 'kontakt@petsvetel.cz',
  controllerName: 'David Kohout',
} as const;

export const series: Series[] = [
  {
    title: 'Měsíc v motorsportu',
    description: 'Co se za poslední týdny stalo ve F1, NLS, IMSA a simracingu a proč na tom záleží.',
    playlistId: 'PLGggpgiaRi-w',
  },
  {
    title: 'Vysvětleno',
    description: 'Pravidla a situace ze závodů, které v přenosu proletí za pár vteřin.',
    // playlist vznikne s videem o VSC (16. 10. 2026), pak sem doplnit jeho ID
    playlistId: null,
  },
  {
    title: 'Novinky z F1',
    description: 'Zprávy z F1 z roku 2022, první éra kanálu.',
    playlistId: 'PLAz9j9QgDFkeD5GNQ5C35e8Kv4Fbg_nNn',
    archive: true,
  },
];

/** Only verified accounts. Facebook group: add once David confirms it still exists. */
export const socials = [
  { name: 'YouTube', url: 'https://www.youtube.com/@PetSvetel' },
  { name: 'Instagram', url: 'https://www.instagram.com/petsvetel/' },
] as const;
