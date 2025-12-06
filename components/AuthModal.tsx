import React, { useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onLogin: (data: { username: string, email?: string, provider?: 'google' | 'apple' | 'microsoft' }) => void;
  onClose: () => void;
  translations: any;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onLogin, onClose, translations: t }) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'microsoft') => {
    setLoadingProvider(provider);
    
    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Mock user data based on provider
    let mockData;
    switch (provider) {
        case 'google':
            mockData = { username: 'Google User', email: 'user@gmail.com', provider };
            break;
        case 'apple':
            mockData = { username: 'Apple User', email: 'user@icloud.com', provider };
            break;
        case 'microsoft':
            mockData = { username: 'Microsoft User', email: 'user@outlook.com', provider };
            break;
    }
    
    onLogin(mockData);
    setLoadingProvider(null);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative border border-gray-200 dark:border-gray-700">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
            <X size={20} />
        </button>

        <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/30 rounded-full mb-4 shadow-inner">
                 <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t.loginTitle}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center mt-2 text-sm">{t.loginDesc}</p>
        </div>

        <div className="space-y-3">
          {/* Google Button */}
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={!!loadingProvider}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium py-3 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-wait relative overflow-hidden"
          >
             {loadingProvider === 'google' ? (
                 <Loader2 className="animate-spin text-gray-500" size={20} />
             ) : (
                <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>{t.continueGoogle}</span>
                </>
             )}
          </button>

          {/* Apple Button */}
          <button
            onClick={() => handleSocialLogin('apple')}
            disabled={!!loadingProvider}
            className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-900 text-white font-medium py-3 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-wait"
          >
             {loadingProvider === 'apple' ? (
                 <Loader2 className="animate-spin text-white" size={20} />
             ) : (
                <>
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                         <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.9 4.35-.61c1.55.27 2.68.91 3.08 1.52-4.32 2.07-3.05 8.56 1.57 10.15-.33.85-.73 1.7-1.28 2.28-.55.6-1.55 1.58-2.8 1.11zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    <span>{t.continueApple}</span>
                </>
             )}
          </button>

          {/* Microsoft Button */}
          <button
             onClick={() => handleSocialLogin('microsoft')}
             disabled={!!loadingProvider}
             className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium py-3 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-wait"
          >
            {loadingProvider === 'microsoft' ? (
                 <Loader2 className="animate-spin text-gray-500" size={20} />
             ) : (
                <>
                    <svg className="w-5 h-5" viewBox="0 0 23 23">
                        <path fill="#f35325" d="M1 1h10v10H1z"/>
                        <path fill="#81bc06" d="M12 1h10v10H12z"/>
                        <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                        <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                    <span>{t.continueMicrosoft}</span>
                </>
            )}
          </button>
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-8 px-4 leading-tight">
           {t.terms}
        </p>
      </div>
    </div>
  );
};

export default AuthModal;