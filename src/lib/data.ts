import raw from '../data/videos.json';
import type { VideoData } from './types.ts';

export const videoData = raw as unknown as VideoData;
