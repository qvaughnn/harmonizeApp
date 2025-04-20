import { Song } from './song';
import { UserRef } from './user';

export type Playlist = {
  id: string;
  name: string;
  description: string;
  cover_art: string;
  owner: UserRef;
  harmonizers: UserRef[];
  og_platform: 'spotify' | 'apple' | 'harmonize';
  songs: Song[];
};

export type PlaylistPreview = {
    id: string;
    name: string;
    cover_art: string;
  };
