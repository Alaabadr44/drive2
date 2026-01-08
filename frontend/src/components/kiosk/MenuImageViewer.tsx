import { useLanguage } from '@/contexts/LanguageContext';

interface MenuImageViewerProps {
  menuImage: string;
  restaurantName: string;
  scale: number;
}

export function MenuImageViewer({ menuImage, restaurantName, scale }: MenuImageViewerProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {/* Menu Image Container */}
      <div className="relative overflow-auto touch-scroll hide-scrollbar">
        <div 
          className="min-h-[600px] flex items-center justify-center"
          style={{ cursor: scale > 1 ? 'grab' : 'default' }}
        >
          <img
            src={menuImage}
            alt={`${restaurantName} menu`}
            className="max-w-full rounded-2xl shadow-2xl transition-transform duration-300 ease-out"
            style={{ 
              transform: `scale(${scale * 0.9})`, // Slightly smaller base scale for better fit
              transformOrigin: 'center center',
            }}
            draggable={false}
          />
        </div>
      </div>

    </div>
  );
}
