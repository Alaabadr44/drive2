import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { BrandHeader } from '@/components/kiosk/BrandHeader';

export function ThankYouOverlay() {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Navigate back to the restaurant selection page
      navigate('/my-restaurants');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#111111] flex flex-col items-center justify-center animate-in fade-in duration-500">
      {/* Branding Logo */}
      <div className="flex flex-col items-center relative mb-24">
         <BrandHeader size="4xl" />
      </div>
      
      {/* Thank You Text */}
      <div className="text-center space-y-4 px-6 max-w-2xl animate-in slide-in-from-bottom duration-700 delay-300 fill-mode-both">
        <h2 className="text-white text-4xl md:text-5xl font-black tracking-tight leading-tight">
          {isRTL ? 'شكراً لطلبكم' : 'Thank you for your order'}
        </h2>
        <p className="text-white/70 text-2xl md:text-3xl font-medium tracking-wide">
          {isRTL ? 'يرجى استلام الطلب من البائع' : 'Please pick it up from our vendor'}
        </p>
      </div>
    </div>
  );
}
