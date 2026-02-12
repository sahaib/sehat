import { Language, EmergencyDetection } from '@/types';

interface EmergencyDictionary {
  keywords: string[];
  patterns: RegExp[];
}

const EMERGENCY_KEYWORDS: Record<Language, EmergencyDictionary> = {
  en: {
    keywords: [
      // Cardiac
      'heart attack', 'cardiac arrest', 'chest pain', 'chest tightness',
      // Respiratory
      'not breathing', 'can\'t breathe', 'cannot breathe', 'difficulty breathing',
      'stopped breathing', 'choking', 'suffocating',
      // Neurological
      'unconscious', 'unresponsive', 'seizure', 'convulsion', 'stroke',
      'face drooping', 'arm weakness', 'slurred speech', 'paralysis',
      'worst headache', 'sudden severe headache',
      // Trauma
      'severe bleeding', 'heavy bleeding', 'won\'t stop bleeding',
      'head injury', 'gunshot', 'stabbed', 'stab wound',
      // Poisoning
      'poisoning', 'poison', 'overdose', 'swallowed bleach',
      'swallowed acid', 'drank poison',
      // Pediatric
      'baby not breathing', 'infant not breathing', 'child not breathing',
      'child unconscious', 'baby choking', 'child choking',
      'baby convulsion', 'child seizure', 'blue baby',
      // Obstetric
      'pregnancy bleeding', 'pregnant bleeding', 'miscarriage',
      'water broke early', 'premature labor',
      // Burns/Environment
      'severe burn', 'third degree burn', 'large burn', 'electrocution',
      'drowning', 'near drowning', 'heat stroke', 'heat exhaustion',
      // Allergic/Anaphylaxis
      'anaphylaxis', 'anaphylactic', 'severe allergic reaction',
      'throat swelling', 'throat closing', 'face swelling', 'tongue swelling',
      'hives and breathing', 'allergic shock',
      // Diabetic
      'diabetic emergency', 'sugar very low', 'diabetic coma',
      'blood sugar dangerously', 'insulin shock',
      // Trauma expanded
      'compound fracture', 'bone through skin', 'neck injury', 'spine injury',
      'spinal injury', 'fell from height', 'hit by vehicle', 'road accident',
      'farm machinery', 'farm accident',
      // Mental Health
      'suicide', 'suicidal', 'wants to die', 'self harm', 'killing myself',
      // General
      'dying', 'collapsed', 'no pulse', 'ambulance',
      // Animal
      'snake bite', 'snakebite', 'dog bite rabies', 'scorpion sting',
    ],
    patterns: [
      /can'?t\s+breathe/i,
      /no\s+pulse/i,
      /not\s+breathing/i,
      /won'?t\s+stop\s+bleeding/i,
      /face\s+(is\s+)?drooping/i,
      /arm\s+(is\s+)?weak/i,
      /slurr(ed|ing)\s+speech/i,
    ],
  },
  hi: {
    keywords: [
      // Cardiac
      'दिल का दौरा', 'हार्ट अटैक', 'सीने में दर्द', 'छाती में दर्द',
      'सीने में जकड़न', 'दिल बंद',
      // Respiratory
      'सांस नहीं आ रही', 'सांस बंद', 'सांस लेने में तकलीफ',
      'सांस नहीं ले पा रहा', 'सांस रुक गई', 'दम घुट रहा',
      'गला घुट रहा',
      // Neurological
      'बेहोश', 'होश नहीं', 'दौरा पड़ रहा', 'दौरा आया', 'मिर्गी',
      'चेहरा टेढ़ा', 'हाथ काम नहीं कर रहा', 'बोल नहीं पा रहा',
      'लकवा', 'स्ट्रोक', 'अचानक सिरदर्द',
      // Trauma
      'खून बह रहा', 'बहुत खून', 'खून बंद नहीं हो रहा',
      'सिर में चोट', 'सिर फट गया', 'गोली लगी', 'चाकू लगा',
      // Poisoning
      'जहर', 'ज़हर खा लिया', 'तेज़ाब पी लिया', 'फिनायल पी लिया',
      'कीटनाशक', 'दवाई ज़्यादा खा ली',
      // Pediatric
      'बच्चा सांस नहीं ले रहा', 'बच्चे को दौरा', 'बच्चा बेहोश',
      'बच्चा नीला पड़ गया', 'बच्चे का गला घुट',
      // Obstetric
      'गर्भवती खून', 'प्रेगनेंसी में खून', 'गर्भपात', 'पानी की थैली फट गई',
      // Allergic/Anaphylaxis
      'एलर्जी', 'गला सूज गया', 'जीभ सूज गई', 'चेहरा सूज गया',
      'सांस लेने में दिक्कत और सूजन',
      // Diabetic
      'शुगर बहुत कम', 'शुगर बहुत ज्यादा', 'डायबिटीज इमरजेंसी',
      // Burns/Environment
      'गंभीर जलन', 'बहुत जला', 'बिजली का झटका', 'लू लग गई',
      'डूब रहा', 'डूब गया',
      // Trauma expanded
      'हड्डी बाहर आ गई', 'रीढ़ की चोट', 'गर्दन की चोट',
      'ऊंचाई से गिरा', 'सड़क दुर्घटना', 'गाड़ी ने टक्कर मारी',
      // General
      'मर रहा', 'मर रही', 'गिर गया', 'गिर गई', 'एम्बुलेंस',
      'बचाओ', 'मदद करो', 'जान का खतरा',
      // Animal
      'सांप ने काटा', 'सर्प दंश', 'कुत्ते ने काटा', 'बिच्छू ने काटा',
      // Mental Health
      'खुदकुशी', 'आत्महत्या', 'मरना चाहता', 'मरना चाहती',
      // Transliterated English
      'heart attack', 'stroke', 'ambulance',
    ],
    patterns: [
      /सांस\s*नहीं/,
      /खून\s*बह/,
      /बेहोश/,
      /दौरा\s*(पड़|आ)/,
      /जहर|ज़हर/,
      /मर\s*रह/,
    ],
  },
  ta: {
    keywords: [
      // Cardiac
      'மாரடைப்பு', 'நெஞ்சு வலி', 'இதய செயலிழப்பு', 'மார்பு வலி',
      // Respiratory
      'மூச்சு விடமுடியவில்லை', 'மூச்சு விடல் சிரமம்', 'மூச்சு நின்றுவிட்டது',
      'மூச்சு திணறல்', 'தொண்டையில் அடைப்பு',
      // Neurological
      'மயக்கம்', 'நினைவு இல்லை', 'வலிப்பு', 'பக்கவாதம்',
      'முகம் சரிவு', 'பேச முடியவில்லை', 'கை செயலிழப்பு',
      // Trauma
      'அதிக ரத்தப்போக்கு', 'இரத்தப்போக்கு', 'தலையில் அடி',
      // Poisoning
      'விஷம்', 'விஷம் குடித்தார்', 'பூச்சிக்கொல்லி',
      // Pediatric
      'குழந்தை மூச்சு', 'குழந்தை மயக்கம்', 'குழந்தை வலிப்பு',
      // Obstetric
      'கர்ப்பப்போக்கு', 'கர்ப்பத்தில் இரத்தப்போக்கு',
      // Allergic/Anaphylaxis
      'கடுமையான ஒவ்வாமை', 'தொண்டை வீக்கம்', 'முகம் வீக்கம்',
      // Diabetic
      'சர்க்கரை மிகக் குறைவு', 'நீரிழிவு அவசரநிலை',
      // Burns/Environment
      'கடுமையான தீக்காயம்', 'மின்சாரம் தாக்கியது', 'நீரில் மூழ்கல்', 'வெப்பவாதம்',
      // Trauma expanded
      'எலும்பு வெளியே', 'சாலை விபத்து', 'உயரத்தில் இருந்து விழுந்தது',
      // General
      'உயிருக்கு ஆபத்து', 'அம்புலன்ஸ்', 'இறக்கிறார்',
      // Animal
      'பாம்பு கடி', 'தேள் கடி',
      // Mental Health
      'தற்கொலை',
    ],
    patterns: [
      /மூச்சு\s*(விட|நின்று)/,
      /ரத்தப்போக்கு/,
    ],
  },
  te: {
    keywords: [
      // Cardiac
      'గుండెపోటు', 'ఛాతీ నొప్పి', 'గుండె ఆగిపోయింది', 'ఛాతీలో నొప్పి',
      // Respiratory
      'శ్వాస రావడం లేదు', 'శ్వాస ఆడటం లేదు', 'ఊపిరి తీసుకోలేకపోతున్నాను',
      'ఊపిరి ఆడటం లేదు',
      // Neurological
      'స్పృహ లేదు', 'స్పృహ తప్పింది', 'మూర్ఛ', 'పక్షవాతం',
      'ముఖం వంకరగా', 'మాట రావడం లేదు',
      // Trauma
      'రక్తస్రావం', 'ఎక్కువ రక్తం', 'తలకు దెబ్బ',
      // Poisoning
      'విషం', 'విషం తాగాడు', 'పురుగుమందు',
      // Pediatric
      'బిడ్డకు శ్వాస', 'పిల్లవాడు స్పృహ',
      // Allergic/Anaphylaxis
      'తీవ్రమైన అలెర్జీ', 'గొంతు వాపు', 'ముఖం వాపు',
      // Diabetic
      'షుగర్ చాలా తక్కువ', 'డయాబెటిక్ ఎమర్జెన్సీ',
      // Burns/Environment
      'తీవ్రమైన కాలిన గాయం', 'విద్యుత్ షాక్', 'నీటిలో మునిగిపోయాడు',
      // Trauma expanded
      'ఎముక బయటకు వచ్చింది', 'రోడ్డు ప్రమాదం', 'ఎత్తు నుండి పడిపోయాడు',
      // General
      'ప్రాణాపాయం', 'అంబులెన్స్', 'చనిపోతున్నాడు',
      // Animal
      'పాము కాటు', 'తేలు కుట్టింది',
      // Mental Health
      'ఆత్మహత్య',
    ],
    patterns: [
      /శ్వాస\s*(రావడం|ఆడటం)\s*లేదు/,
      /రక్తస్రావం/,
    ],
  },
  mr: {
    keywords: [
      // Cardiac
      'हृदयविकाराचा झटका', 'छातीत दुखणे', 'हार्ट अटॅक', 'छातीत वेदना',
      // Respiratory
      'श्वास घेता येत नाही', 'श्वास बंद', 'श्वास लागत नाही',
      'दम लागतो', 'गुदमरत आहे',
      // Neurological
      'बेशुद्ध', 'शुद्ध हरपली', 'झटके', 'अर्धांगवायू', 'पक्षाघात',
      'तोंड वाकडे', 'बोलता येत नाही',
      // Trauma
      'रक्तस्राव', 'खूप रक्त', 'रक्त थांबत नाही',
      'डोक्याला मार', 'डोक्याला इजा',
      // Poisoning
      'विष', 'विष प्राशन', 'कीटकनाशक',
      // Pediatric
      'बाळाला श्वास', 'मूल बेशुद्ध',
      // Allergic/Anaphylaxis
      'तीव्र ऍलर्जी', 'घसा सुजला', 'चेहरा सुजला',
      // Diabetic
      'शुगर खूप कमी', 'मधुमेह आणीबाणी',
      // Burns/Environment
      'गंभीर भाजणे', 'विजेचा धक्का', 'बुडत आहे', 'उष्माघात',
      // Trauma expanded
      'हाड बाहेर आले', 'रस्ता अपघात', 'उंचीवरून पडले',
      // General
      'जीवाला धोका', 'रुग्णवाहिका', 'मरत आहे',
      // Animal
      'सापाने चावले', 'विंचवाने चावले',
      // Mental Health
      'आत्महत्या',
    ],
    patterns: [
      /श्वास\s*(घेता|बंद|लागत)/,
      /रक्तस्राव/,
    ],
  },
  kn: {
    keywords: [
      // Cardiac
      'ಹೃದಯಾಘಾತ', 'ಎದೆ ನೋವು', 'ಹೃದಯ ನಿಂತಿದೆ',
      // Respiratory
      'ಉಸಿರಾಡಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ', 'ಉಸಿರಾಟ ನಿಲ್ಲಿಸಿದೆ',
      'ಉಸಿರು ಬರುತ್ತಿಲ್ಲ', 'ಗಂಟಲು ಕಟ್ಟಿದೆ',
      // Neurological
      'ಪ್ರಜ್ಞೆ ತಪ್ಪಿದೆ', 'ಪ್ರಜ್ಞೆ ಇಲ್ಲ', 'ಸೆಳೆತ', 'ಪಾರ್ಶ್ವವಾಯು',
      'ಮುಖ ವಾಲಿದೆ', 'ಮಾತನಾಡಲು ಆಗುತ್ತಿಲ್ಲ',
      // Trauma
      'ರಕ್ತಸ್ರಾವ', 'ತುಂಬಾ ರಕ್ತ', 'ತಲೆಗೆ ಪೆಟ್ಟು',
      // Poisoning
      'ವಿಷ', 'ವಿಷ ಕುಡಿದಿದ್ದಾರೆ', 'ಕೀಟನಾಶಕ',
      // Allergic/Anaphylaxis
      'ತೀವ್ರ ಅಲರ್ಜಿ', 'ಗಂಟಲು ಊತ', 'ಮುಖ ಊತ',
      // Diabetic
      'ಸಕ್ಕರೆ ತುಂಬಾ ಕಡಿಮೆ', 'ಮಧುಮೇಹ ತುರ್ತು',
      // Burns/Environment
      'ತೀವ್ರ ಸುಟ್ಟ ಗಾಯ', 'ವಿದ್ಯುತ್ ಆಘಾತ', 'ಮುಳುಗುತ್ತಿದ್ದಾರೆ',
      // Trauma expanded
      'ಮೂಳೆ ಹೊರಗೆ', 'ರಸ್ತೆ ಅಪಘಾತ', 'ಎತ್ತರದಿಂದ ಬಿದ್ದರು',
      // General
      'ಜೀವಕ್ಕೆ ಅಪಾಯ', 'ಆಂಬುಲೆನ್ಸ್', 'ಸಾಯುತ್ತಿದ್ದಾರೆ',
      // Animal
      'ಹಾವು ಕಡಿತ', 'ಚೇಳು ಕಡಿತ',
      // Mental Health
      'ಆತ್ಮಹತ್ಯೆ',
    ],
    patterns: [
      /ಉಸಿರ(ಾಡಲು|ಾಟ|ು)/,
      /ರಕ್ತಸ್ರಾವ/,
    ],
  },
  bn: {
    keywords: [
      // Cardiac
      'হার্ট অ্যাটাক', 'বুকে ব্যথা', 'হৃদরোগ', 'বুকে চাপ',
      // Respiratory
      'শ্বাস নিতে পারছে না', 'শ্বাস বন্ধ', 'দম বন্ধ',
      'শ্বাসকষ্ট', 'গলা আটকে গেছে',
      // Neurological
      'অজ্ঞান', 'জ্ঞান নেই', 'খিঁচুনি', 'স্ট্রোক', 'পক্ষাঘাত',
      'মুখ বেঁকে গেছে', 'কথা বলতে পারছে না',
      // Trauma
      'রক্তপাত', 'অনেক রক্ত', 'রক্ত বন্ধ হচ্ছে না',
      'মাথায় আঘাত',
      // Poisoning
      'বিষ', 'বিষ খেয়েছে', 'কীটনাশক',
      // Pediatric
      'বাচ্চা শ্বাস নিচ্ছে না', 'বাচ্চা অজ্ঞান',
      // Allergic/Anaphylaxis
      'তীব্র অ্যালার্জি', 'গলা ফুলে গেছে', 'মুখ ফুলে গেছে',
      // Diabetic
      'সুগার খুব কম', 'ডায়াবেটিক ইমার্জেন্সি',
      // Burns/Environment
      'গুরুতর পোড়া', 'বৈদ্যুতিক শক', 'ডুবে যাচ্ছে',
      // Trauma expanded
      'হাড় বেরিয়ে এসেছে', 'সড়ক দুর্ঘটনা', 'উঁচু থেকে পড়ে গেছে',
      // General
      'প্রাণসংশয়', 'অ্যাম্বুলেন্স', 'মারা যাচ্ছে',
      // Animal
      'সাপে কামড়েছে', 'বিছা কামড়েছে',
      // Mental Health
      'আত্মহত্যা',
    ],
    patterns: [
      /শ্বাস\s*(নিতে|বন্ধ)/,
      /রক্তপাত/,
    ],
  },
};

export function detectEmergency(
  text: string,
  language?: Language
): EmergencyDetection {
  const normalizedText = text.toLowerCase().trim();
  const matchedKeywords: string[] = [];

  // Check all languages to handle code-mixing
  const allLanguages = Object.keys(EMERGENCY_KEYWORDS) as Language[];
  // Prioritize selected language first, then check all others
  const languagesToCheck = language
    ? [language, ...allLanguages.filter((l) => l !== language)]
    : allLanguages;

  for (const lang of languagesToCheck) {
    const dict = EMERGENCY_KEYWORDS[lang];

    for (const keyword of dict.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    for (const pattern of dict.patterns) {
      if (pattern.test(text)) {
        // Use original text for regex (case/script sensitivity)
        const match = text.match(pattern);
        if (match && !matchedKeywords.includes(match[0])) {
          matchedKeywords.push(match[0]);
        }
      }
    }
  }

  return {
    isEmergency: matchedKeywords.length > 0,
    matchedKeywords: [...new Set(matchedKeywords)],
    detectedLanguage: language,
  };
}
