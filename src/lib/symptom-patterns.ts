/**
 * Pre-triage symptom pattern matcher — detects common health complaints
 * and returns an instant follow-up question WITHOUT calling Claude.
 *
 * This is the second fast-path layer (after emergency detection):
 *   Emergency detector → Symptom pattern matcher → Claude triage
 *
 * Based on research from POSEIDON study (204,912 patients), ICPC-3 OPD study,
 * and common tier 2/3 Indian health patterns.
 */

import { Language, FollowUpOption } from '@/types';

export interface SymptomPattern {
  id: string;
  /** Multilingual trigger keywords (lowercase). Any match activates this pattern. */
  triggers: Partial<Record<Language, string[]>>;
  /** Regex patterns for more flexible matching */
  patterns?: Partial<Record<Language, RegExp[]>>;
  /** The instant follow-up question to ask (skips Claude) */
  followUp: Record<Language, string>;
  /** Quick-answer options for the follow-up */
  options: Record<Language, FollowUpOption[]>;
  /** Months where this pattern is more likely (boosts priority) */
  seasonalMonths?: number[];
}

export interface PatternMatch {
  patternId: string;
  followUpQuestion: string;
  followUpOptions: FollowUpOption[];
}

// ─── Pattern Definitions ─────────────────────────────────────────

