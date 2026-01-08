export type Language = 'en' | 'ar';

export const translations = {
  en: {
    // Header
    selectRestaurant: 'Select a Restaurant',
    touchToOrder: 'Touch to browse menu and call',
    
    // Restaurant
    viewMenu: 'View Menu',
    callRestaurant: 'Call Restaurant',
    calling: 'Calling...',
    available: 'Available',
    busy: 'Busy',
    menu: 'Menu',
    restaurantInfo: 'Restaurant Info',
    contact: 'Contact',
    address: 'Address',
    hours: 'Hours',
    
    // Menu
    menuCategories: 'Categories',
    price: 'Price',
    backToRestaurants: 'Back to Restaurants',
    
    // Call
    startCall: 'Start Call',
    endCall: 'End Call',
    callInProgress: 'Call in Progress',
    callEnded: 'Call Ended',
    duration: 'Duration',
    
    // General
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    close: 'Close',
    
    // Language
    language: 'Language',
    english: 'English',
    arabic: 'العربية',
  },
  ar: {
    // Header
    selectRestaurant: 'اختر مطعماً',
    touchToOrder: 'المس لتصفح القائمة والاتصال',
    
    // Restaurant
    viewMenu: 'عرض القائمة',
    callRestaurant: 'اتصل بالمطعم',
    calling: 'جاري الاتصال...',
    available: 'متاح',
    busy: 'مشغول',
    menu: 'القائمة',
    restaurantInfo: 'معلومات المطعم',
    contact: 'الاتصال',
    address: 'العنوان',
    hours: 'ساعات العمل',
    
    // Menu
    menuCategories: 'الفئات',
    price: 'السعر',
    backToRestaurants: 'العودة للمطاعم',
    
    // Call
    startCall: 'بدء الاتصال',
    endCall: 'إنهاء الاتصال',
    callInProgress: 'الاتصال جارٍ',
    callEnded: 'انتهى الاتصال',
    duration: 'المدة',
    
    // General
    loading: 'جاري التحميل...',
    error: 'خطأ',
    retry: 'إعادة المحاولة',
    close: 'إغلاق',
    
    // Language
    language: 'اللغة',
    english: 'English',
    arabic: 'العربية',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
