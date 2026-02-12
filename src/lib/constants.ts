import { Language, Severity } from '@/types';

export const MODEL_ID = 'claude-opus-4-6';
export const MAX_FOLLOW_UPS = 2;
export const THINKING_BUDGET = 10000;
export const VOICE_THINKING_BUDGET = 1024;

export const EMERGENCY_NUMBERS = {
  unified: '112',
  ambulance: '108',
  medical: '102',
} as const;

export interface LanguageConfig {
  code: Language;
  label: string;
  nativeLabel: string;
  speechCode: string;
  placeholder: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    speechCode: 'hi-IN',
    placeholder: 'आप कैसा महसूस कर रहे हैं? अपने लक्षण बताएं...',
  },
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    speechCode: 'en-IN',
    placeholder: 'Tell us how you\'re feeling. Describe your symptoms...',
  },
  {
    code: 'ta',
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
    speechCode: 'ta-IN',
    placeholder: 'நீங்கள் எப்படி உணர்கிறீர்கள்? உங்கள் அறிகுறிகளை விவரிக்கவும்...',
  },
  {
    code: 'te',
    label: 'Telugu',
    nativeLabel: 'తెలుగు',
    speechCode: 'te-IN',
    placeholder: 'మీరు ఎలా అనుభవిస్తున్నారు? మీ లక్షణాలను వివరించండి...',
  },
  {
    code: 'mr',
    label: 'Marathi',
    nativeLabel: 'मराठी',
    speechCode: 'mr-IN',
    placeholder: 'तुम्हाला कसे वाटते? तुमची लक्षणे सांगा...',
  },
  {
    code: 'kn',
    label: 'Kannada',
    nativeLabel: 'ಕನ್ನಡ',
    speechCode: 'kn-IN',
    placeholder: 'ನೀವು ಹೇಗೆ ಅನುಭವಿಸುತ್ತಿದ್ದೀರಿ? ನಿಮ್ಮ ರೋಗಲಕ್ಷಣಗಳನ್ನು ವಿವರಿಸಿ...',
  },
  {
    code: 'bn',
    label: 'Bengali',
    nativeLabel: 'বাংলা',
    speechCode: 'bn-IN',
    placeholder: 'আপনি কেমন অনুভব করছেন? আপনার উপসর্গগুলি বর্ণনা করুন...',
  },
];

export interface SeverityConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  description: string;
}

export const SEVERITY_CONFIG: Record<Severity, SeverityConfig> = {
  emergency: {
    label: 'Emergency',
    icon: '🚨',
    color: '#DC2626',
    bgColor: 'bg-emergency-50',
    borderColor: 'border-emergency-500',
    textColor: 'text-emergency-700',
    description: 'Requires immediate emergency care. Call 112 now.',
  },
  urgent: {
    label: 'Urgent',
    icon: '⚠️',
    color: '#EA580C',
    bgColor: 'bg-urgent-50',
    borderColor: 'border-urgent-500',
    textColor: 'text-urgent-700',
    description: 'Needs medical attention soon. Visit a hospital.',
  },
  routine: {
    label: 'Routine',
    icon: '📋',
    color: '#CA8A04',
    bgColor: 'bg-routine-50',
    borderColor: 'border-routine-500',
    textColor: 'text-routine-700',
    description: 'Schedule a visit to your local clinic.',
  },
  self_care: {
    label: 'Self Care',
    icon: '💚',
    color: '#16A34A',
    bgColor: 'bg-selfcare-50',
    borderColor: 'border-selfcare-500',
    textColor: 'text-selfcare-700',
    description: 'Can be managed at home with basic care.',
  },
};

export const URGENCY_LABELS: Record<string, string> = {
  immediate: 'Seek care immediately',
  within_6h: 'Seek care within 6 hours',
  within_24h: 'Seek care within 24 hours',
  within_week: 'Visit a doctor this week',
  when_convenient: 'Visit when convenient',
};
