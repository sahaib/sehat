/**
 * Voice filler — generates a SHORT contextual acknowledgment to play
 * immediately after STT while Claude Opus thinks. Fills the 2-8s silence
 * gap so voice mode feels responsive and warm.
 *
 * No API call — pure template + keyword matching for instant generation.
 */

import { Language } from '@/types';

// ─── Symptom keywords → context key ───────────────
interface SymptomMatcher {
  keywords: string[]; // multilingual keyword fragments
  context: string;    // internal key
}

const SYMPTOM_MATCHERS: SymptomMatcher[] = [
  {
    context: 'head',
    keywords: [
      'head', 'sir', 'सिर', 'माथ', 'தலை', 'తల', 'डोक', 'ತಲೆ', 'মাথা',
      'migraine', 'माइग्रेन',
    ],
  },
  {
    context: 'fever',
    keywords: [
      'fever', 'bukhar', 'बुखार', 'ज्वर', 'காய்ச்சல்', 'జ్వరం', 'ताप', 'ಜ್ವರ', 'জ্বর',
      'temperature', 'tapman',
    ],
  },
  {
    context: 'chest',
    keywords: [
      'chest', 'seena', 'सीन', 'छाती', 'நெஞ்சு', 'ఛాతీ', 'छातीत', 'ಎದೆ', 'বুক',
      'heart', 'dil', 'दिल',
    ],
  },
  {
    context: 'stomach',
    keywords: [
      'stomach', 'pet', 'पेट', 'வயிறு', 'కడుపు', 'पोट', 'ಹೊಟ್ಟೆ', 'পেট',
      'abdom', 'ulti', 'उलटी', 'vomit', 'nausea', 'diarr', 'dast', 'दस्त',
    ],
  },
  {
    context: 'breathing',
    keywords: [
      'breath', 'saans', 'सांस', 'श्वास', 'மூச்சு', 'ఊపిరి', 'श्वसन', 'ಉಸಿರು', 'শ্বাস',
      'cough', 'khansi', 'खांसी', 'இருமல்',
    ],
  },
  {
    context: 'pain',
    keywords: [
      'pain', 'dard', 'दर्द', 'வலி', 'నొప్పి', 'दुखत', 'ನೋವು', 'ব্যথা',
      'hurt', 'ache', 'takleef', 'तकलीफ',
    ],
  },
  {
    context: 'child',
    keywords: [
      'child', 'baby', 'bachcha', 'बच्चा', 'குழந்தை', 'పిల్ల', 'मूल', '���ಡ', 'শিশু',
      'infant', 'toddler',
    ],
  },
];

// ─── Multilingual acknowledgment templates ────────
// Each template set has: specific (keyed by symptom context) + generic fallback.
// Templates should be SHORT (1-2 sentences, ~3 seconds of speech).

type Templates = Record<string, string> & { generic: string };

