import { useLanguage } from '@/contexts/LanguageContext';

interface MenuImageViewerProps {
  menuImage: string;
  restaurantName: string;
  scale: number;
}

export function MenuImageViewer({ menuImage, restaurantName, scale }: MenuImageViewerProps) {
  const { t } = useLanguage();

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      {/* Menu Image Container - Fits within parent */ }
      <div className="relative w-full h-full flex items-center justify-center overflow-auto touch-pan-x touch-pan-y hide-scrollbar">
        <img
          src={menuImage}
          alt={`${restaurantName} menu`}
          // Use max-h-full and max-w-full to ensure it fits. object-contain preserves aspect ratio.
          className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl transition-transform duration-300 ease-out"
          style={{ 
            transform: `scale(${scale})`, // Use direct scale
            transformOrigin: 'center center',
            cursor: scale > 1 ? 'grab' : 'default'
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
