export interface Restaurant {
    id: string;
    nameEn: string;
    nameAr: string;
    logo?: string | File | null; // For form handling
    logoUrl?: string | null;     // From API
    coverImage?: string | File | null;
    menuImage?: string | File | null; // For form handling (legacy)
    menuImageUrl?: string | null;     // From API (legacy)
    menus?: { id: string, imageUrl: string }[]; // New: Multiple menu images from API
    menuImages?: (File | string)[];            // New: Helper for multi-image uploads
    descriptionEn?: string;
    descriptionAr?: string;
    addressEn?: string;
    addressAr?: string;
    phone?: string;          // Display Phone
    contactPhone?: string;   // Internal/Contact Phone
    email?: string;
    password?: string;
    hoursEn?: string;
    hoursAr?: string;
    status: 'available' | 'busy' | 'closed' | 'AVAILABLE';
    sipExtension?: string | null;
    isVisible?: boolean;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    // screenConfigs?: any[]; // Placeholder for now
}

// Menu images imported from assets
import menuAlbaik from '@/assets/menu-albaik.jpg';
import menuHerfy from '@/assets/menu-herfy.jpg';
import menuKudu from '@/assets/menu-kudu.jpg';
import menuShawarmer from '@/assets/menu-shawarmer.jpg';

export const mockRestaurants: Restaurant[] = [];

export interface Screen {
  id: string;
  name: string;
  email?: string;
  password?: string;
  assignedRestaurants: string[]; // Restaurant IDs in order
  gridConfig?: {
    rows: number;
    columns: number;
  };
  showLanguage?: 'en' | 'ar' | 'both';
  isActive?: boolean;
  restaurants?: (Restaurant & { isVisibleOnScreen: boolean })[];
}

export const mockScreens: Screen[] = [
  {
    id: '1',
    name: 'Main Hall',
    assignedRestaurants: ['1', '2', '3', '4'],
    gridConfig: { rows: 2, columns: 2 },
    showLanguage: 'both',
  },
];
