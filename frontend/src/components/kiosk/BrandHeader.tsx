import { useLanguage } from '@/contexts/LanguageContext';
import { getAccessibleImageUrl } from '@/utils/imageUtils';
import defaultLogo from '@/assets/logo-the-drive.png';

interface BrandHeaderProps {
  compact?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'; // Add size variants
  logoUrl?: string;
  showTitle?: boolean;
}

export function BrandHeader({ compact = false, className = "", size = 'lg', logoUrl, showTitle = false }: BrandHeaderProps) {
  const { t } = useLanguage();

  if (compact) {
    // Compact view remains text-only for now unless specified otherwise, but keeping as is for safety
    return (
        <div className={`flex flex-col items-center select-none ${className}`}>
             <img 
                src={defaultLogo} 
                alt="The Drive" 
                className="w-32 h-auto object-contain drop-shadow-md"
            />
        </div>
    );
  }

  // Size mappings
  const sizeClasses = {
      sm: 'text-6xl',
      md: 'text-8xl md:text-9xl',
      lg: 'text-8xl md:text-9xl', // Original default
      xl: 'text-[10rem] md:text-[12rem]',
      '2xl': 'text-[12rem] md:text-[16rem]',
      '3xl': 'text-[16rem] md:text-[20rem]',
      '4xl': 'text-[20rem] md:text-[24rem]'
  };

  const subSizeClasses = {
      sm: 'text-xl',
      md: 'text-3xl',
      lg: 'text-3xl',
      xl: 'text-5xl',
      '2xl': 'text-6xl',
      '3xl': 'text-7xl',
      '4xl': 'text-8xl'
  };

  // Image Size Mappings (Squares)
  const imgSizeClasses = {
      sm: 'w-24 h-24',
      md: 'w-48 h-48',
      lg: 'w-64 h-64',
      xl: 'w-80 h-80',
      '2xl': 'w-96 h-96 md:w-[32rem] md:h-[32rem]',
      '3xl': 'w-[30rem] h-[30rem] md:w-[40rem] md:h-[40rem]',
      '4xl': 'w-[40rem] h-[40rem] md:w-[50rem] md:h-[50rem]'
  };

  // Use provided url or fallback to default asset
  const finalLogo = logoUrl ? getAccessibleImageUrl(logoUrl) : defaultLogo;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div className="flex flex-col items-center relative mb-4 animate-fade-in">
        <div className={`${imgSizeClasses[size]} relative flex items-center justify-center`}>
            <img 
                src={finalLogo} 
                alt="Brand Logo" 
                className="w-full h-full object-contain drop-shadow-2xl"
            />
        </div>
      </div>
      
      {showTitle && (
      <div className="mt-8">
        <h2 className="text-white text-2xl md:text-3xl font-bold tracking-tight">
          Choose Restaurant
        </h2>
      </div>
      )}
    </div>
  );
}