const ACKNOWLEDGMENTS: Record<Language, Templates> = {
  en: {
    generic: "I'm listening. Let me assess your symptoms.",
    head: "I hear you're having head pain. Let me look into this.",
    fever: "You mentioned fever. Let me evaluate this for you.",
    chest: "You're describing chest symptoms. Let me assess this right away.",
    stomach: "I understand you have stomach trouble. Let me check this.",
    breathing: "You mentioned breathing issues. Let me assess this carefully.",
    pain: "I hear you're in pain. Let me evaluate your symptoms.",
    child: "I understand this is about a child. Let me assess carefully.",
  },
  hi: {
    generic: "मैं सुन रहा हूँ। आपके लक्षणों को देखता हूँ।",
    head: "आपके सिर में दर्द हो रहा है। मैं इसे देखता हूँ।",
    fever: "आपको बुखार है। मैं इसका मूल्यांकन करता हूँ।",
    chest: "आपकी छाती में तकलीफ है। मैं तुरंत देखता हूँ।",
    stomach: "आपके पेट में तकलीफ है। मैं इसे देखता हूँ।",
    breathing: "आपको सांस की तकलीफ है। मैं ध्यान से देखता हूँ।",
    pain: "आपको दर्द हो रहा है। मैं आपके लक्षण देखता हूँ।",
    child: "बच्चे की बात है। मैं ध्यान से देखता हूँ।",
  },
  ta: {
    generic: "நான் கேட்கிறேன். உங்கள் அறிகுறிகளை மதிப்பிடுகிறேன்.",
    head: "உங்கள் தலைவலி பற்றி புரிகிறது. நான் பார்க்கிறேன்.",
    fever: "உங்களுக்கு காய்ச்சல் இருக்கிறது. நான் மதிப்பிடுகிறேன்.",
    chest: "உங்கள் நெஞ்சு வலி பற்றி புரிகிறது. உடனே பார்க்கிறேன்.",
    stomach: "வயிற்று பிரச்சனை பற்றி புரிகிறது. நான் பார்க்கிறேன்.",
    breathing: "மூச்சு பிரச்சனை பற்றி புரிகிறது. கவனமாக பார்க்கிறேன்.",
    pain: "உங்கள் வலி பற்றி புரிகிறது. அறிகுறிகளை மதிப்பிடுகிறேன்.",
    child: "குழந்தை பற்றிய விஷயம். கவனமாக பார்க்கிறேன்.",
  },
  te: {
    generic: "నేను వింటున్నాను. మీ లక్షణాలను అంచనా వేస్తాను.",
    head: "మీ తలనొప్పి గురించి అర్థమైంది. నేను చూస్తాను.",
    fever: "మీకు జ్వరం ఉంది. నేను అంచనా వేస్తాను.",
    chest: "మీ ఛాతీ లక్షణాల గురించి అర్థమైంది. వెంటనే చూస్తాను.",
    stomach: "కడుపు సమస్య గురించి అర్థమైంది. నేను చూస్తాను.",
    breathing: "ఊపిరి సమస్య గురించి అర్థమైంది. జాగ్రత్తగా చూస్తాను.",
    pain: "మీ నొప్పి గురించి అర్థమైంది. లక్షణాలను అంచనా వేస్తాను.",
    child: "పిల్లల విషయం. జాగ్రత్తగా చూస్తాను.",
  },
  mr: {
    generic: "मी ऐकतो आहे. तुमच्या लक्षणांचे मूल्यांकन करतो.",
    head: "तुमच्या डोक्यात दुखतंय. मी बघतो.",
    fever: "तुम्हाला ताप आहे. मी मूल्यांकन करतो.",
    chest: "छातीत त्रास होतोय. मी लगेच बघतो.",
    stomach: "पोटात त्रास होतोय. मी बघतो.",
    breathing: "श्वासाचा त्रास होतोय. मी काळजीपूर्वक बघतो.",
    pain: "तुम्हाला दुखतंय. मी लक्षणे बघतो.",
    child: "मुलांबद्दल आहे. मी काळजीपूर्वक बघतो.",
  },
  kn: {
    generic: "ನಾನು ಕೇಳುತ್ತಿದ್ದೇನೆ. ನಿಮ್ಮ ರೋಗಲಕ್ಷಣಗಳನ್ನು ನೋಡುತ್ತೇನೆ.",
    head: "ನಿಮ್ಮ ತಲೆನೋವು ಬಗ್ಗೆ ಅರ್ಥವಾಯಿತು. ನಾನು ನೋಡುತ್ತೇನೆ.",
    fever: "ನಿಮಗೆ ಜ್ವರ ಇದೆ. ನಾನು ಮೌಲ್ಯಮಾಪನ ಮಾಡುತ್ತೇನೆ.",
    chest: "ಎದೆ ಲಕ್ಷಣಗಳ ಬಗ್ಗೆ ಅರ್ಥವಾಯಿತು. ತಕ್ಷಣ ನೋಡುತ್ತೇನೆ.",
    stomach: "ಹೊಟ್ಟೆ ತೊಂದರೆ ಬಗ್ಗೆ ಅರ್ಥವಾಯಿತು. ನಾನು ನೋಡುತ್ತೇನೆ.",
    breathing: "ಉಸಿರಾಟ ತೊಂದರೆ ಬಗ್ಗೆ ಅರ್ಥವಾಯಿತು. ಎಚ್ಚರಿಕೆಯಿಂದ ನೋಡುತ್ತೇನೆ.",
    pain: "ನಿಮ್ಮ ನೋವು ಬಗ್ಗೆ ಅರ್ಥವಾಯಿತು. ಲಕ್ಷಣಗಳನ್ನು ನೋಡುತ್ತೇನೆ.",
    child: "ಮಗುವಿನ ವಿಷಯ. ಎಚ್ಚರಿಕೆಯಿಂದ ನೋಡುತ್ತೇನೆ.",
  },
  bn: {
    generic: "আমি শুনছি। আপনার উপসর্গগুলি দেখছি।",
    head: "আপনার মাথাব্যথা বুঝতে পারছি। আমি দেখছি।",
    fever: "আপনার জ্বর আছে। আমি মূল্যায়ন করছি।",
    chest: "বুকের উপসর্গ বুঝতে পারছি। এখনই দেখছি।",
    stomach: "পেটের সমস্যা বুঝতে পারছি। আমি দেখছি।",
    breathing: "শ্বাসকষ্টের কথা বুঝতে পারছি। সতর্কভাবে দেখছি।",
    pain: "আপনার ব্যথা বুঝতে পারছি। উপসর্গগুলি দেখছি।",
    child: "শিশুর বিষয়। সতর্কভাবে দেখছি।",
  },
};

// ─── Public API ───────────────────────────────────

/**
 * Generate a short contextual acknowledgment from the user's transcript.
 * Returns a natural-sounding filler like "I hear your head is hurting. Let me assess..."
 * Runs in <1ms — no API call, pure keyword matching.
 */
export function generateAcknowledgment(transcript: string, language: Language): string {
  const lower = transcript.toLowerCase();

  // Find the first matching symptom context
  for (const matcher of SYMPTOM_MATCHERS) {
    for (const kw of matcher.keywords) {
      if (lower.includes(kw)) {
        return ACKNOWLEDGMENTS[language]?.[matcher.context]
            || ACKNOWLEDGMENTS.en[matcher.context]
            || ACKNOWLEDGMENTS[language]?.generic
            || ACKNOWLEDGMENTS.en.generic;
      }
    }
  }

  // No specific symptom detected — use generic
  return ACKNOWLEDGMENTS[language]?.generic || ACKNOWLEDGMENTS.en.generic;
}
