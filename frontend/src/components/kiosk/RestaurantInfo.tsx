import { useLanguage } from '@/contexts/LanguageContext';
import { Restaurant } from '@/data/mockData';
import { MapPin, Phone, Clock } from 'lucide-react';

interface RestaurantInfoProps {
  restaurant: Restaurant;
}

export function RestaurantInfo({ restaurant }: RestaurantInfoProps) {
  const { language, t } = useLanguage();

  const items = [
    {
      icon: MapPin,
      label: t('address'),
      value: language === 'ar' ? restaurant.addressAr : restaurant.addressEn,
    },
    {
      icon: Phone,
      label: t('contact'),
      value: restaurant.phone,
    },
    {
      icon: Clock,
      label: t('hours'),
      value: language === 'ar' ? restaurant.hoursAr : restaurant.hoursEn,
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <span className="w-1.5 h-6 bg-primary rounded-full" />
        {t('restaurantInfo')}
      </h3>
      
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-4 p-4 bg-secondary/50 rounded-xl"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="font-medium text-foreground">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