const SYMPTOM_PATTERNS: SymptomPattern[] = [
  // ── 1. FEVER (35.5% of OPD visits — #1 complaint) ──
  {
    id: 'fever',
    triggers: {
      en: ['fever', 'temperature', 'high temperature', 'feeling hot', 'chills', 'shivering'],
      hi: ['बुखार', 'बुखर', 'तापमान', 'बदन गरम', 'ठंड लग रही', 'कंपकंपी', 'ज्वर', 'tez bukhar', 'bukhar'],
      ta: ['காய்ச்சல்', 'ஜுரம்', 'உடல் சூடு'],
      te: ['జ్వరం', 'జొరం', 'ఒళ్ళు వేడి'],
      mr: ['ताप', 'बुखार', 'अंग गरम', 'थंडी वाजणे'],
      kn: ['ಜ್ವರ', 'ಮೈ ಬಿಸಿ', 'ಚಳಿ ಜ್ವರ'],
      bn: ['জ্বর', 'শরীর গরম', 'কাঁপুনি'],
    },
    followUp: {
      en: 'How many days have you had this fever?',
      hi: 'कितने दिन से बुखार है?',
      ta: 'எத்தனை நாட்களாக காய்ச்சல் இருக்கிறது?',
      te: 'ఎన్ని రోజులుగా జ్వరం ఉంది?',
      mr: 'किती दिवसांपासून ताप आहे?',
      kn: 'ಎಷ್ಟು ದಿನಗಳಿಂದ ಜ್ವರ ಇದೆ?',
      bn: 'কতদিন ধরে জ্বর আছে?',
    },
    options: {
      en: [
        { label: 'Since today', value: 'Fever started today' },
        { label: '1-2 days', value: 'Fever for 1-2 days' },
        { label: '3-5 days', value: 'Fever for 3-5 days' },
        { label: 'More than 5 days', value: 'Fever for more than 5 days' },
      ],
      hi: [
        { label: 'आज से', value: 'बुखार आज से है' },
        { label: '1-2 दिन', value: '1-2 दिन से बुखार है' },
        { label: '3-5 दिन', value: '3-5 दिन से बुखार है' },
        { label: '5 दिन से ज़्यादा', value: '5 दिन से ज़्यादा बुखार है' },
      ],
      ta: [
        { label: 'இன்று முதல்', value: 'இன்று முதல் காய்ச்சல்' },
        { label: '1-2 நாட்கள்', value: '1-2 நாட்களாக காய்ச்சல்' },
        { label: '3-5 நாட்கள்', value: '3-5 நாட்களாக காய்ச்சல்' },
        { label: '5 நாட்களுக்கு மேல்', value: '5 நாட்களுக்கு மேல் காய்ச்சல்' },
      ],
      te: [
        { label: 'ఈ రోజు నుండి', value: 'ఈ రోజు నుండి జ్వరం' },
        { label: '1-2 రోజులు', value: '1-2 రోజులుగా జ్వరం' },
        { label: '3-5 రోజులు', value: '3-5 రోజులుగా జ్వరం' },
        { label: '5 రోజులకు పైగా', value: '5 రోజులకు పైగా జ్వరం' },
      ],
      mr: [
        { label: 'आजपासून', value: 'आजपासून ताप आहे' },
        { label: '1-2 दिवस', value: '1-2 दिवसांपासून ताप' },
        { label: '3-5 दिवस', value: '3-5 दिवसांपासून ताप' },
        { label: '5 दिवसांपेक्षा जास्त', value: '5 दिवसांपेक्षा जास्त ताप' },
      ],
      kn: [
        { label: 'ಇಂದಿನಿಂದ', value: 'ಇಂದಿನಿಂದ ಜ್ವರ' },
        { label: '1-2 ದಿನ', value: '1-2 ದಿನಗಳಿಂದ ಜ್ವರ' },
        { label: '3-5 ದಿನ', value: '3-5 ದಿನಗಳಿಂದ ಜ್ವರ' },
        { label: '5 ದಿನಕ್ಕಿಂತ ಹೆಚ್ಚು', value: '5 ದಿನಕ್ಕಿಂತ ಹೆಚ್ಚು ಜ್ವರ' },
      ],
      bn: [
        { label: 'আজ থেকে', value: 'আজ থেকে জ্বর' },
        { label: '১-২ দিন', value: '১-২ দিন ধরে জ্বর' },
        { label: '৩-৫ দিন', value: '৩-৫ দিন ধরে জ্বর' },
        { label: '৫ দিনের বেশি', value: '৫ দিনের বেশি জ্বর' },
      ],
    },
    seasonalMonths: [7, 8, 9, 10, 11, 12, 1, 2],
  },

  // ── 2. HEADACHE (19.5% of OPD visits) ──
  {
    id: 'headache',
    triggers: {
      en: ['headache', 'head pain', 'head ache', 'migraine', 'head is pounding'],
      hi: ['सिर दर्द', 'सर दर्द', 'सिर में दर्द', 'माइग्रेन', 'sar dard', 'sir dard'],
      ta: ['தலைவலி', 'தலை வலி'],
      te: ['తలనొప్పి', 'తల నొప్పి'],
      mr: ['डोकेदुखी', 'डोके दुखतंय', 'डोक्यात दुखतंय'],
      kn: ['ತಲೆನೋವು', 'ತಲೆ ನೋವು'],
      bn: ['মাথাব্যথা', 'মাথা ব্যথা', 'মাথা ধরেছে'],
    },
    followUp: {
      en: 'Is this the worst headache you\'ve ever had, or does it feel like your usual headaches?',
      hi: 'क्या यह अब तक का सबसे तेज़ सिर दर्द है, या पहले भी ऐसा होता रहा है?',
      ta: 'இது உங்களுக்கு இதுவரை வந்ததிலேயே மிக மோசமான தலைவலியா, அல்லது வழக்கமானதா?',
      te: 'ఇది మీకు ఇప్పటివరకు వచ్చిన అత్యంత తీవ్రమైన తలనొప్పా, లేక మామూలుగా వచ్చేదా?',
      mr: 'हे आतापर्यंतचे सर्वात तीव्र डोकेदुखी आहे, की नेहमीसारखे आहे?',
      kn: 'ಇದು ನಿಮಗೆ ಈವರೆಗೆ ಬಂದ ಅತ್ಯಂತ ತೀವ್ರ ತಲೆನೋವಾ, ಅಥವಾ ಯಾವಾಗಲೂ ಬರುವ ತರಹ ಇದೆಯಾ?',
      bn: 'এটা কি আপনার জীবনের সবচেয়ে খারাপ মাথাব্যথা, না সাধারণত যেরকম হয়?',
    },
    options: {
      en: [
        { label: 'Worst ever', value: 'This is the worst headache I have ever had, sudden and severe' },
        { label: 'Usual type', value: 'This feels like my usual headaches' },
        { label: 'With fever', value: 'I have a headache along with fever' },
        { label: 'Not sure', value: 'I am not sure how to compare it' },
      ],
      hi: [
        { label: 'सबसे तेज़', value: 'यह अब तक का सबसे तेज़ और अचानक सिर दर्द है' },
        { label: 'पहले जैसा', value: 'यह पहले भी होता रहा है, वैसा ही है' },
        { label: 'बुखार भी है', value: 'सिर दर्द के साथ बुखार भी है' },
        { label: 'पता नहीं', value: 'मुझे पक्का नहीं पता' },
      ],
      ta: [
        { label: 'மிக மோசமான', value: 'இது இதுவரை வந்ததிலேயே மிக மோசமான திடீர் தலைவலி' },
        { label: 'வழக்கமானது', value: 'வழக்கமாக வரும் தலைவலி போல் இருக்கிறது' },
        { label: 'காய்ச்சலுடன்', value: 'தலைவலியுடன் காய்ச்சலும் இருக்கிறது' },
        { label: 'தெரியாது', value: 'எனக்கு உறுதியாக தெரியவில்லை' },
      ],
      te: [
        { label: 'అత్యంత తీవ్రం', value: 'ఇది ఇప్పటివరకు వచ్చిన అత్యంత తీవ్రమైన ఆకస్మిక తలనొప్పి' },
        { label: 'మామూలు', value: 'ఇది మామూలుగా వచ్చే తలనొప్పి లాగా ఉంది' },
        { label: 'జ్వరంతో', value: 'తలనొప్పితో పాటు జ్వరం కూడా ఉంది' },
        { label: 'తెలియదు', value: 'నాకు ఖచ్చితంగా తెలియదు' },
      ],
      mr: [
        { label: 'सर्वात तीव्र', value: 'हे आतापर्यंतचे सर्वात तीव्र अचानक डोकेदुखी आहे' },
        { label: 'नेहमीसारखे', value: 'नेहमी होते तसेच आहे' },
        { label: 'तापासह', value: 'डोकेदुखीसोबत ताप पण आहे' },
        { label: 'माहीत नाही', value: 'मला नक्की माहीत नाही' },
      ],
      kn: [
        { label: 'ಅತ್ಯಂತ ತೀವ್ರ', value: 'ಇದು ಈವರೆಗೆ ಬಂದ ಅತ್ಯಂತ ತೀವ್ರ ಹಠಾತ್ ತಲೆನೋವು' },
        { label: 'ಯಾವಾಗಲೂ ಬರುವ', value: 'ಯಾವಾಗಲೂ ಬರುವ ತಲೆನೋವಿನ ರೀತಿ ಇದೆ' },
        { label: 'ಜ್ವರದೊಂದಿಗೆ', value: 'ತಲೆನೋವಿನ ಜೊತೆಗೆ ಜ್ವರವೂ ಇದೆ' },
        { label: 'ಗೊತ್ತಿಲ್ಲ', value: 'ನನಗೆ ಖಚಿತವಾಗಿ ಗೊತ್ತಿಲ್ಲ' },
      ],
      bn: [
        { label: 'সবচেয়ে খারাপ', value: 'এটা আমার জীবনের সবচেয়ে খারাপ হঠাৎ মাথাব্যথা' },
        { label: 'স্বাভাবিক', value: 'আমার সাধারণত যেমন হয় তেমনই' },
        { label: 'জ্বরসহ', value: 'মাথাব্যথার সাথে জ্বরও আছে' },
        { label: 'জানি না', value: 'আমি নিশ্চিত নই' },
      ],
    },
  },

  // ── 3. COUGH (50.6% of respiratory visits) ──
  {
    id: 'cough',
    triggers: {
      en: ['cough', 'coughing', 'dry cough', 'wet cough', 'phlegm', 'mucus'],
      hi: ['खांसी', 'खांसि', 'कफ', 'बलगम', 'सूखी खांसी', 'khansi'],
      ta: ['இருமல்', 'சளி'],
      te: ['దగ్గు', 'కఫం'],
      mr: ['खोकला', 'कफ'],
      kn: ['ಕೆಮ್ಮು', 'ಕಫ'],
      bn: ['কাশি', 'কফ'],
    },
    followUp: {
      en: 'How long have you been coughing? Is there blood in the sputum?',
      hi: 'कितने दिन से खांसी है? क्या बलगम में खून आ रहा है?',
      ta: 'எத்தனை நாட்களாக இருமல் இருக்கிறது? சளியில் ரத்தம் வருகிறதா?',
      te: 'ఎన్ని రోజులుగా దగ్గు ఉంది? కఫంలో రక్తం వస్తుందా?',
      mr: 'किती दिवसांपासून खोकला आहे? कफात रक्त येतंय का?',
      kn: 'ಎಷ್ಟು ದಿನಗಳಿಂದ ಕೆಮ್ಮು ಇದೆ? ಕಫದಲ್ಲಿ ರಕ್ತ ಬರುತ್ತಿದೆಯಾ?',
      bn: 'কতদিন ধরে কাশি আছে? কফে রক্ত আসছে কি?',
    },
    options: {
      en: [
        { label: 'Few days, no blood', value: 'Cough for a few days, no blood in sputum' },
        { label: '1-2 weeks', value: 'Cough for 1-2 weeks' },
        { label: 'Over 2 weeks', value: 'Cough for more than 2 weeks' },
        { label: 'Blood in sputum', value: 'There is blood in my sputum when I cough' },
      ],
      hi: [
        { label: 'कुछ दिन, खून नहीं', value: 'कुछ दिन से खांसी है, बलगम में खून नहीं' },
        { label: '1-2 हफ्ते', value: '1-2 हफ्ते से खांसी है' },
        { label: '2 हफ्ते से ज़्यादा', value: '2 हफ्ते से ज़्यादा खांसी है' },
        { label: 'खून आ रहा', value: 'बलगम में खून आ रहा है' },
      ],
      ta: [
        { label: 'சில நாட்கள்', value: 'சில நாட்களாக இருமல், ரத்தம் இல்லை' },
        { label: '1-2 வாரங்கள்', value: '1-2 வாரங்களாக இருமல்' },
        { label: '2 வாரத்திற்கு மேல்', value: '2 வாரத்திற்கு மேல் இருமல்' },
        { label: 'ரத்தம் வருகிறது', value: 'சளியில் ரத்தம் வருகிறது' },
      ],
      te: [
        { label: 'కొన్ని రోజులు', value: 'కొన్ని రోజులుగా దగ్గు, రక్తం లేదు' },
        { label: '1-2 వారాలు', value: '1-2 వారాలుగా దగ్గు' },
        { label: '2 వారాలకు పైగా', value: '2 వారాలకు పైగా దగ్గు' },
        { label: 'రక్తం వస్తుంది', value: 'కఫంలో రక్తం వస్తుంది' },
      ],
      mr: [
        { label: 'काही दिवस', value: 'काही दिवसांपासून खोकला, रक्त नाही' },
        { label: '1-2 आठवडे', value: '1-2 आठवड्यांपासून खोकला' },
        { label: '2 आठवड्यांपेक्षा जास्त', value: '2 आठवड्यांपेक्षा जास्त खोकला' },
        { label: 'रक्त येतंय', value: 'कफात रक्त येतंय' },
      ],
      kn: [
        { label: 'ಕೆಲವು ದಿನ', value: 'ಕೆಲವು ದಿನಗಳಿಂದ ಕೆಮ್ಮು, ರಕ್ತ ಇಲ್ಲ' },
        { label: '1-2 ವಾರ', value: '1-2 ವಾರಗಳಿಂದ ಕೆಮ್ಮು' },
        { label: '2 ವಾರಕ್ಕಿಂತ ಹೆಚ್ಚು', value: '2 ವಾರಕ್ಕಿಂತ ಹೆಚ್ಚು ಕೆಮ್ಮು' },
        { label: 'ರಕ್ತ ಬರುತ್ತಿದೆ', value: 'ಕಫದಲ್ಲಿ ರಕ್ತ ಬರುತ್ತಿದೆ' },
      ],
      bn: [
        { label: 'কয়েকদিন', value: 'কয়েকদিন ধরে কাশি, রক্ত নেই' },
        { label: '১-২ সপ্তাহ', value: '১-২ সপ্তাহ ধরে কাশি' },
        { label: '২ সপ্তাহের বেশি', value: '২ সপ্তাহের বেশি কাশি' },
        { label: 'রক্ত আসছে', value: 'কফে রক্ত আসছে' },
      ],
    },
  },

  // ── 4. STOMACH / ABDOMINAL PAIN (25% of digestive visits) ──
  {
    id: 'stomach_pain',
    triggers: {
      en: ['stomach pain', 'abdominal pain', 'belly pain', 'tummy ache', 'stomach ache'],
      hi: ['पेट दर्द', 'पेट में दर्द', 'pet dard', 'पेट में मरोड़'],
      ta: ['வயிற்று வலி', 'வயிறு வலி'],
      te: ['కడుపు నొప్పి', 'పొట్ట నొప్పి'],
      mr: ['पोटदुखी', 'पोट दुखतंय', 'पोटात दुखतंय'],
      kn: ['ಹೊಟ್ಟೆ ನೋವು', 'ಹೊಟ್ಟೆನೋವು'],
      bn: ['পেটে ব্যথা', 'পেট ব্যথা'],
    },
    followUp: {
      en: 'Where exactly is the pain — upper, lower, left side, or right side?',
      hi: 'दर्द कहाँ है — ऊपर, नीचे, बाएं तरफ, या दाएं तरफ?',
      ta: 'வலி எங்கே — மேலே, கீழே, இடது பக்கம், வலது பக்கம்?',
      te: 'నొప్పి ఎక్కడ ఉంది — పైన, కింద, ఎడమవైపు, కుడివైపు?',
      mr: 'दुखणे कुठे आहे — वर, खाली, डावीकडे, उजवीकडे?',
      kn: 'ನೋವು ಎಲ್ಲಿ ಇದೆ — ಮೇಲೆ, ಕೆಳಗೆ, ಎಡಭಾಗ, ಬಲಭಾಗ?',
      bn: 'ব্যথা কোথায় — উপরে, নিচে, বাম দিকে, ডান দিকে?',
    },
    options: {
      en: [
        { label: 'Upper middle', value: 'Pain in upper middle abdomen' },
        { label: 'Lower right', value: 'Pain in lower right side of abdomen' },
        { label: 'All over', value: 'Pain all over the abdomen' },
        { label: 'Not sure', value: 'I cannot pinpoint where the pain is' },
      ],
      hi: [
        { label: 'ऊपर बीच में', value: 'पेट के ऊपर बीच में दर्द' },
        { label: 'नीचे दाएं', value: 'पेट के नीचे दाएं तरफ दर्द' },
        { label: 'पूरे पेट में', value: 'पूरे पेट में दर्द' },
        { label: 'पता नहीं', value: 'मुझे ठीक से पता नहीं कहाँ दर्द है' },
      ],
      ta: [
        { label: 'மேல் நடுவில்', value: 'வயிற்றின் மேல் நடுவில் வலி' },
        { label: 'கீழ் வலது', value: 'வயிற்றின் கீழ் வலது பக்கம் வலி' },
        { label: 'எல்லா இடத்திலும்', value: 'முழு வயிறும் வலிக்கிறது' },
        { label: 'தெரியாது', value: 'எனக்கு எங்கே வலிக்கிறது என்று தெரியவில்லை' },
      ],
      te: [
        { label: 'పైన మధ్యలో', value: 'పొట్ట పైన మధ్యలో నొప్పి' },
        { label: 'కింద కుడివైపు', value: 'పొట్ట కింద కుడివైపు నొప్పి' },
        { label: 'అంతటా', value: 'పొట్ట అంతటా నొప్పి' },
        { label: 'తెలియదు', value: 'నాకు ఎక్కడ నొప్పి ఉందో తెలియదు' },
      ],
      mr: [
        { label: 'वर मध्यभागी', value: 'पोटाच्या वर मध्यभागी दुखतंय' },
        { label: 'खाली उजवीकडे', value: 'पोटाच्या खाली उजवीकडे दुखतंय' },
        { label: 'संपूर्ण पोटात', value: 'संपूर्ण पोटात दुखतंय' },
        { label: 'माहीत नाही', value: 'मला नक्की कुठे दुखतंय ते माहीत नाही' },
      ],
      kn: [
        { label: 'ಮೇಲೆ ಮಧ್ಯದಲ್ಲಿ', value: 'ಹೊಟ್ಟೆಯ ಮೇಲೆ ಮಧ್ಯದಲ್ಲಿ ನೋವು' },
        { label: 'ಕೆಳಗೆ ಬಲಭಾಗ', value: 'ಹೊಟ್ಟೆಯ ಕೆಳಗೆ ಬಲಭಾಗದಲ್ಲಿ ನೋವು' },
        { label: 'ಎಲ್ಲಾ ಕಡೆ', value: 'ಇಡೀ ಹೊಟ್ಟೆಯಲ್ಲಿ ನೋವು' },
        { label: 'ಗೊತ್ತಿಲ್ಲ', value: 'ನನಗೆ ಎಲ್ಲಿ ನೋವು ಇದೆ ಎಂದು ಗೊತ್ತಿಲ್ಲ' },
      ],
      bn: [
        { label: 'উপরে মাঝখানে', value: 'পেটের উপরে মাঝখানে ব্যথা' },
        { label: 'নিচে ডানদিকে', value: 'পেটের নিচে ডানদিকে ব্যথা' },
        { label: 'সব জায়গায়', value: 'পুরো পেটে ব্যথা' },
        { label: 'জানি না', value: 'আমি বুঝতে পারছি না ঠিক কোথায় ব্যথা' },
      ],
    },
  },

  // ── 5. DIARRHEA / LOOSE MOTIONS ──
  {
    id: 'diarrhea',
    triggers: {
      en: ['diarrhea', 'loose motions', 'loose stools', 'watery stool', 'running stomach'],
      hi: ['दस्त', 'पतले दस्त', 'लूज मोशन', 'पेट खराब', 'उल्टी दस्त', 'dast', 'loose motion'],
      ta: ['வயிற்றுப்போக்கு', 'கழிச்சல்'],
      te: ['విరేచనాలు', 'కడుపు పోతుంది'],
      mr: ['जुलाब', 'पातळ संडास'],
      kn: ['ಭೇದಿ', 'ಹೊಟ್ಟೆ ಕೆಟ್ಟಿದೆ'],
      bn: ['পাতলা পায়খানা', 'ডায়রিয়া'],
    },
    followUp: {
      en: 'How many times today? Is there blood or mucus in the stool?',
      hi: 'आज कितनी बार हुआ? क्या खून या म्यूकस आ रहा है?',
      ta: 'இன்று எத்தனை முறை? மலத்தில் ரத்தம் அல்லது சளி இருக்கிறதா?',
      te: 'ఈ రోజు ఎన్ని సార్లు? మలంలో రక్తం లేదా మ్యూకస్ ఉందా?',
      mr: 'आज किती वेळा झाले? रक्त किंवा श्लेष्मा येतंय का?',
      kn: 'ಇಂದು ಎಷ್ಟು ಬಾರಿ? ಮಲದಲ್ಲಿ ರಕ್ತ ಅಥವಾ ಲೋಳೆ ಇದೆಯಾ?',
      bn: 'আজ কতবার হয়েছে? পায়খানায় রক্ত বা শ্লেষ্মা আসছে কি?',
    },
    options: {
      en: [
        { label: '2-3 times', value: 'Loose motions 2-3 times today' },
        { label: '4-6 times', value: 'Loose motions 4-6 times today' },
        { label: 'More than 6', value: 'Loose motions more than 6 times today' },
        { label: 'Blood in stool', value: 'There is blood or mucus in the stool' },
      ],
      hi: [
        { label: '2-3 बार', value: 'आज 2-3 बार दस्त हुए' },
        { label: '4-6 बार', value: 'आज 4-6 बार दस्त हुए' },
        { label: '6 से ज़्यादा', value: 'आज 6 से ज़्यादा बार दस्त हुए' },
        { label: 'खून आ रहा', value: 'दस्त में खून या म्यूकस आ रहा है' },
      ],
      ta: [
        { label: '2-3 முறை', value: 'இன்று 2-3 முறை வயிற்றுப்போக்கு' },
        { label: '4-6 முறை', value: 'இன்று 4-6 முறை வயிற்றுப்போக்கு' },
        { label: '6 முறைக்கு மேல்', value: 'இன்று 6 முறைக்கு மேல் வயிற்றுப்போக்கு' },
        { label: 'ரத்தம் வருகிறது', value: 'மலத்தில் ரத்தம் அல்லது சளி வருகிறது' },
      ],
      te: [
        { label: '2-3 సార్లు', value: 'ఈ రోజు 2-3 సార్లు విరేచనాలు' },
        { label: '4-6 సార్లు', value: 'ఈ రోజు 4-6 సార్లు విరేచనాలు' },
        { label: '6 కంటే ఎక్కువ', value: 'ఈ రోజు 6 కంటే ఎక్కువ సార్లు విరేచనాలు' },
        { label: 'రక్తం వస్తుంది', value: 'మలంలో రక్తం లేదా మ్యూకస్ వస్తుంది' },
      ],
      mr: [
        { label: '2-3 वेळा', value: 'आज 2-3 वेळा जुलाब' },
        { label: '4-6 वेळा', value: 'आज 4-6 वेळा जुलाब' },
        { label: '6 पेक्षा जास्त', value: 'आज 6 पेक्षा जास्त वेळा जुलाब' },
        { label: 'रक्त येतंय', value: 'संडासात रक्त किंवा श्लेष्मा येतंय' },
      ],
      kn: [
        { label: '2-3 ಬಾರಿ', value: 'ಇಂದು 2-3 ಬಾರಿ ಭೇದಿ' },
        { label: '4-6 ಬಾರಿ', value: 'ಇಂದು 4-6 ಬಾರಿ ಭೇದಿ' },
        { label: '6 ಕ್ಕಿಂತ ಹೆಚ್ಚು', value: 'ಇಂದು 6 ಕ್ಕಿಂತ ಹೆಚ್ಚು ಬಾರಿ ಭೇದಿ' },
        { label: 'ರಕ್ತ ಬರುತ್ತಿದೆ', value: 'ಮಲದಲ್ಲಿ ರಕ್ತ ಅಥವಾ ಲೋಳೆ ಬರುತ್ತಿದೆ' },
      ],
      bn: [
        { label: '২-৩ বার', value: 'আজ ২-৩ বার পাতলা পায়খানা' },
        { label: '৪-৬ বার', value: 'আজ ৪-৬ বার পাতলা পায়খানা' },
        { label: '৬ বারের বেশি', value: 'আজ ৬ বারের বেশি পাতলা পায়খানা' },
        { label: 'রক্ত আসছে', value: 'পায়খানায় রক্ত বা শ্লেষ্মা আসছে' },
      ],
    },
    seasonalMonths: [6, 7, 8, 9],
  },

  // ── 6. PERIOD / MENSTRUAL ISSUES ──
  {
    id: 'period_issues',
    triggers: {
      en: ['period', 'periods', 'menstrual', 'menstruation', 'irregular period', 'missed period', 'late period', 'pcod', 'pcos', 'heavy bleeding', 'period pain', 'cramps'],
      hi: ['पीरियड', 'पीरियड्स', 'माहवारी', 'मासिक धर्म', 'mc', 'एमसी', 'period late', 'pcod', 'pcos'],
      ta: ['மாதவிடாய்', 'பீரியட்', 'மாசக்கட்டு'],
      te: ['నెలసరి', 'పీరియడ్', 'రుతుస్రావం'],
      mr: ['मासिक पाळी', 'पाळी', 'पीरियड'],
      kn: ['ಮುಟ್ಟು', 'ಪೀರಿಯಡ್', 'ಮಾಸಿಕ', 'ಋತುಸ್ರಾವ', 'pcod', 'pcos'],
      bn: ['পিরিয়ড', 'ঋতুস্রাব', 'মাসিক'],
    },
    followUp: {
      en: 'How many days has your period been delayed? Have you gained weight or noticed excess facial hair or acne?',
      hi: 'पीरियड कितने दिन लेट है? क्या वज़न बढ़ा है या चेहरे पर बाल या पिंपल आ रहे हैं?',
      ta: 'எத்தனை நாட்கள் மாதவிடாய் தாமதமாகியுள்ளது? எடை அதிகரித்ததா அல்லது முகத்தில் முடி அல்லது பருக்கள் வந்துள்ளதா?',
      te: 'నెలసరి ఎన్ని రోజులు ఆలస్యమైంది? బరువు పెరిగిందా లేదా ముఖంపై వెంట్రుకలు లేదా మొటిమలు వచ్చాయా?',
      mr: 'पाळी किती दिवस उशीरा आली? वजन वाढलं का किंवा चेहऱ्यावर केस किंवा पिंपल येतायत का?',
      kn: 'ಮುಟ್ಟು ಎಷ್ಟು ದಿನ ತಡವಾಗಿದೆ? ತೂಕ ಹೆಚ್ಚಾಗಿದೆಯಾ ಅಥವಾ ಮುಖದಲ್ಲಿ ಕೂದಲು ಅಥವಾ ಮೊಡವೆ ಬಂದಿದೆಯಾ?',
      bn: 'পিরিয়ড কতদিন দেরি হয়েছে? ওজন বেড়েছে কি বা মুখে অতিরিক্ত লোম বা ব্রণ হচ্ছে কি?',
    },
    options: {
      en: [
        { label: 'Few days late', value: 'Period is a few days late' },
        { label: 'Over 2 weeks late', value: 'Period is more than 2 weeks late' },
        { label: 'Irregular + weight gain', value: 'Periods are irregular and I have gained weight' },
        { label: 'Heavy/painful', value: 'My periods are very heavy and painful' },
      ],
      hi: [
        { label: 'कुछ दिन लेट', value: 'पीरियड कुछ दिन लेट है' },
        { label: '2 हफ्ते से ज़्यादा', value: 'पीरियड 2 हफ्ते से ज़्यादा लेट है' },
        { label: 'अनियमित + वज़न', value: 'पीरियड अनियमित है और वज़न बढ़ रहा है' },
        { label: 'ज़्यादा/दर्द', value: 'पीरियड बहुत ज़्यादा और दर्द भरे हैं' },
      ],
      ta: [
        { label: 'சில நாட்கள் தாமதம்', value: 'மாதவிடாய் சில நாட்கள் தாமதம்' },
        { label: '2 வாரத்திற்கு மேல்', value: 'மாதவிடாய் 2 வாரத்திற்கு மேல் தாமதம்' },
        { label: 'ஒழுங்கற்ற + எடை', value: 'மாதவிடாய் ஒழுங்கற்ற, எடை அதிகரித்துள்ளது' },
        { label: 'அதிக/வலி', value: 'மாதவிடாய் மிகவும் அதிகமாகவும் வலியுடனும் இருக்கிறது' },
      ],
      te: [
        { label: 'కొన్ని రోజులు ఆలస్యం', value: 'నెలసరి కొన్ని రోజులు ఆలస్యం' },
        { label: '2 వారాలకు పైగా', value: 'నెలసరి 2 వారాలకు పైగా ఆలస్యం' },
        { label: 'అక్రమం + బరువు', value: 'నెలసరి అక్రమంగా ఉంది మరియు బరువు పెరిగింది' },
        { label: 'ఎక్కువ/నొప్పి', value: 'నెలసరి చాలా ఎక్కువగా మరియు నొప్పిగా ఉంది' },
      ],
      mr: [
        { label: 'काही दिवस उशीर', value: 'पाळी काही दिवस उशीरा आली' },
        { label: '2 आठवड्यांपेक्षा जास्त', value: 'पाळी 2 आठवड्यांपेक्षा जास्त उशीरा' },
        { label: 'अनियमित + वजन', value: 'पाळी अनियमित आहे आणि वजन वाढलं' },
        { label: 'जास्त/वेदना', value: 'पाळी खूप जास्त आणि वेदनादायक आहे' },
      ],
      kn: [
        { label: 'ಕೆಲವು ದಿನ ತಡ', value: 'ಮುಟ್ಟು ಕೆಲವು ದಿನ ತಡವಾಗಿದೆ' },
        { label: '2 ವಾರಕ್ಕಿಂತ ಹೆಚ್ಚು', value: 'ಮುಟ್ಟು 2 ವಾರಕ್ಕಿಂತ ಹೆಚ್ಚು ತಡವಾಗಿದೆ' },
        { label: 'ಅನಿಯಮಿತ + ತೂಕ', value: 'ಮುಟ್ಟು ಅನಿಯಮಿತ ಮತ್ತು ತೂಕ ಹೆಚ್ಚಾಗಿದೆ' },
        { label: 'ಹೆಚ್ಚು/ನೋವು', value: 'ಮುಟ್ಟು ತುಂಬಾ ಹೆಚ್ಚಾಗಿದೆ ಮತ್ತು ನೋವು ಇದೆ' },
      ],
      bn: [
        { label: 'কয়েকদিন দেরি', value: 'পিরিয়ড কয়েকদিন দেরি হয়েছে' },
        { label: '২ সপ্তাহের বেশি', value: 'পিরিয়ড ২ সপ্তাহের বেশি দেরি' },
        { label: 'অনিয়মিত + ওজন', value: 'পিরিয়ড অনিয়মিত এবং ওজন বেড়েছে' },
        { label: 'বেশি/ব্যথা', value: 'পিরিয়ড খুব বেশি এবং ব্যথাযুক্ত' },
      ],
    },
  },

  // ── 7. BODY ACHE / WEAKNESS ──
  {
    id: 'body_ache',
    triggers: {
      en: ['body ache', 'body pain', 'weakness', 'fatigue', 'tired', 'exhausted', 'joint pain'],
      hi: ['बदन दर्द', 'शरीर दर्द', 'कमज़ोरी', 'थकान', 'जोड़ों में दर्द', 'हड्डी दर्द', 'badan dard'],
      ta: ['உடல் வலி', 'மூட்டு வலி', 'சோர்வு', 'களைப்பு'],
      te: ['ఒళ్ళు నొప్పి', 'కీళ్ల నొప్పి', 'అలసట', 'బలహీనత'],
      mr: ['अंगदुखी', 'सांधेदुखी', 'थकवा', 'अशक्तपणा'],
      kn: ['ಮೈ ನೋವು', 'ಕೀಲು ನೋವು', 'ಆಯಾಸ', 'ದಣಿವು'],
      bn: ['শরীর ব্যথা', 'গাঁটে ব্যথা', 'দুর্বলতা', 'ক্লান্তি'],
    },
    followUp: {
      en: 'Do you also have fever? Is the pain in your joints or all over?',
      hi: 'क्या बुखार भी है? दर्द जोड़ों में है या पूरे शरीर में?',
      ta: 'காய்ச்சலும் இருக்கிறதா? வலி மூட்டுகளில் உள்ளதா அல்லது முழு உடலிலும் உள்ளதா?',
      te: 'జ్వరం కూడా ఉందా? నొప్పి కీళ్లలో ఉందా లేదా ఒళ్ళంతా ఉందా?',
      mr: 'ताप पण आहे का? दुखणे सांध्यात आहे की संपूर्ण शरीरात?',
      kn: 'ಜ್ವರವೂ ಇದೆಯಾ? ನೋವು ಕೀಲುಗಳಲ್ಲಿ ಇದೆಯಾ ಅಥವಾ ಇಡೀ ಮೈಯಲ್ಲಿ?',
      bn: 'জ্বরও আছে কি? ব্যথা গাঁটে নাকি সারা শরীরে?',
    },
    options: {
      en: [
        { label: 'Fever + body ache', value: 'I have fever along with body ache all over' },
        { label: 'Joint pain only', value: 'Pain is mainly in my joints, no fever' },
        { label: 'Weakness/tired', value: 'I feel very weak and tired, no specific pain' },
        { label: 'After exercise', value: 'Body ache started after physical activity or exercise' },
      ],
      hi: [
        { label: 'बुखार + दर्द', value: 'बुखार के साथ पूरे बदन में दर्द है' },
        { label: 'सिर्फ जोड़ों में', value: 'दर्द सिर्फ जोड़ों में है, बुखार नहीं' },
        { label: 'कमज़ोरी/थकान', value: 'बहुत कमज़ोरी और थकान है, दर्द नहीं' },
        { label: 'एक्सरसाइज के बाद', value: 'शारीरिक गतिविधि के बाद दर्द हुआ' },
      ],
      ta: [
        { label: 'காய்ச்சல் + வலி', value: 'காய்ச்சலுடன் உடல் முழுவதும் வலி' },
        { label: 'மூட்டு வலி மட்டும்', value: 'மூட்டுகளில் மட்டும் வலி, காய்ச்சல் இல்லை' },
        { label: 'சோர்வு/களைப்பு', value: 'மிகவும் சோர்வாகவும் களைப்பாகவும் உள்ளது' },
        { label: 'உடற்பயிற்சிக்குப் பிறகு', value: 'உடற்பயிற்சிக்குப் பிறகு வலி தொடங்கியது' },
      ],
      te: [
        { label: 'జ్వరం + నొప్పి', value: 'జ్వరంతో పాటు ఒళ్ళంతా నొప్పి' },
        { label: 'కీళ్ల నొప్పి మాత్రమే', value: 'కీళ్లలో మాత్రమే నొప్పి, జ్వరం లేదు' },
        { label: 'బలహీనత/అలసట', value: 'చాలా బలహీనంగా మరియు అలసటగా ఉంది' },
        { label: 'వ్యాయామం తర్వాత', value: 'శారీరక శ్రమ తర్వాత నొప్పి మొదలైంది' },
      ],
      mr: [
        { label: 'ताप + दुखणे', value: 'तापासोबत संपूर्ण शरीरात दुखतंय' },
        { label: 'फक्त सांधे', value: 'फक्त सांध्यात दुखतंय, ताप नाही' },
        { label: 'अशक्तपणा/थकवा', value: 'खूप अशक्तपणा आणि थकवा आहे' },
        { label: 'व्यायामानंतर', value: 'शारीरिक मेहनतीनंतर दुखायला लागलं' },
      ],
      kn: [
        { label: 'ಜ್ವರ + ನೋವು', value: 'ಜ್ವರದೊಂದಿಗೆ ಇಡೀ ಮೈಯಲ್ಲಿ ನೋವು' },
        { label: 'ಕೀಲು ನೋವು ಮಾತ್ರ', value: 'ಕೀಲುಗಳಲ್ಲಿ ಮಾತ್ರ ನೋವು, ಜ್ವರ ಇಲ್ಲ' },
        { label: 'ದಣಿವು/ಆಯಾಸ', value: 'ತುಂಬಾ ದಣಿವಾಗಿದೆ ಮತ್ತು ಆಯಾಸವಾಗಿದೆ' },
        { label: 'ವ್ಯಾಯಾಮದ ನಂತರ', value: 'ದೈಹಿಕ ಚಟುವಟಿಕೆಯ ನಂತರ ನೋವು ಶುರುವಾಯಿತು' },
      ],
      bn: [
        { label: 'জ্বর + ব্যথা', value: 'জ্বরের সাথে সারা শরীরে ব্যথা' },
        { label: 'শুধু গাঁটে', value: 'শুধু গাঁটে ব্যথা, জ্বর নেই' },
        { label: 'দুর্বলতা/ক্লান্তি', value: 'খুব দুর্বল এবং ক্লান্ত লাগছে' },
        { label: 'ব্যায়ামের পরে', value: 'শারীরিক পরিশ্রমের পরে ব্যথা শুরু হয়েছে' },
      ],
    },
    seasonalMonths: [7, 8, 9, 10],
  },

  // ── 8. BREATHING DIFFICULTY ──
  {
    id: 'breathing',
    triggers: {
      en: ['breathing problem', 'breathless', 'shortness of breath', 'difficulty breathing', 'breathing issue', 'wheezing', 'asthma'],
      hi: ['सांस की तकलीफ', 'सांस फूलना', 'दम घुटना', 'अस्थमा', 'सांस में दिक्कत', 'sans', 'dum'],
      ta: ['மூச்சு திணறல்', 'மூச்சு விடுவது கஷ்டம்', 'ஆஸ்துமா'],
      te: ['ఊపిరి ఆడటం లేదు', 'ఊపిరి తీసుకోవడం కష్టం', 'ఆస్తమా'],
      mr: ['श्वास घेणे कठीण', 'दम लागतो', 'अस्थमा'],
      kn: ['ಉಸಿರಾಟ ಕಷ್ಟ', 'ಉಸಿರು ಬರುತ್ತಿಲ್ಲ', 'ಆಸ್ತಮಾ', 'ಏದುಸಿರು'],
      bn: ['শ্বাসকষ্ট', 'দম বন্ধ', 'হাঁপানি'],
    },
    followUp: {
      en: 'Does the breathlessness happen at rest or only during activity? Did it start suddenly?',
      hi: 'सांस की तकलीफ आराम में होती है या सिर्फ काम करते वक्त? क्या अचानक शुरू हुई?',
      ta: 'மூச்சு திணறல் ஓய்வில் வருகிறதா அல்லது செயல்பாட்டின் போது மட்டும்? திடீரென்று தொடங்கியதா?',
      te: 'ఊపిరి ఆడకపోవడం విశ్రాంతిలో ఉందా లేక పని చేసేటప్పుడు మాత్రమే? ఆకస్మికంగా మొదలైందా?',
      mr: 'श्वास घेणे कठीण आरामात होतं की फक्त काम करताना? अचानक सुरू झालं का?',
      kn: 'ಉಸಿರಾಟ ಕಷ್ಟ ವಿಶ್ರಾಂತಿಯಲ್ಲಿ ಆಗುತ್ತಾ ಅಥವಾ ಚಟುವಟಿಕೆ ಮಾಡುವಾಗ ಮಾತ್ರ? ಇದ್ದಕ್ಕಿದ್ದಂತೆ ಶುರುವಾಯಿತಾ?',
      bn: 'শ্বাসকষ্ট বিশ্রামে হয় নাকি শুধু কাজ করার সময়? হঠাৎ শুরু হয়েছে?',
    },
    options: {
      en: [
        { label: 'At rest', value: 'Breathlessness happens even at rest without any activity' },
        { label: 'During activity', value: 'Breathlessness only during physical activity like walking or climbing stairs' },
        { label: 'After exercise', value: 'Breathlessness after running or exercise, gets better with rest' },
        { label: 'Sudden onset', value: 'Breathing difficulty started suddenly out of nowhere' },
      ],
      hi: [
        { label: 'आराम में भी', value: 'बिना कुछ किए भी सांस की तकलीफ होती है' },
        { label: 'काम करते वक्त', value: 'सिर्फ चलने या सीढ़ी चढ़ने पर सांस फूलती है' },
        { label: 'एक्सरसाइज के बाद', value: 'दौड़ने या एक्सरसाइज के बाद सांस फूलती है, आराम करने पर ठीक हो जाती है' },
        { label: 'अचानक शुरू', value: 'सांस की तकलीफ अचानक शुरू हुई बिना किसी कारण' },
      ],
      ta: [
        { label: 'ஓய்வில்', value: 'எந்த செயல்பாடும் இல்லாமலே மூச்சு திணறல்' },
        { label: 'செயல்பாட்டின் போது', value: 'நடக்கும்போது அல்லது படி ஏறும்போது மட்டும்' },
        { label: 'உடற்பயிற்சிக்குப் பிறகு', value: 'ஓடிய பிறகு மூச்சு திணறல், ஓய்வில் சரியாகிறது' },
        { label: 'திடீரென்று', value: 'மூச்சு திணறல் திடீரென்று தொடங்கியது' },
      ],
      te: [
        { label: 'విశ్రాంతిలో', value: 'ఏమీ చేయకుండానే ఊపిరి ఆడటం లేదు' },
        { label: 'పని చేసేటప్పుడు', value: 'నడిచేటప్పుడు లేదా మెట్లు ఎక్కేటప్పుడు మాత్రమే' },
        { label: 'వ్యాయామం తర్వాత', value: 'పరుగెత్తిన తర్వాత ఊపిరి ఆడదు, విశ్రాంతి తీసుకుంటే బాగవుతుంది' },
        { label: 'ఆకస్మికంగా', value: 'ఊపిరి ఆడకపోవడం ఆకస్మికంగా మొదలైంది' },
      ],
      mr: [
        { label: 'आरामात', value: 'काहीही न करता श्वास घेणे कठीण होतंय' },
        { label: 'काम करताना', value: 'चालताना किंवा पायऱ्या चढताना श्वास लागतो' },
        { label: 'व्यायामानंतर', value: 'धावल्यानंतर दम लागतो, आराम केल्यावर बरं वाटतं' },
        { label: 'अचानक', value: 'श्वास घेणे कठीण अचानक सुरू झालं' },
      ],
      kn: [
        { label: 'ವಿಶ್ರಾಂತಿಯಲ್ಲಿ', value: 'ಏನೂ ಮಾಡದೆಯೂ ಉಸಿರಾಟ ಕಷ್ಟವಾಗುತ್ತಿದೆ' },
        { label: 'ಚಟುವಟಿಕೆಯಲ್ಲಿ', value: 'ನಡೆಯುವಾಗ ಅಥವಾ ಮೆಟ್ಟಿಲು ಹತ್ತುವಾಗ ಮಾತ್ರ' },
        { label: 'ವ್ಯಾಯಾಮದ ನಂತರ', value: 'ಓಡಿದ ನಂತರ ಏದುಸಿರು, ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಂಡರೆ ಸರಿಯಾಗುತ್ತದೆ' },
        { label: 'ಇದ್ದಕ್ಕಿದ್ದಂತೆ', value: 'ಉಸಿರಾಟ ಕಷ್ಟ ಇದ್ದಕ್ಕಿದ್ದಂತೆ ಶುರುವಾಯಿತು' },
      ],
      bn: [
        { label: 'বিশ্রামে', value: 'কিছু না করেও শ্বাসকষ্ট হচ্ছে' },
        { label: 'কাজ করলে', value: 'হাঁটলে বা সিঁড়ি উঠলে শ্বাসকষ্ট হয়' },
        { label: 'ব্যায়ামের পরে', value: 'দৌড়ানোর পরে শ্বাসকষ্ট, বিশ্রামে ভালো হয়ে যায়' },
        { label: 'হঠাৎ', value: 'শ্বাসকষ্ট হঠাৎ করে শুরু হয়েছে' },
      ],
    },
  },

  // ── 9. SKIN ISSUES ──
  {
    id: 'skin',
    triggers: {
      en: ['rash', 'itching', 'skin problem', 'skin rash', 'fungal', 'ringworm', 'pimple', 'acne'],
      hi: ['खुजली', 'दाद', 'चकत्ते', 'रैश', 'त्वचा', 'फंगल', 'पिंपल', 'खाज'],
      ta: ['அரிப்பு', 'தோல் பிரச்சனை', 'படை'],
      te: ['దురద', 'చర్మ సమస్య', 'దద్దు'],
      mr: ['खाज', 'पुरळ', 'गजकर्ण', 'त्वचा'],
      kn: ['ತುರಿಕೆ', 'ಚರ್ಮ ಸಮಸ್ಯೆ', 'ದದ್ದು'],
      bn: ['চুলকানি', 'ত্বকের সমস্যা', 'দাদ'],
    },
    followUp: {
      en: 'Is the rash ring-shaped? Is anyone else in your family also affected?',
      hi: 'क्या दाद गोल आकार का है? क्या घर में किसी और को भी है?',
      ta: 'தடிப்பு வளையம் போல் உள்ளதா? உங்கள் குடும்பத்தில் வேறு யாருக்கும் இருக்கிறதா?',
      te: 'దద్దు వలయాకారంగా ఉందా? మీ కుటుంబంలో ఇంకెవరికైనా ఉందా?',
      mr: 'पुरळ गोलाकार आहे का? घरात इतर कोणाला पण आहे का?',
      kn: 'ದದ್ದು ವೃತ್ತಾಕಾರವಾಗಿದೆಯಾ? ನಿಮ್ಮ ಕುಟುಂಬದಲ್ಲಿ ಬೇರೆ ಯಾರಿಗಾದರೂ ಇದೆಯಾ?',
      bn: 'ফুসকুড়ি কি গোলাকার? পরিবারে আর কারও আছে কি?',
    },
    options: {
      en: [
        { label: 'Ring-shaped rash', value: 'The rash is ring-shaped with clear center, very itchy' },
        { label: 'Itching everywhere', value: 'Itching all over the body, worse at night' },
        { label: 'Pimples/acne', value: 'I have pimples or acne on my face' },
        { label: 'Other skin issue', value: 'I have some other skin problem' },
      ],
      hi: [
        { label: 'गोल दाद', value: 'गोल आकार का दाद है जिसमें बहुत खुजली है' },
        { label: 'पूरे शरीर में खुजली', value: 'पूरे शरीर में खुजली है, रात को ज़्यादा' },
        { label: 'पिंपल/मुंहासे', value: 'चेहरे पर पिंपल या मुंहासे हैं' },
        { label: 'और कुछ', value: 'कोई और त्वचा की समस्या है' },
      ],
      ta: [
        { label: 'வளைய வடிவம்', value: 'வளைய வடிவ தடிப்பு, நடுவில் தெளிவாக, மிகவும் அரிப்பு' },
        { label: 'எல்லா இடத்திலும்', value: 'உடல் முழுவதும் அரிப்பு, இரவில் அதிகம்' },
        { label: 'பருக்கள்', value: 'முகத்தில் பருக்கள் உள்ளன' },
        { label: 'வேறு பிரச்சனை', value: 'வேறு ஏதாவது தோல் பிரச்சனை உள்ளது' },
      ],
      te: [
        { label: 'వలయాకారం', value: 'వలయాకార దద్దు, మధ్యలో తేటగా, చాలా దురద' },
        { label: 'అంతటా దురద', value: 'ఒళ్ళంతా దురద, రాత్రి ఎక్కువ' },
        { label: 'మొటిమలు', value: 'ముఖంపై మొటిమలు ఉన్నాయి' },
        { label: 'ఇతర సమస్య', value: 'ఇంకేదైనా చర్మ సమస్య ఉంది' },
      ],
      mr: [
        { label: 'गोलाकार पुरळ', value: 'गोलाकार पुरळ, मध्ये स्वच्छ, खूप खाज' },
        { label: 'सगळीकडे खाज', value: 'संपूर्ण शरीरात खाज, रात्री जास्त' },
        { label: 'पिंपल', value: 'चेहऱ्यावर पिंपल आहेत' },
        { label: 'इतर समस्या', value: 'काही इतर त्वचा समस्या आहे' },
      ],
      kn: [
        { label: 'ವೃತ್ತಾಕಾರ ದದ್ದು', value: 'ವೃತ್ತಾಕಾರ ದದ್ದು, ಮಧ್ಯದಲ್ಲಿ ಸ್ಪಷ್ಟ, ತುಂಬಾ ತುರಿಕೆ' },
        { label: 'ಎಲ್ಲಾ ಕಡೆ ತುರಿಕೆ', value: 'ಇಡೀ ಮೈಯಲ್ಲಿ ತುರಿಕೆ, ರಾತ್ರಿ ಹೆಚ್ಚು' },
        { label: 'ಮೊಡವೆ', value: 'ಮುಖದಲ್ಲಿ ಮೊಡವೆ ಇದೆ' },
        { label: 'ಬೇರೆ ಸಮಸ್ಯೆ', value: 'ಬೇರೆ ಯಾವುದೋ ಚರ್ಮ ಸಮಸ್ಯೆ ಇದೆ' },
      ],
      bn: [
        { label: 'গোলাকার ফুসকুড়ি', value: 'গোলাকার ফুসকুড়ি, মাঝখানে পরিষ্কার, খুব চুলকানি' },
        { label: 'সব জায়গায় চুলকানি', value: 'সারা শরীরে চুলকানি, রাতে বেশি' },
        { label: 'ব্রণ', value: 'মুখে ব্রণ আছে' },
        { label: 'অন্য সমস্যা', value: 'অন্য কোনো ত্বকের সমস্যা আছে' },
      ],
    },
  },

  // ── 10. COLD / FLU ──
  {
    id: 'cold_flu',
    triggers: {
      en: ['cold', 'runny nose', 'sneezing', 'flu', 'stuffy nose', 'congestion', 'blocked nose'],
      hi: ['सर्दी', 'ज़ुकाम', 'नाक बहना', 'छींक', 'बंद नाक', 'sardi', 'zukam'],
      ta: ['சளி', 'ஜலதோஷம்', 'தும்மல்', 'மூக்கடைப்பு'],
      te: ['జలుబు', 'ముక్కు కారుతోంది', 'తుమ్ములు'],
      mr: ['सर्दी', 'नाक वाहते', 'शिंका'],
      kn: ['ಶೀತ', 'ನೆಗಡಿ', 'ಸೀನು', 'ಮೂಗು ಕಟ್ಟಿದೆ'],
      bn: ['সর্দি', 'নাক দিয়ে পানি পড়া', 'হাঁচি'],
    },
    followUp: {
      en: 'How many days have you had this? Do you also have fever or body ache?',
      hi: 'कितने दिन से है? बुखार या बदन दर्द भी है क्या?',
      ta: 'எத்தனை நாட்களாக இருக்கிறது? காய்ச்சல் அல்லது உடல் வலியும் இருக்கிறதா?',
      te: 'ఎన్ని రోజులుగా ఉంది? జ్వరం లేదా ఒళ్ళు నొప్పులు కూడా ఉన్నాయా?',
      mr: 'किती दिवसांपासून आहे? ताप किंवा अंगदुखी पण आहे का?',
      kn: 'ಎಷ್ಟು ದಿನಗಳಿಂದ ಇದೆ? ಜ್ವರ ಅಥವಾ ಮೈ ನೋವು ಕೂಡ ಇದೆಯಾ?',
      bn: 'কতদিন ধরে আছে? জ্বর বা শরীর ব্যথাও আছে কি?',
    },
    options: {
      en: [
        { label: '1-3 days, mild', value: 'Cold for 1-3 days, just runny nose and sneezing' },
        { label: 'With fever', value: 'Cold with fever and body ache' },
        { label: 'Over a week', value: 'Cold symptoms for more than a week' },
        { label: 'Getting worse', value: 'Cold started mild but is getting worse' },
      ],
      hi: [
        { label: '1-3 दिन, हल्का', value: '1-3 दिन से सर्दी, बस नाक बह रही है' },
        { label: 'बुखार के साथ', value: 'सर्दी बुखार और बदन दर्द के साथ' },
        { label: 'एक हफ्ते से ज़्यादा', value: 'एक हफ्ते से ज़्यादा सर्दी ज़ुकाम' },
        { label: 'बढ़ रहा है', value: 'सर्दी पहले हल्की थी पर अब बढ़ रही है' },
      ],
      ta: [
        { label: '1-3 நாட்கள்', value: '1-3 நாட்களாக சளி, மூக்கு ஒழுகுதல் மட்டும்' },
        { label: 'காய்ச்சலுடன்', value: 'சளியுடன் காய்ச்சலும் உடல் வலியும்' },
        { label: 'ஒரு வாரத்திற்கு மேல்', value: 'ஒரு வாரத்திற்கு மேலாக சளி' },
        { label: 'மோசமாகிறது', value: 'சளி ஆரம்பத்தில் லேசாக இருந்தது, இப்போது அதிகமாகிறது' },
      ],
      te: [
        { label: '1-3 రోజులు', value: '1-3 రోజులుగా జలుబు, ముక్కు కారడం మాత్రమే' },
        { label: 'జ్వరంతో', value: 'జలుబుతో పాటు జ్వరం మరియు ఒళ్ళు నొప్పులు' },
        { label: 'వారం కంటే ఎక్కువ', value: 'వారం కంటే ఎక్కువ రోజులుగా జలుబు' },
        { label: 'పెరుగుతోంది', value: 'జలుబు మొదట తేలికగా ఉంది కానీ ఇప్పుడు పెరుగుతోంది' },
      ],
      mr: [
        { label: '1-3 दिवस', value: '1-3 दिवसांपासून सर्दी, फक्त नाक वाहते' },
        { label: 'तापासह', value: 'सर्दीसोबत ताप आणि अंगदुखी' },
        { label: 'आठवड्यापेक्षा जास्त', value: 'आठवड्यापेक्षा जास्त दिवस सर्दी' },
        { label: 'वाढतंय', value: 'सर्दी आधी सौम्य होती पण आता वाढतंय' },
      ],
      kn: [
        { label: '1-3 ದಿನ', value: '1-3 ದಿನಗಳಿಂದ ಶೀತ, ಮೂಗು ಸೋರುವುದು ಮಾತ್ರ' },
        { label: 'ಜ್ವರದೊಂದಿಗೆ', value: 'ಶೀತದ ಜೊತೆಗೆ ಜ್ವರ ಮತ್ತು ಮೈ ನೋವು' },
        { label: 'ಒಂದು ವಾರಕ್ಕಿಂತ ಹೆಚ್ಚು', value: 'ಒಂದು ವಾರಕ್ಕಿಂತ ಹೆಚ್ಚು ಶೀತ' },
        { label: 'ಹೆಚ್ಚಾಗುತ್ತಿದೆ', value: 'ಶೀತ ಮೊದಲು ಕಡಿಮೆ ಇತ್ತು ಈಗ ಹೆಚ್ಚಾಗುತ್ತಿದೆ' },
      ],
      bn: [
        { label: '১-৩ দিন', value: '১-৩ দিন ধরে সর্দি, শুধু নাক দিয়ে পানি পড়ছে' },
        { label: 'জ্বরসহ', value: 'সর্দির সাথে জ্বর এবং শরীর ব্যথা' },
        { label: 'এক সপ্তাহের বেশি', value: 'এক সপ্তাহের বেশি ধরে সর্দি' },
        { label: 'বাড়ছে', value: 'সর্দি আগে হালকা ছিল কিন্তু এখন বাড়ছে' },
      ],
    },
    seasonalMonths: [11, 12, 1, 2, 7, 8, 9],
  },
];

