import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCall } from '@/contexts/CallContext';
import { LanguageToggle } from './LanguageToggle';
import { Utensils, LogOut, RefreshCw } from 'lucide-react';

interface KioskHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  showLanguageToggle?: boolean;
}

export function KioskHeader({ showBackButton, onBack, title, showLanguageToggle = true }: KioskHeaderProps) {
  const { t, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  const { callState, endCall } = useCall();

  const handleLogout = async () => {
    if (callState !== 'idle' && callState !== 'ended') {
        endCall();
    }
    await logout();
  };

  return (
    <header className="glass-panel sticky top-0 z-50 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="touch-button bg-secondary hover:bg-secondary/80 flex items-center gap-2"
            >
              <span className={`text-lg ${isRTL ? 'rotate-180' : ''}`}>←</span>
              <span className="hidden sm:inline">{t('backToRestaurants')}</span>
            </button>
          )}
          
          {!showBackButton && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Utensils className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {title || t('selectRestaurant')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('touchToOrder')}
                </p>
              </div>
            </div>
          )}

          {showBackButton && title && (
            <h1 className="text-xl font-bold text-foreground">
              {title}
            </h1>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {showLanguageToggle && <LanguageToggle />}
          {user && (
            <>
                <button
                onClick={() => {
                    if (callState !== 'idle') endCall();
                    setTimeout(() => window.location.reload(), 300);
                }}
                className="touch-button bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center w-12 h-10 rounded-lg"
                title="Reset"
                >
                <RefreshCw className="w-5 h-5" />
                </button>
                <button
                onClick={handleLogout}
                className="touch-button bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 px-4 py-2"
                title={isRTL ? 'تسجيل الخروج' : 'Logout'}
                >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold">{isRTL ? 'خروج' : 'Logout'}</span>
                </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
