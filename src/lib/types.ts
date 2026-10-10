export type VideoType = 'long' | 'short';
export type ThumbSource = 'maxresdefault' | 'hq720' | 'hqdefault' | 'oar2';

export interface Video {
  /** YouTube video id, 11 characters */
  id: string;
  type: VideoType;
  title: string;
  /** ISO 8601 in UTC, e.g. 2026-09-25T16:39:48.000Z */
  published: string;
  /** File name inside src/assets/thumbs, or null while no usable thumbnail exists */
  thumb: string | null;
  thumbSource: ThumbSource | null;
}

export interface VideoData {
  channelId: string;
  videos: Video[];
}

export interface Series {
  title: string;
  description: string;
  /** Series without a playlist are not shown */
  playlistId: string | null;
  archive?: boolean;
}

export interface NavLink {
  href: string;
  label: string;
}
