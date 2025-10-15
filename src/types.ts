export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Exceptional';

export interface Mineral {
  id: string;
  name: string;
  description: string;
  imageUrls: string[];
  type: string;
  location: string;
  rarity: Rarity;
  onDisplay: boolean;
}

export interface IdentifyImageData {
  base64: string;
  mimeType: string;
}

// Types for AI-powered Homepage Customization
export type HomeComponentType = 'hero' | 'grid-2' | 'grid-3' | 'list';

export interface HomeComponent {
  id: string;
  type: HomeComponentType;
  mineralIds: string[];
  title?: string;
  animation?: {
    type: 'zoom-in' | 'none';
    duration?: string;
  }
  imageScale?: number;
}

export type HomePageLayout = HomeComponent[];

export interface LayoutHistoryEntry {
  layout: HomePageLayout;
  summary: string;
  timestamp: number;
}

export interface AppData {
  minerals: Mineral[];
  homePageLayout: HomePageLayout;
  layoutHistory: LayoutHistoryEntry[];
}