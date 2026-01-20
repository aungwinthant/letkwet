export interface SongData {
  title: string;
  artist: string;
  releaseDate?: string;
  key?: string;
  chordProContent: string;
  sourceUrls: string[];
  isCached?: boolean;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Feedback {
  id?: string;
  email: string;
  song_title?: string;
  song_artist?: string;
  input_query?: string;
  rating?: number;
  comment: string;
  created_at?: string;
}

export interface SearchLog {
  query: string;
  ip_address: string;
  user_agent: string;
  is_cached: boolean;
}