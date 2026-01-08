import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
      className="lang-toggle group"
    >
      <Globe className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      <span className="text-sm font-medium text-foreground">
        {language === 'en' ? 'العربية' : 'English'}
      </span>
    </button>
  );
}
