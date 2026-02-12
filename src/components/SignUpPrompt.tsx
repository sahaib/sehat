'use client';

import { useState } from 'react';
import { CLERK_ENABLED } from '@/hooks/useAuth';
import ClerkSignUpCTA from '@/components/ClerkSignUpCTA';
import { Language } from '@/types';

interface SignUpPromptProps {
  language: Language;
  onProfileClick: () => void;
}

const PROMPT_TEXT: Record<Language, { title: string; subtitle: string; cta: string; later: string; profile: string }> = {
  hi: {
    title: 'अपनी सेहत को ट्रैक करें',
    subtitle: 'फ्री अकाउंट बनाएं — अपना हेल्थ प्रोफाइल सेव करें और बेहतर सलाह पाएं।',
    cta: 'साइन अप करें',
    later: 'बाद में',
    profile: 'प्रोफाइल पूरा करें',
  },
  en: {
    title: 'Track your health',
    subtitle: 'Create a free account to save your health profile and get personalized guidance.',
    cta: 'Sign up free',
    later: 'Maybe later',
    profile: 'Complete Profile',
  },
  ta: {
    title: 'உங்கள் ஆரோக்கியத்தை கண்காணிக்கவும்',
    subtitle: 'இலவச கணக்கு உருவாக்கி, உங்கள் சுகாதார சுயவிவரத்தை சேமிக்கவும்.',
    cta: 'பதிவு செய்யுங்கள்',
    later: 'பின்னர்',
    profile: 'சுயவிவரத்தை பூர்த்தி செய்யுங்கள்',
  },
  te: {
    title: 'మీ ఆరోగ్యాన్ని ట్రాక్ చేయండి',
    subtitle: 'ఉచిత ఖాతా సృష్టించి, మీ ఆరోగ్య ప్రొఫైల్‌ను సేవ్ చేయండి.',
    cta: 'సైన్ అప్ చేయండి',
    later: 'తర్వాత',
    profile: 'ప్రొఫైల్ పూర్తి చేయండి',
  },
  mr: {
    title: 'तुमच्या आरोग्याचा मागोवा घ्या',
    subtitle: 'मोफत अकाउंट तयार करा — तुमचे हेल्थ प्रोफाइल सेव्ह करा.',
    cta: 'साइन अप करा',
    later: 'नंतर',
    profile: 'प्रोफाइल पूर्ण करा',
  },
  kn: {
    title: 'ನಿಮ್ಮ ಆರೋಗ್ಯವನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',
    subtitle: 'ಉಚಿತ ಖಾತೆ ರಚಿಸಿ, ನಿಮ್ಮ ಆರೋಗ್ಯ ಪ್ರೊಫೈಲ್ ಅನ್ನು ಉಳಿಸಿ.',
    cta: 'ಸೈನ್ ಅಪ್ ಮಾಡಿ',
    later: 'ನಂತರ',
    profile: 'ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ',
  },
  bn: {
    title: 'আপনার স্বাস্থ্য ট্র্যাক করুন',
    subtitle: 'বিনামূল্যে অ্যাকাউন্ট তৈরি করুন — আপনার স্বাস্থ্য প্রোফাইল সেভ করুন।',
    cta: 'সাইন আপ করুন',
    later: 'পরে',
    profile: 'প্রোফাইল সম্পূর্ণ করুন',
  },
};

export default function SignUpPrompt({ language, onProfileClick }: SignUpPromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // If user already has a profile name saved, they don't need this prompt
  if (typeof window !== 'undefined' && localStorage.getItem('sehat_user_name')) {
    return null;
  }

  const t = PROMPT_TEXT[language];

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 animate-fade-in">
      <p className="text-sm font-semibold text-teal-800">{t.title}</p>
      <p className="text-xs text-teal-600 mt-1">{t.subtitle}</p>
      <div className="flex gap-2 mt-3">
        {CLERK_ENABLED ? (
          <ClerkSignUpCTA
            ctaText={t.cta}
            onProfileClick={onProfileClick}
            profileLabel={t.profile}
          />
        ) : (
          <a
            href="/sign-up"
            className="flex-1 py-2 bg-teal-600 text-white text-sm font-semibold
                       rounded-xl hover:bg-teal-700 transition-colors active:scale-[0.98] text-center"
          >
            {t.cta}
          </a>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="px-4 py-2 text-sm text-teal-600 hover:bg-teal-100 rounded-xl transition-colors"
        >
          {t.later}
        </button>
      </div>
    </div>
  );
}
