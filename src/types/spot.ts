export type SpotStatus = 'pending' | 'approved';
export type SpotType = 'skatepark' | 'street_spot' | 'skateshop';
export type SpotFeature = 'rail' | 'ledge' | 'stairs' | 'gap' | 'flatground';

export interface Spot {
  id: string;
  title: string;
  description?: string;
  spot_type?: SpotType;
  features?: string[];
  latitude: number;
  longitude: number;
  images: string[];
  status: SpotStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateSpotInput {
  title: string;
  description?: string;
  spot_type?: SpotType;
  features?: string[];
  latitude: number;
  longitude: number;
  images?: string[];
}

export interface UpdateSpotInput {
  title?: string;
  description?: string;
  spot_type?: SpotType;
  features?: string[];
  latitude?: number;
  longitude?: number;
  images?: string[];
  status?: SpotStatus;
}

