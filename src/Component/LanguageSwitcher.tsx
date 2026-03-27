import { motion } from 'framer-motion';

interface LanguageSwitcherProps {
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
}

export const LanguageSwitcher = ({ lang, setLang }: LanguageSwitcherProps) => {
  
  const toggleSwitch = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    setLang(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const switchTo = (target: 'ar' | 'en') => {
    if (lang !== target) toggleSwitch();
  };

  const isArabic = lang === 'ar';

  return (
    <div className="flex items-center gap-3 select-none" dir="ltr">
      
      {/* English Label */}
      <button 
        onClick={() => switchTo('en')}
        className={`text-sm font-bold transition-colors duration-300 ${
          !isArabic ? 'text-[#2596be] scale-110' : 'text-gray-400 hover:text-gray-500'
        }`}
      >
        EN
      </button>

      {/* The Switch Track */}
      <div 
        onClick={toggleSwitch}
        className={`
          relative w-14 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 shadow-inner
          ${isArabic ? 'bg-[#2596be]' : 'bg-gray-300'} 
        `}
      >
        {/* The Sliding Knob */}
        <motion.div
          className="w-5 h-5 bg-white rounded-full shadow-md"
          layout
          initial={false}
          animate={{
            x: isArabic ? 28 : 0 // Adjusted for w-14 width
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
        />
      </div>

      {/* Arabic Label */}
      <button 
        onClick={() => switchTo('ar')}
        className={`text-sm font-bold transition-colors duration-300 ${
          isArabic ? 'text-[#2596be] scale-110' : 'text-gray-400 hover:text-gray-500'
        }`}
      >
        AR
      </button>
    </div>
  );
};