// ─── Matcher ─────────────────────────────────────────

/**
 * Detects common symptom patterns and returns an instant follow-up question.
 * Returns null if no pattern matches (should proceed to Claude).
 *
 * Only matches on the FIRST message (not follow-ups) to avoid re-triggering.
 */
export function detectSymptomPattern(
  message: string,
  language: Language,
  hasConversationHistory: boolean
): PatternMatch | null {
  // Only match on first message — don't intercept follow-up answers
  if (hasConversationHistory) return null;

  const lowerMessage = message.toLowerCase();
  const currentMonth = new Date().getMonth() + 1;

  let bestMatch: { pattern: SymptomPattern; score: number } | null = null;

  for (const pattern of SYMPTOM_PATTERNS) {
    let score = 0;

    // Check keyword triggers
    const langTriggers = pattern.triggers[language] || pattern.triggers.en || [];
    for (const trigger of langTriggers) {
      if (lowerMessage.includes(trigger.toLowerCase())) {
        score += 1;
      }
    }

    // Also check English triggers as fallback (Hinglish, code-mixing)
    if (language !== 'en' && pattern.triggers.en) {
      for (const trigger of pattern.triggers.en) {
        if (lowerMessage.includes(trigger.toLowerCase())) {
          score += 0.5;
        }
      }
    }

    // Check regex patterns
    const langPatterns = pattern.patterns?.[language] || [];
    for (const regex of langPatterns) {
      if (regex.test(message)) {
        score += 1;
      }
    }

    // Seasonal boost
    if (pattern.seasonalMonths?.includes(currentMonth)) {
      score *= 1.2;
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { pattern, score };
    }
  }

  if (!bestMatch) return null;

  const { pattern } = bestMatch;
  return {
    patternId: pattern.id,
    followUpQuestion: pattern.followUp[language] || pattern.followUp.en,
    followUpOptions: pattern.options[language] || pattern.options.en,
  };
}
