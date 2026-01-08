import { useLanguage } from '@/contexts/LanguageContext';
import { Restaurant } from '@/data/mockData';
import { Phone, ChevronRight, ChevronLeft } from 'lucide-react';
import { getAccessibleImageUrl } from '@/utils/imageUtils';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: () => void;
}

export function RestaurantCard({ restaurant, onClick }: RestaurantCardProps) {
  const { language, t, isRTL } = useLanguage();
  
  const name = language === 'ar' ? restaurant.nameAr : restaurant.nameEn;
  const description = language === 'ar' ? restaurant.descriptionAr : restaurant.descriptionEn;
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <button
      onClick={onClick}
      className="restaurant-card w-full text-start group"
    >
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={typeof restaurant.coverImage === 'string' ? restaurant.coverImage : ''}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="gradient-overlay absolute inset-0" />
        
        {/* Status Badge */}
        <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`}>
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
              (restaurant.status === 'available' || restaurant.status === 'AVAILABLE')
                ? 'status-available'
                : 'status-busy'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              (restaurant.status === 'available' || restaurant.status === 'AVAILABLE') ? 'bg-success-foreground' : 'bg-busy-foreground'
            } animate-pulse`} />
            {(restaurant.status === 'available' || restaurant.status === 'AVAILABLE') ? t('available') : t('busy')}
          </span>
        </div>

        {/* Logo */}
        <div className={`absolute -bottom-8 ${isRTL ? 'right-4' : 'left-4'}`}>
          <div className="w-20 h-20 rounded-2xl border-4 border-card overflow-hidden bg-card shadow-xl">
            <img
              src={getAccessibleImageUrl(restaurant.logoUrl || (typeof restaurant.logo === 'string' ? restaurant.logo : ''))}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`p-6 ${isRTL ? 'pr-28' : 'pl-28'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-foreground truncate mb-1">
              {name}
            </h3>
            <p className="text-muted-foreground text-sm line-clamp-2">
              {description}
            </p>
          </div>
          
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="flex items-center gap-2 text-primary">
              <Phone className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">
                {t('callRestaurant')}
              </span>
            </div>
            <Chevron className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </button>
  );
}
