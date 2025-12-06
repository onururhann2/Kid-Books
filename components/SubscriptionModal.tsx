import React from 'react';
import { User } from '../types';
import { Check, Zap, Crown, X } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onUpgrade: () => void;
  onClose: () => void;
  translations: any;
  user: User | null;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onUpgrade, onClose, translations: t, user }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl p-6 md:p-10 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
            <X size={24} />
        </button>

        <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
                {t.limitReached}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
                {t.limitDesc}
            </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-8 flex flex-col relative opacity-75 grayscale-[0.5] hover:grayscale-0 hover:opacity-100 transition-all">
                <div className="mb-4">
                    <span className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.freeTier}</span>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{t.priceFree}</div>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <Check className="text-gray-400" size={20} />
                        {t.feat1}
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <Check className="text-gray-400" size={20} />
                        {t.feat2}
                    </li>
                </ul>
                <button 
                    disabled
                    className="w-full py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                >
                    {t.startFree}
                </button>
            </div>

            {/* Premium Plan */}
            <div className="rounded-2xl border-2 border-purple-500 bg-gradient-to-b from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-900 p-8 flex flex-col relative transform hover:scale-105 transition-transform duration-300 shadow-xl">
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                    POPULAR
                </div>
                <div className="mb-4">
                    <span className="text-sm font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                        <Crown size={16} />
                        {t.premiumTier}
                    </span>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{t.pricePremium}</div>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3 text-gray-800 dark:text-gray-100 font-medium">
                        <div className="bg-green-100 dark:bg-green-900/50 p-1 rounded-full text-green-600 dark:text-green-400">
                            <Check size={14} strokeWidth={3} />
                        </div>
                        {t.feat3}
                    </li>
                    <li className="flex items-center gap-3 text-gray-800 dark:text-gray-100">
                         <div className="bg-green-100 dark:bg-green-900/50 p-1 rounded-full text-green-600 dark:text-green-400">
                            <Check size={14} strokeWidth={3} />
                        </div>
                        {t.feat4}
                    </li>
                     <li className="flex items-center gap-3 text-gray-800 dark:text-gray-100">
                         <div className="bg-green-100 dark:bg-green-900/50 p-1 rounded-full text-green-600 dark:text-green-400">
                            <Check size={14} strokeWidth={3} />
                        </div>
                        {t.feat5}
                    </li>
                </ul>
                <button 
                    onClick={onUpgrade}
                    className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-purple-500/30 flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                >
                    <Zap size={20} />
                    {t.goPremium}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;