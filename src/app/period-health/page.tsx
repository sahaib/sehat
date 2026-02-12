'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Language } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import ReadAloudButton from '@/components/ReadAloudButton';
import RenderMarkdown from '@/components/RenderMarkdown';
import SehatOrb from '@/components/SehatOrb';

interface PeriodCycle {
  id: string;
  cycle_start: string;
  cycle_end: string | null;
  period_length: number | null;
  cycle_length: number | null;
  flow_level: string | null;
  symptoms: string[];
  mood: string | null;
  notes: string | null;
  created_at: string;
}

interface Predictions {
  avgCycleLength: number;
  avgPeriodLength: number;
  nextPeriodDate: string | null;
  notification: string | null;
}

// ═══════════════════════════════════════════════════════
// Full i18n translations for all 7 languages
// ═══════════════════════════════════════════════════════
const T: Record<string, Record<Language, string>> = {
  // ─── Header ───
  headerTitle:        { hi: 'पीरियड स्वास्थ्य', ta: 'மாதவிடாய் ஆரோக்கியம்', te: 'ఋతు ఆరోగ్యం', mr: 'मासिक पाळी आरोग्य', kn: 'ಮುಟ್ಟಿನ ಆರೋಗ್ಯ', bn: 'পিরিয়ড স্বাস্থ্য', en: 'Period Health' },
  headerTitleAlly:    { hi: 'पीरियड स्वास्थ्य जागरूकता', ta: 'மாதவிடாய் விழிப்புணர்வு', te: 'ఋతు ఆరోగ్య అవగాహన', mr: 'मासिक पाळी जागरूकता', kn: 'ಮುಟ್ಟಿನ ಆರೋಗ್ಯ ಜಾಗೃತಿ', bn: 'পিরিয়ড স্বাস্থ্য সচেতনতা', en: 'Period Health Awareness' },
  headerSubtitle:     { hi: 'AI-संचालित मासिक स्वास्थ्य', ta: 'AI-இயக்கப்படும் மாதவிடாய் நலம்', te: 'AI-ఆధారిత ఋతు ఆరోగ్యం', mr: 'AI-चालित मासिक आरोग्य', kn: 'AI-ಚಾಲಿತ ಮುಟ್ಟಿನ ಆರೋಗ್ಯ', bn: 'AI-চালিত ঋতু স্বাস্থ্য', en: 'AI-powered menstrual wellness' },
  headerSubtitleAlly: { hi: 'अपने जीवन की महिलाओं का साथ दें', ta: 'உங்கள் வாழ்க்கையில் உள்ள பெண்களை ஆதரியுங்கள்', te: 'మీ జీవితంలోని మహిళలకు మద్దతు ఇవ్వండి', mr: 'तुमच्या आयुष्यातील स्त्रियांना साथ द्या', kn: 'ನಿಮ್ಮ ಜೀವನದ ಮಹಿಳೆಯರನ್ನು ಬೆಂಬಲಿಸಿ', bn: 'আপনার জীবনের নারীদের সহায়তা করুন', en: 'Learn to support the women in your life' },

  // ─── Nav ───
  history:    { hi: 'इतिहास', ta: 'வரலாறு', te: 'చరిత్ర', mr: 'इतिहास', kn: 'ಇತಿಹಾಸ', bn: 'ইতিহাস', en: 'History' },
  dashboard:  { hi: 'डैशबोर्ड', ta: 'டாஷ்போர்டு', te: 'డాష్‌బోర్డ్', mr: 'डॅशबोर्ड', kn: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', bn: 'ড্যাশবোর্ড', en: 'Dashboard' },

  // ─── Sign-in / error ───
  signInTitle:   { hi: 'पीरियड स्वास्थ्य देखने के लिए साइन इन करें', ta: 'மாதவிடாய் ஆரோக்கியத்தை அணுக உள்நுழையவும்', te: 'ఋతు ఆరోగ్యాన్ని చూడటానికి సైన్ ఇన్ చేయండి', mr: 'मासिक पाळी आरोग्य पाहण्यासाठी साइन इन करा', kn: 'ಮುಟ್ಟಿನ ಆರೋಗ್ಯವನ್ನು ನೋಡಲು ಸೈನ್ ಇನ್ ಮಾಡಿ', bn: 'পিরিয়ড স্বাস্থ্য দেখতে সাইন ইন করুন', en: 'Sign in to access period health' },
  signInDesc:    { hi: 'आपका स्वास्थ्य डेटा निजी है और केवल आपको दिखाई देता है।', ta: 'உங்கள் சுகாதார தகவல் தனிப்பட்டது மற்றும் உங்களுக்கு மட்டுமே தெரியும்.', te: 'మీ ఆరోగ్య డేటా ప్రైవేట్ మరియు మీకు మాత్రమే కనిపిస్తుంది.', mr: 'तुमचा आरोग्य डेटा खाजगी आहे आणि फक्त तुम्हाला दिसतो.', kn: 'ನಿಮ್ಮ ಆರೋಗ್ಯ ಡೇಟಾ ಖಾಸಗಿ ಮತ್ತು ನಿಮಗೆ ಮಾತ್ರ ಗೋಚರಿಸುತ್ತದೆ.', bn: 'আপনার স্বাস্থ্য তথ্য ব্যক্তিগত এবং শুধুমাত্র আপনি দেখতে পারবেন।', en: 'Your health data is private and only visible to you.' },
  backToSehat:   { hi: 'सेहत पर वापस जाएं', ta: 'சேஹத்திற்குத் திரும்பு', te: 'సెహత్‌కు తిరిగి వెళ్ళండి', mr: 'सेहतवर परत जा', kn: 'ಸೆಹತ್‌ಗೆ ಹಿಂತಿರುಗಿ', bn: 'সেহতে ফিরে যান', en: 'Back to Sehat' },
  retry:         { hi: 'पुनः प्रयास करें', ta: 'மீண்டும் முயற்சிக்கவும்', te: 'మళ్ళీ ప్రయత్నించండి', mr: 'पुन्हा प्रयत्न करा', kn: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ', bn: 'আবার চেষ্টা করুন', en: 'Retry' },

  // ─── Ally hero ───
  allyHeroTitle: { hi: 'उनका साथी बनें', ta: 'அவளுக்கு துணை நில்', te: 'ఆమెకు అండగా ఉండండి', mr: 'तिची साथ द्या', kn: 'ಅವಳ ಬೆಂಬಲಿಗರಾಗಿ', bn: 'তার পাশে দাঁড়ান', en: 'Be Her Ally' },
  allyHeroDesc:  { hi: 'भारत में 71% किशोर लड़कियों को पहली बार पीरियड्स आने से पहले इसके बारे में पता नहीं होता। आप इसे बदल सकते हैं — सीखकर, समझकर और अपने आस-पास की महिलाओं का साथ देकर।', ta: 'இந்தியாவில் 71% இளம் பெண்கள் தங்கள் முதல் மாதவிடாய்க்கு முன் அதைப் பற்றி அறிந்திருக்கவில்லை. நீங்கள் இதை மாற்றலாம் — கற்றுக்கொள்வதன் மூலம், புரிந்துகொள்வதன் மூலம் மற்றும் ஆதரவாக இருப்பதன் மூலம்.', te: 'భారతదేశంలో 71% యుక్తవయస్కులైన అమ్మాయిలకు తొలి ఋతుస్రావానికి ముందు దాని గురించి తెలియదు. మీరు దీన్ని మార్చవచ్చు — నేర్చుకుని, అర్థం చేసుకుని, మద్దతు ఇవ్వడం ద్వారా.', mr: 'भारतातील 71% किशोरवयीन मुलींना पहिल्या मासिक पाळीपूर्वी त्याबद्दल माहिती नसते. तुम्ही हे बदलू शकता — शिकून, समजून आणि साथ देऊन.', kn: 'ಭಾರತದಲ್ಲಿ 71% ಹದಿಹರೆಯದ ಹುಡುಗಿಯರಿಗೆ ತಮ್ಮ ಮೊದಲ ಮುಟ್ಟಿನ ಮೊದಲು ಅದರ ಬಗ್ಗೆ ತಿಳಿದಿರುವುದಿಲ್ಲ. ನೀವು ಕಲಿಯುವ, ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವ ಮತ್ತು ಬೆಂಬಲಿಸುವ ಮೂಲಕ ಇದನ್ನು ಬದಲಾಯಿಸಬಹುದು.', bn: 'ভারতে 71% কিশোরী মেয়ে তাদের প্রথম পিরিয়ডের আগে এটি সম্পর্কে জানে না। আপনি এটি পরিবর্তন করতে পারেন — শিখে, বুঝে এবং সহায়তা করে।', en: '71% of adolescent girls in India don\'t know about menstruation before their first period. You can change this — by learning, understanding, and supporting the women around you.' },

  // ─── Ally education cards ───
  eduCard1Title: { hi: 'मासिक धर्म क्या है?', ta: 'மாதவிடாய் என்றால் என்ன?', te: 'ఋతుస్రావం అంటే ఏమిటి?', mr: 'मासिक पाळी म्हणजे काय?', kn: 'ಮುಟ್ಟು ಎಂದರೇನು?', bn: 'মাসিক কী?', en: 'What is menstruation?' },
  eduCard1Body:  { hi: 'मासिक धर्म (पीरियड्स) एक प्राकृतिक मासिक प्रक्रिया है जिसमें गर्भाशय अपनी परत छोड़ता है। यह आमतौर पर 3-7 दिन रहती है और हर 21-35 दिन में होती है। यह कोई बीमारी, कमज़ोरी या अशुद्धता नहीं है — यह अच्छे स्वास्थ्य की निशानी है।', ta: 'மாதவிடாய் (பீரியட்ஸ்) என்பது கருப்பை தனது உள்படலத்தை வெளியேற்றும் இயற்கையான மாதாந்திர செயல்முறையாகும். இது பொதுவாக 3-7 நாட்கள் நீடிக்கும், 21-35 நாட்களுக்கு ஒருமுறை நடக்கும். இது நோய், பலவீனம் அல்லது அசுத்தம் அல்ல — நல்ல ஆரோக்கியத்தின் அறிகுறி.', te: 'ఋతుస్రావం (పీరియడ్స్) అనేది గర్భాశయం దాని లైనింగ్‌ను విడిచిపెట్టే సహజ నెలవారీ ప్రక్రియ. ఇది సాధారణంగా 3-7 రోజులు ఉంటుంది, ప్రతి 21-35 రోజులకు జరుగుతుంది. ఇది వ్యాధి, బలహీనత లేదా అపవిత్రత కాదు — ఇది మంచి ఆరోగ్య సంకేతం.', mr: 'मासिक पाळी हा गर्भाशयाच्या अस्तराच्या बाहेर पडण्याची नैसर्गिक मासिक प्रक्रिया आहे. हे सामान्यतः 3-7 दिवस टिकते आणि दर 21-35 दिवसांनी होते. हा आजार, अशक्तपणा किंवा अशुद्धता नाही — चांगल्या आरोग्याचे लक्षण आहे.', kn: 'ಮುಟ್ಟು (ಪೀರಿಯಡ್ಸ್) ಎಂಬುದು ಗರ್ಭಕೋಶವು ತನ್ನ ಒಳಪೊರೆಯನ್ನು ಬಿಡುಗಡೆ ಮಾಡುವ ನೈಸರ್ಗಿಕ ಮಾಸಿಕ ಪ್ರಕ್ರಿಯೆ. ಇದು ಸಾಮಾನ್ಯವಾಗಿ 3-7 ದಿನಗಳ ಕಾಲ ಇರುತ್ತದೆ, ಪ್ರತಿ 21-35 ದಿನಗಳಿಗೊಮ್ಮೆ ಆಗುತ್ತದೆ. ಇದು ರೋಗ, ದೌರ್ಬಲ್ಯ ಅಥವಾ ಅಶುದ್ಧತೆ ಅಲ್ಲ — ಉತ್ತಮ ಆರೋಗ್ಯದ ಸಂಕೇತ.', bn: 'মাসিক (পিরিয়ড) হলো একটি প্রাকৃতিক মাসিক প্রক্রিয়া যেখানে জরায়ু তার আস্তরণ ত্যাগ করে। এটি সাধারণত 3-7 দিন স্থায়ী হয় এবং প্রতি 21-35 দিনে হয়। এটি রোগ, দুর্বলতা বা অপবিত্রতা নয় — এটি সুস্বাস্থ্যের লক্ষণ।', en: 'Menstruation (periods) is a natural monthly process where the uterus sheds its lining. It typically lasts 3-7 days and happens every 21-35 days. It is NOT a disease, weakness, or impurity — it is a sign of good health.' },
  eduCard2Title: { hi: 'आप कैसे मदद कर सकते हैं?', ta: 'நீங்கள் எப்படி உதவலாம்?', te: 'మీరు ఎలా సహాయం చేయగలరు?', mr: 'तुम्ही कशी मदत करू शकता?', kn: 'ನೀವು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?', bn: 'আপনি কীভাবে সাহায্য করতে পারেন?', en: 'How can you help?' },
  eduCard2Body:  { hi: 'बिना शर्मिंदगी के सैनिटरी प्रोडक्ट्स खरीदें। ऐंठन के लिए गर्म पानी की बोतल दें। मज़ाक न उड़ाएं। ज़रूरत होने पर जगह दें। पूछें "मैं कैसे मदद कर सकता हूं?" — जैसे किसी भी स्वास्थ्य मामले में पूछेंगे।', ta: 'சங்கடமின்றி சானிட்டரி பொருட்களை வாங்குங்கள். வலிக்கு வெந்நீர் பாட்டில் கொடுங்கள். கேலி செய்யாதீர்கள். தேவைப்படும்போது இடம் கொடுங்கள். "நான் எப்படி உதவலாம்?" என்று கேளுங்கள்.', te: 'సిగ్గుపడకుండా శానిటరీ ఉత్పత్తులు కొనండి. నొప్పికి వేడి నీళ్ళ సీసా ఇవ్వండి. జోకులు వేయకండి. అవసరమైనప్పుడు స్థలం ఇవ్వండి. "నేను ఎలా సహాయం చేయగలను?" అని అడగండి.', mr: 'लाजिरवाणे न होता सॅनिटरी प्रॉडक्ट्स विकत घ्या. पोटदुखीसाठी गरम पाण्याची बाटली द्या. विनोद करू नका. गरज असेल तेव्हा जागा द्या. "मी कशी मदत करू?" असे विचारा.', kn: 'ಮುಜುಗರವಿಲ್ಲದೆ ಸ್ಯಾನಿಟರಿ ಉತ್ಪನ್ನಗಳನ್ನು ಖರೀದಿಸಿ. ನೋವಿಗೆ ಬಿಸಿ ನೀರಿನ ಬಾಟಲಿ ಕೊಡಿ. ತಮಾಷೆ ಮಾಡಬೇಡಿ. ಅಗತ್ಯವಿರುವಾಗ ಜಾಗ ಕೊಡಿ. "ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?" ಎಂದು ಕೇಳಿ.', bn: 'লজ্জা ছাড়াই স্যানিটারি পণ্য কিনুন। ব্যথার জন্য গরম পানির বোতল দিন। ঠাট্টা করবেন না। প্রয়োজনে জায়গা দিন। জিজ্ঞাসা করুন "আমি কীভাবে সাহায্য করতে পারি?"', en: 'Buy sanitary products without embarrassment. Offer a hot water bottle for cramps. Don\'t make jokes or faces. Give space when needed. Ask "How can I help?" — just like you would for any health matter.' },
  eduCard3Title: { hi: 'मिथक जो छोड़ने होंगे', ta: 'களைய வேண்டிய கட்டுக்கதைகள்', te: 'నేర్చుకోవలసిన నిజాలు', mr: 'दूर करायच्या गैरसमजुती', kn: 'ತೊಡೆದುಹಾಕಬೇಕಾದ ಮಿಥ್ಯೆಗಳು', bn: 'ভুল ধারণা দূর করুন', en: 'Myths to unlearn' },
  eduCard3Body:  { hi: 'पीरियड्स में महिलाएं खाना बना सकती हैं, मंदिर जा सकती हैं, अचार छू सकती हैं — इन पाबंदियों का कोई वैज्ञानिक आधार नहीं है। पीरियड का खून "गंदा" नहीं है — यह वही खून है जो आपकी नसों में बहता है।', ta: 'மாதவிடாய் நேரத்தில் பெண்கள் சமைக்கலாம், கோவிலுக்கு செல்லலாம், ஊறுகாய் தொடலாம் — இந்த கட்டுப்பாடுகளுக்கு அறிவியல் அடிப்படை இல்லை. மாதவிடாய் இரத்தம் "அசுத்தம்" அல்ல — அது உங்கள் நரம்புகளில் ஓடும் அதே இரத்தம்.', te: 'పీరియడ్స్‌లో మహిళలు వంట చేయవచ్చు, గుడికి వెళ్ళవచ్చు, ఊరగాయ ముట్టుకోవచ్చు — ఈ ఆంక్షలకు శాస్త్రీయ ఆధారం లేదు. ఋతు రక్తం "అపవిత్రం" కాదు — ఇది మీ నరాల్లో ప్రవహించే అదే రక్తం.', mr: 'पाळीत स्त्रिया स्वयंपाक करू शकतात, मंदिरात जाऊ शकतात, लोणचे लावू शकतात — या निर्बंधांना कोणताही वैज्ञानिक आधार नाही. पाळीचे रक्त "अशुद्ध" नाही — ते तुमच्या शिरांमध्ये वाहणारे तेच रक्त आहे.', kn: 'ಮುಟ್ಟಿನ ಸಮಯದಲ್ಲಿ ಮಹಿಳೆಯರು ಅಡುಗೆ ಮಾಡಬಹುದು, ದೇವಸ್ಥಾನಕ್ಕೆ ಹೋಗಬಹುದು, ಉಪ್ಪಿನಕಾಯಿ ಮುಟ್ಟಬಹುದು — ಈ ನಿರ್ಬಂಧಗಳಿಗೆ ಯಾವುದೇ ವೈಜ್ಞಾನಿಕ ಆಧಾರವಿಲ್ಲ.', bn: 'পিরিয়ডের সময় মহিলারা রান্না করতে পারেন, মন্দিরে যেতে পারেন, আচার ছুঁতে পারেন — এসব নিষেধের কোনো বৈজ্ঞানিক ভিত্তি নেই। পিরিয়ডের রক্ত "অপবিত্র" নয় — এটি আপনার শিরায় বহমান একই রক্ত।', en: 'Women on periods can cook, enter temples, touch pickles, and do everything else — these restrictions have no scientific basis. Period blood is not "dirty" — it\'s the same blood that flows in your veins.' },
  eduCard4Title: { hi: 'डॉक्टर के पास कब जाएं', ta: 'மருத்துவரிடம் எப்போது செல்ல வேண்டும்', te: 'వైద్యుడి దగ్గరకు ఎప్పుడు వెళ్ళాలి', mr: 'डॉक्टरकडे कधी जायचे', kn: 'ವೈದ್ಯರ ಬಳಿ ಯಾವಾಗ ಹೋಗಬೇಕು', bn: 'ডাক্তারের কাছে কখন যেতে হবে', en: 'When to encourage a doctor visit' },
  eduCard4Body:  { hi: 'अगर बहुत ज़्यादा ब्लीडिंग हो (हर 1-2 घंटे में पैड बदलना), दैनिक कार्य न कर पाने जैसा तेज़ दर्द, 3+ महीने पीरियड न आना, या पीरियड्स के बीच स्पॉटिंग — तो गायनेकोलॉजिस्ट से मिलने को कहें।', ta: 'மிக அதிக இரத்தப்போக்கு (ஒவ்வொரு 1-2 மணி நேரத்திற்கும் பேட் மாற்றுதல்), தினசரி செயல்களைத் தடுக்கும் கடுமையான வலி, 3+ மாதங்கள் மாதவிடாய் வராமை, அல்லது இடையிடையே ரத்தக்கசிவு — மகப்பேறு மருத்துவரிடம் செல்ல ஊக்குவியுங்கள்.', te: 'చాలా ఎక్కువ రక్తస్రావం (ప్రతి 1-2 గంటలకు ప్యాడ్ మార్చడం), రోజువారీ పనులు చేయలేనంత నొప్పి, 3+ నెలలు పీరియడ్స్ రాకపోవడం, లేదా మధ్యలో స్పాటింగ్ — గైనకాలజిస్ట్‌ను సంప్రదించమని చెప్పండి.', mr: 'खूप जास्त रक्तस्राव (दर 1-2 तासाला पॅड बदलणे), रोजची कामे करता न येणे इतकी तीव्र वेदना, 3+ महिने पाळी न येणे, किंवा पाळी दरम्यान स्पॉटिंग — स्त्रीरोग तज्ञांकडे जाण्यास सांगा.', kn: 'ತುಂಬಾ ಹೆಚ್ಚು ರಕ್ತಸ್ರಾವ (ಪ್ರತಿ 1-2 ಗಂಟೆಗೆ ಪ್ಯಾಡ್ ಬದಲಾಯಿಸುವುದು), ದೈನಂದಿನ ಚಟುವಟಿಕೆಗಳನ್ನು ತಡೆಯುವ ತೀವ್ರ ನೋವು, 3+ ತಿಂಗಳು ಮುಟ್ಟು ಬಾರದಿರುವುದು — ಸ್ತ್ರೀರೋಗ ತಜ್ಞರನ್ನು ಭೇಟಿ ಮಾಡಲು ಪ್ರೋತ್ಸಾಹಿಸಿ.', bn: 'অত্যধিক রক্তপাত (প্রতি 1-2 ঘণ্টায় প্যাড বদলানো), দৈনন্দিন কাজে বাধা দেওয়ার মতো তীব্র ব্যথা, 3+ মাস পিরিয়ড না হওয়া, বা মাঝে মাঝে স্পটিং — গাইনোকোলজিস্ট দেখাতে বলুন।', en: 'If she has very heavy bleeding (changing pad every 1-2 hours), severe pain that prevents daily activities, periods missing for 3+ months, or spotting between periods — encourage visiting a gynecologist.' },

  // ─── Ally quick facts ───
  quickFacts:    { hi: 'महत्वपूर्ण तथ्य', ta: 'முக்கிய தகவல்கள்', te: 'ముఖ్యమైన విషయాలు', mr: 'महत्त्वाचे तथ्य', kn: 'ಪ್ರಮುಖ ಸಂಗತಿಗಳು', bn: 'গুরুত্বপূর্ণ তথ্য', en: 'Quick Facts' },
  fact1: { hi: 'पीरियड्स आमतौर पर 3-7 दिन रहते हैं और हर 21-35 दिन में आते हैं', ta: 'மாதவிடாய் பொதுவாக 3-7 நாட்கள் நீடிக்கும், 21-35 நாட்களுக்கு ஒருமுறை வரும்', te: 'పీరియడ్స్ సాధారణంగా 3-7 రోజులు ఉంటాయి, ప్రతి 21-35 రోజులకు వస్తాయి', mr: 'पाळी साधारणतः 3-7 दिवस टिकते आणि दर 21-35 दिवसांनी येते', kn: 'ಮುಟ್ಟು ಸಾಮಾನ್ಯವಾಗಿ 3-7 ದಿನ ಇರುತ್ತದೆ, ಪ್ರತಿ 21-35 ದಿನಗಳಿಗೊಮ್ಮೆ ಬರುತ್ತದೆ', bn: 'পিরিয়ড সাধারণত 3-7 দিন থাকে এবং প্রতি 21-35 দিনে হয়', en: 'Average period lasts 3-7 days and happens every 21-35 days' },
  fact2: { hi: 'ऐंठन, मूड बदलना और थकान सामान्य है — "ड्रामा" नहीं', ta: 'வலி, மனநிலை மாற்றங்கள் மற்றும் சோர்வு இயல்பானவை — "நாடகம்" அல்ல', te: 'నొప్పులు, మూడ్ మార్పులు మరియు అలసట సహజం — "డ్రామా" కాదు', mr: 'पोटदुखी, मूड बदलणे आणि थकवा सामान्य आहे — "ड्रामा" नाही', kn: 'ನೋವು, ಮನಸ್ಥಿತಿ ಬದಲಾವಣೆ ಮತ್ತು ಆಯಾಸ ಸಹಜ — "ಡ್ರಾಮಾ" ಅಲ್ಲ', bn: 'খিঁচুনি, মেজাজ পরিবর্তন ও ক্লান্তি স্বাভাবিক — "ড্রামা" নয়', en: 'Cramps, mood changes, and fatigue are normal — not "drama"' },
  fact3: { hi: 'एक महिला अपने जीवनकाल में ~10,000-15,000 पैड इस्तेमाल करती है — पीरियड प्रोडक्ट्स ज़रूरत हैं, लग्ज़री नहीं', ta: 'ஒரு பெண் தனது வாழ்நாளில் ~10,000-15,000 பேட்கள் பயன்படுத்துகிறாள் — மாதவிடாய் பொருட்கள் அத்தியாவசியம், ஆடம்பரம் அல்ல', te: 'ఒక మహిళ తన జీవితకాలంలో ~10,000-15,000 ప్యాడ్‌లు వాడుతుంది — పీరియడ్ ఉత్పత్తులు అవసరం, విలాసం కాదు', mr: 'एक स्त्री आपल्या आयुष्यात ~10,000-15,000 पॅड वापरते — पीरियड प्रॉडक्ट्स गरज आहेत, चैन नाही', kn: 'ಒಬ್ಬ ಮಹಿಳೆ ತನ್ನ ಜೀವಿತಾವಧಿಯಲ್ಲಿ ~10,000-15,000 ಪ್ಯಾಡ್‌ಗಳನ್ನು ಬಳಸುತ್ತಾಳೆ — ಮುಟ್ಟಿನ ಉತ್ಪನ್ನಗಳು ಅಗತ್ಯ, ಐಷಾರಾಮ ಅಲ್ಲ', bn: 'একজন নারী তার জীবনে ~10,000-15,000 প্যাড ব্যবহার করেন — পিরিয়ড পণ্য প্রয়োজনীয়, বিলাসিতা নয়', en: 'A woman uses ~10,000-15,000 pads in her lifetime — period products are essential, not luxury' },
  fact4: { hi: 'PCOS भारत में हर 5 में से 1 महिला को प्रभावित करता है — इसे जागरूकता चाहिए, शर्म नहीं', ta: 'PCOS இந்தியாவில் ஒவ்வொரு 5 பெண்களில் 1 பெண்ணை பாதிக்கிறது — இதற்கு விழிப்புணர்வு தேவை, அவமானம் அல்ல', te: 'PCOS భారతదేశంలో ప్రతి 5 మంది మహిళల్లో 1 మందిని ప్రభావితం చేస్తుంది — దీనికి అవగాహన కావాలి, సిగ్గు కాదు', mr: 'PCOS भारतातील दर 5 पैकी 1 स्त्रीला प्रभावित करते — याला जागरूकता हवी, लाज नाही', kn: 'PCOS ಭಾರತದಲ್ಲಿ ಪ್ರತಿ 5 ಮಹಿಳೆಯರಲ್ಲಿ 1 ಮಹಿಳೆಯನ್ನು ಪ್ರಭಾವಿಸುತ್ತದೆ — ಇದಕ್ಕೆ ಅರಿವು ಬೇಕು, ಅವಮಾನ ಅಲ್ಲ', bn: 'PCOS ভারতে প্রতি 5 জন নারীর মধ্যে 1 জনকে প্রভাবিত করে — এর জন্য সচেতনতা দরকার, লজ্জা নয়', en: 'PCOS affects 1 in 5 Indian women — it needs awareness, not shame' },
  fact5: { hi: 'पीरियड्स के बारे में खुलकर बात करने से अगली पीढ़ी स्वस्थ बनती है', ta: 'மாதவிடாய் பற்றி வெளிப்படையாக பேசுவது அடுத்த தலைமுறையை ஆரோக்கியமாக வளர்க்க உதவுகிறது', te: 'పీరియడ్స్ గురించి బహిరంగంగా మాట్లాడటం తదుపరి తరాన్ని ఆరోగ్యంగా పెరగడానికి సహాయపడుతుంది', mr: 'पाळीबद्दल उघडपणे बोलणे पुढच्या पिढीला निरोगी बनवते', kn: 'ಮುಟ್ಟಿನ ಬಗ್ಗೆ ಮುಕ್ತವಾಗಿ ಮಾತನಾಡುವುದು ಮುಂದಿನ ಪೀಳಿಗೆಯನ್ನು ಆರೋಗ್ಯವಂತರನ್ನಾಗಿ ಬೆಳೆಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ', bn: 'পিরিয়ড নিয়ে খোলামেলা কথা বলা পরবর্তী প্রজন্মকে সুস্থ করে তোলে', en: 'Talking about periods openly helps the next generation grow up healthier' },

  // ─── Ally CTA ───
  ctaShare:    { hi: 'इस पेज को किसी ज़रूरतमंद के साथ शेयर करें', ta: 'இந்த பக்கத்தை தேவையானவர்களுடன் பகிரவும்', te: 'ఈ పేజీని అవసరమైన వారితో షేర్ చేయండి', mr: 'हे पेज गरजू व्यक्तीसोबत शेअर करा', kn: 'ಈ ಪುಟವನ್ನು ಅಗತ್ಯವಿರುವವರೊಂದಿಗೆ ಹಂಚಿಕೊಳ್ಳಿ', bn: 'এই পেজটি প্রয়োজনীয় কারো সাথে শেয়ার করুন', en: 'Share this page with someone who could use it' },
  ctaBreak:    { hi: 'वर्जना तोड़ना एक बातचीत से शुरू होता है। आपने अभी शुरू किया।', ta: 'தடையை உடைப்பது ஒரு உரையாடலில் தொடங்குகிறது. நீங்கள் இப்போது தொடங்கினீர்கள்.', te: 'సంకోచాన్ని బద్దలు కొట్టడం ఒక సంభాషణతో మొదలవుతుంది. మీరు ఇప్పుడే మొదలు పెట్టారు.', mr: 'वर्ज्य मोडणे एका संवादातून सुरू होते. तुम्ही आत्ता सुरू केले.', kn: 'ನಿಷೇಧವನ್ನು ಮುರಿಯುವುದು ಒಂದು ಸಂಭಾಷಣೆಯಿಂದ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ನೀವು ಈಗ ಪ್ರಾರಂಭಿಸಿದ್ದೀರಿ.', bn: 'নিষেধাজ্ঞা ভাঙা একটি কথোপকথন দিয়ে শুরু হয়। আপনি এইমাত্র শুরু করলেন।', en: 'Breaking the taboo starts with one conversation. You just started yours.' },

  // ─── Tracker view ───
  cycleOverview: { hi: 'चक्र सारांश', ta: 'சுழற்சி கண்ணோட்டம்', te: 'చక్రం అవలోకనం', mr: 'चक्र सारांश', kn: 'ಚಕ್ರ ಅವಲೋಕನ', bn: 'চক্র সারসংক্ষেপ', en: 'Cycle Overview' },
  cyclesLogged:  { hi: 'चक्र दर्ज', ta: 'சுழற்சிகள் பதிவு', te: 'చక్రాలు నమోదు', mr: 'चक्र नोंदवले', kn: 'ಚಕ್ರಗಳು ದಾಖಲು', bn: 'চক্র রেকর্ড', en: 'cycles logged' },
  avgCycleDays:  { hi: 'औसत चक्र (दिन)', ta: 'சராசரி சுழற்சி (நாட்கள்)', te: 'సగటు చక్రం (రోజులు)', mr: 'सरासरी चक्र (दिवस)', kn: 'ಸರಾಸರಿ ಚಕ್ರ (ದಿನಗಳು)', bn: 'গড় চক্র (দিন)', en: 'Avg Cycle (days)' },
  avgPeriodDays: { hi: 'औसत पीरियड (दिन)', ta: 'சராசரி மாதவிடாய் (நாட்கள்)', te: 'సగటు పీరియడ్ (రోజులు)', mr: 'सरासरी पाळी (दिवस)', kn: 'ಸರಾಸರಿ ಮುಟ್ಟು (ದಿನಗಳು)', bn: 'গড় পিরিয়ড (দিন)', en: 'Avg Period (days)' },
  daysLate:      { hi: 'दिन देर से', ta: 'நாட்கள் தாமதம்', te: 'రోజులు ఆలస్యం', mr: 'दिवस उशीर', kn: 'ದಿನಗಳು ತಡವಾಗಿ', bn: 'দিন দেরি', en: 'Days late' },
  daysUntilNext: { hi: 'अगले तक दिन', ta: 'அடுத்ததற்கு நாட்கள்', te: 'తదుపరి వరకు రోజులు', mr: 'पुढील पर्यंत दिवस', kn: 'ಮುಂದಿನವರೆಗೆ ದಿನಗಳು', bn: 'পরবর্তী পর্যন্ত দিন', en: 'Days until next' },
  nextPeriod:    { hi: 'अगला पीरियड', ta: 'அடுத்த மாதவிடாய்', te: 'తదుపరి పీరియడ్', mr: 'पुढील पाळी', kn: 'ಮುಂದಿನ ಮುಟ್ಟು', bn: 'পরবর্তী পিরিয়ড', en: 'Next period' },
  logPeriod:     { hi: 'पीरियड दर्ज करें', ta: 'மாதவிடாய் பதிவு செய்', te: 'పీరియడ్ నమోదు చేయండి', mr: 'पाळी नोंदवा', kn: 'ಮುಟ್ಟು ದಾಖಲಿಸಿ', bn: 'পিরিয়ড রেকর্ড করুন', en: 'Log Period' },
  logYourPeriod: { hi: 'अपना पीरियड दर्ज करें', ta: 'உங்கள் மாதவிடாயை பதிவு செய்யுங்கள்', te: 'మీ పీరియడ్ నమోదు చేయండి', mr: 'तुमची पाळी नोंदवा', kn: 'ನಿಮ್ಮ ಮುಟ್ಟನ್ನು ದಾಖಲಿಸಿ', bn: 'আপনার পিরিয়ড রেকর্ড করুন', en: 'Log Your Period' },
  startDate:     { hi: 'शुरू तारीख', ta: 'தொடக்க தேதி', te: 'ప్రారంభ తేదీ', mr: 'सुरुवात तारीख', kn: 'ಪ್ರಾರಂಭ ದಿನಾಂಕ', bn: 'শুরুর তারিখ', en: 'Start Date' },
  periodLength:  { hi: 'पीरियड अवधि (दिन)', ta: 'மாதவிடாய் நீளம் (நாட்கள்)', te: 'పీరియడ్ కాలం (రోజులు)', mr: 'पाळी कालावधी (दिवस)', kn: 'ಮುಟ್ಟಿನ ಅವಧಿ (ದಿನಗಳು)', bn: 'পিরিয়ডের দৈর্ঘ্য (দিন)', en: 'Period Length (days)' },
  flowLevel:     { hi: 'प्रवाह स्तर', ta: 'ரத்தப்போக்கு அளவு', te: 'ప్రవాహ స్థాయి', mr: 'प्रवाह पातळी', kn: 'ಹರಿವಿನ ಮಟ್ಟ', bn: 'প্রবাহের মাত্রা', en: 'Flow Level' },
  flowLight:     { hi: 'हल्का', ta: 'குறைவு', te: 'తక్కువ', mr: 'हलका', kn: 'ಕಡಿಮೆ', bn: 'হালকা', en: 'Light' },
  flowMedium:    { hi: 'मध्यम', ta: 'நடுத்தரம்', te: 'మధ్యస్థం', mr: 'मध्यम', kn: 'ಮಧ್ಯಮ', bn: 'মাঝারি', en: 'Medium' },
  flowHeavy:     { hi: 'भारी', ta: 'அதிகம்', te: 'ఎక్కువ', mr: 'जास्त', kn: 'ಹೆಚ್ಚು', bn: 'ভারী', en: 'Heavy' },
  symptoms:      { hi: 'लक्षण', ta: 'அறிகுறிகள்', te: 'లక్షణాలు', mr: 'लक्षणे', kn: 'ರೋಗಲಕ್ಷಣಗಳು', bn: 'উপসর্গ', en: 'Symptoms' },
  mood:          { hi: 'मूड', ta: 'மனநிலை', te: 'మూడ్', mr: 'मूड', kn: 'ಮನಸ್ಥಿತಿ', bn: 'মেজাজ', en: 'Mood' },
  notesOpt:      { hi: 'नोट्स (वैकल्पिक)', ta: 'குறிப்புகள் (விருப்பம்)', te: 'నోట్స్ (ఐచ్ఛికం)', mr: 'नोट्स (ऐच्छिक)', kn: 'ಟಿಪ್ಪಣಿಗಳು (ಐಚ್ಛಿಕ)', bn: 'নোট (ঐচ্ছিক)', en: 'Notes (optional)' },
  save:          { hi: 'सेव करें', ta: 'சேமி', te: 'సేవ్ చేయండి', mr: 'सेव्ह करा', kn: 'ಉಳಿಸಿ', bn: 'সংরক্ষণ করুন', en: 'Save' },
  saving:        { hi: 'सेव हो रहा है...', ta: 'சேமிக்கிறது...', te: 'సేవ్ అవుతోంది...', mr: 'सेव्ह होत आहे...', kn: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ...', bn: 'সংরক্ষণ হচ্ছে...', en: 'Saving...' },
  cycleHistory:  { hi: 'चक्र इतिहास', ta: 'சுழற்சி வரலாறு', te: 'చక్ర చరిత్ర', mr: 'चक्र इतिहास', kn: 'ಚಕ್ರ ಇತಿಹಾಸ', bn: 'চক্র ইতিহাস', en: 'Cycle History' },
  days:          { hi: 'दिन', ta: 'நாட்கள்', te: 'రోజులు', mr: 'दिवस', kn: 'ದಿನಗಳು', bn: 'দিন', en: 'days' },
  flow:          { hi: 'प्रवाह', ta: 'போக்கு', te: 'ప్రవాహం', mr: 'प्रवाह', kn: 'ಹರಿವು', bn: 'প্রবাহ', en: 'flow' },
  dayCycle:      { hi: 'दिन चक्र', ta: 'நாள் சுழற்சி', te: 'రోజు చక్రం', mr: 'दिवस चक्र', kn: 'ದಿನ ಚಕ್ರ', bn: 'দিন চক্র', en: 'd cycle' },
  emptyTitle:    { hi: 'अपना चक्र ट्रैक करना शुरू करें', ta: 'உங்கள் சுழற்சியை கண்காணிக்க தொடங்குங்கள்', te: 'మీ చక్రాన్ని ట్రాక్ చేయడం ప్రారంభించండి', mr: 'तुमचे चक्र ट्रॅक करायला सुरू करा', kn: 'ನಿಮ್ಮ ಚಕ್ರವನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ಪ್ರಾರಂಭಿಸಿ', bn: 'আপনার চক্র ট্র্যাক করা শুরু করুন', en: 'Start tracking your cycle' },
  emptyDesc:     { hi: 'अपने पीरियड्स दर्ज करें — व्यक्तिगत भविष्यवाणी, स्वास्थ्य जानकारी और रिमाइंडर पाएं — अपनी भाषा में।', ta: 'உங்கள் மாதவிடாயைப் பதிவு செய்யுங்கள் — தனிப்பயனாக்கப்பட்ட கணிப்புகள், சுகாதார நுண்ணறிவு மற்றும் நினைவூட்டல்களைப் பெறுங்கள்.', te: 'మీ పీరియడ్‌లను నమోదు చేయండి — వ్యక్తిగత అంచనాలు, ఆరోగ్య సమాచారం మరియు రిమైండర్‌లు పొందండి.', mr: 'तुमच्या पाळी नोंदवा — वैयक्तिक अंदाज, आरोग्य माहिती आणि स्मरणपत्रे मिळवा.', kn: 'ನಿಮ್ಮ ಮುಟ್ಟನ್ನು ದಾಖಲಿಸಿ — ವೈಯಕ್ತಿಕ ಮುನ್ಸೂಚನೆಗಳು, ಆರೋಗ್ಯ ಒಳನೋಟಗಳು ಮತ್ತು ಜ್ಞಾಪನೆಗಳನ್ನು ಪಡೆಯಿರಿ.', bn: 'আপনার পিরিয়ড রেকর্ড করুন — ব্যক্তিগত পূর্বাভাস, স্বাস্থ্য তথ্য এবং রিমাইন্ডার পান।', en: 'Log your periods to get personalized predictions, health insights, and reminders — all in your language.' },

  // ─── AI Q&A ───
  askTitle:      { hi: 'पीरियड स्वास्थ्य के बारे में पूछें', ta: 'மாதவிடாய் ஆரோக்கியம் பற்றி கேளுங்கள்', te: 'ఋతు ఆరోగ్యం గురించి అడగండి', mr: 'मासिक पाळी आरोग्याबद्दल विचारा', kn: 'ಮುಟ್ಟಿನ ಆರೋಗ್ಯದ ಬಗ್ಗೆ ಕೇಳಿ', bn: 'পিরিয়ড স্বাস্থ্য সম্পর্কে জিজ্ঞাসা করুন', en: 'Ask About Period Health' },
  askTitleAlly:  { hi: 'मासिक स्वास्थ्य के बारे में पूछें', ta: 'மாதவிடாய் சுகாதாரம் பற்றி கேளுங்கள்', te: 'ఋతు ఆరోగ్యం గురించి అడగండి', mr: 'मासिक आरोग्याबद्दल विचारा', kn: 'ಮುಟ್ಟಿನ ಆರೋಗ್ಯದ ಬಗ್ಗೆ ಕೇಳಿ', bn: 'মাসিক স্বাস্থ্য সম্পর্কে জিজ্ঞাসা করুন', en: 'Ask About Menstrual Health' },
  askDesc:       { hi: 'पीरियड्स, चक्र स्वास्थ्य, स्वच्छता, PCOS, या मासिक कल्याण के बारे में कुछ भी पूछें — अपनी भाषा में।', ta: 'மாதவிடாய், சுழற்சி ஆரோக்கியம், சுகாதாரம், PCOS, அல்லது மாதவிடாய் நலம் பற்றி கேளுங்கள் — உங்கள் மொழியில்.', te: 'పీరియడ్స్, చక్ర ఆరోగ్యం, పరిశుభ్రత, PCOS, లేదా ఋతు ఆరోగ్యం గురించి ఏదైనా అడగండి — మీ భాషలో.', mr: 'पाळी, चक्र आरोग्य, स्वच्छता, PCOS, किंवा मासिक कल्याण बद्दल काहीही विचारा — तुमच्या भाषेत.', kn: 'ಮುಟ್ಟು, ಚಕ್ರ ಆರೋಗ್ಯ, ನೈರ್ಮಲ್ಯ, PCOS, ಅಥವಾ ಮುಟ್ಟಿನ ಆರೋಗ್ಯದ ಬಗ್ಗೆ ಏನನ್ನಾದರೂ ಕೇಳಿ — ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ.', bn: 'পিরিয়ড, চক্র স্বাস্থ্য, পরিচ্ছন্নতা, PCOS, বা ঋতু স্বাস্থ্য সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন — আপনার ভাষায়।', en: 'Ask anything about periods, cycle health, hygiene, PCOS, or menstrual wellness — in your language.' },
  askDescAlly:   { hi: 'मासिक स्वास्थ्य के बारे में कुछ भी पूछें — पीरियड्स समझें, मिथक तोड़ें, सहायक बनना सीखें — अपनी भाषा में।', ta: 'மாதவிடாய் சுகாதாரம் பற்றி எதையும் கேளுங்கள் — மாதவிடாயைப் புரிந்துகொள்ளுங்கள், கட்டுக்கதைகளை உடையுங்கள், ஆதரவாக இருக்கக் கற்றுக்கொள்ளுங்கள்.', te: 'ఋతు ఆరోగ్యం గురించి ఏదైనా అడగండి — పీరియడ్స్ అర్థం చేసుకోండి, అపోహలు తొలగించండి, మద్దతు ఇవ్వడం నేర్చుకోండి.', mr: 'मासिक आरोग्याबद्दल काहीही विचारा — पाळी समजून घ्या, गैरसमज दूर करा, सहाय्यक बनायला शिका.', kn: 'ಮುಟ್ಟಿನ ಆರೋಗ್ಯದ ಬಗ್ಗೆ ಏನನ್ನಾದರೂ ಕೇಳಿ — ಮುಟ್ಟನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ, ಮಿಥ್ಯೆಗಳನ್ನು ಮುರಿಯಿರಿ, ಬೆಂಬಲಿಸಲು ಕಲಿಯಿರಿ.', bn: 'মাসিক স্বাস্থ্য সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন — পিরিয়ড বুঝুন, ভুল ধারণা দূর করুন, সহায়ক হতে শিখুন।', en: 'Ask anything about menstrual health — understand periods, bust myths, learn how to be supportive — in your language.' },
  askPlaceholder:{ hi: 'अपना सवाल पूछें...', ta: 'உங்கள் கேள்வியைக் கேளுங்கள்...', te: 'మీ ప్రశ్న అడగండి...', mr: 'तुमचा प्रश्न विचारा...', kn: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಕೇಳಿ...', bn: 'আপনার প্রশ্ন জিজ্ঞাসা করুন...', en: 'Ask your question...' },
  askBtn:        { hi: 'पूछें', ta: 'கேள்', te: 'అడగండి', mr: 'विचारा', kn: 'ಕೇಳಿ', bn: 'জিজ্ঞাসা', en: 'Ask' },
  thinking:      { hi: 'सोच रहा है...', ta: 'யோசிக்கிறது...', te: 'ఆలోచిస్తోంది...', mr: 'विचार करत आहे...', kn: 'ಯೋಚಿಸುತ್ತಿದೆ...', bn: 'ভাবছে...', en: 'Thinking...' },
  aiDisclaimer:  { hi: 'AI उत्तर — चिकित्सा सलाह के लिए डॉक्टर से परामर्श करें', ta: 'AI பதில் — மருத்துவ ஆலோசனைக்கு மருத்துவரை அணுகவும்', te: 'AI సమాధానం — వైద్య సలహా కోసం వైద్యుడిని సంప్రదించండి', mr: 'AI उत्तर — वैद्यकीय सल्ल्यासाठी डॉक्टरांचा सल्ला घ्या', kn: 'AI ಉತ್ತರ — ವೈದ್ಯಕೀಯ ಸಲಹೆಗಾಗಿ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ', bn: 'AI উত্তর — চিকিৎসা পরামর্শের জন্য ডাক্তারের সাথে যোগাযোগ করুন', en: 'AI response — consult a doctor for medical advice' },

  // ─── Symptom names ───
  sCramps:    { hi: 'ऐंठन', ta: 'வலி', te: 'నొప్పులు', mr: 'पोटदुखी', kn: 'ನೋವು', bn: 'খিঁচুনি', en: 'Cramps' },
  sHeadache:  { hi: 'सिरदर्द', ta: 'தலைவலி', te: 'తలనొప్పి', mr: 'डोकेदुखी', kn: 'ತಲೆನೋವು', bn: 'মাথাব্যথা', en: 'Headache' },
  sBackPain:  { hi: 'कमर दर्द', ta: 'முதுகு வலி', te: 'నడుము నొప్పి', mr: 'पाठदुखी', kn: 'ಬೆನ್ನು ನೋವು', bn: 'পিঠে ব্যথা', en: 'Back pain' },
  sBloating:  { hi: 'पेट फूलना', ta: 'வீக்கம்', te: 'ఉబ్బరం', mr: 'पोट फुगणे', kn: 'ಹೊಟ್ಟೆ ಉಬ್ಬರ', bn: 'পেট ফোলা', en: 'Bloating' },
  sFatigue:   { hi: 'थकान', ta: 'சோர்வு', te: 'అలసట', mr: 'थकवा', kn: 'ಆಯಾಸ', bn: 'ক্লান্তি', en: 'Fatigue' },
  sMoodSwings:{ hi: 'मूड बदलना', ta: 'மனநிலை மாற்றம்', te: 'మూడ్ మార్పులు', mr: 'मूड बदलणे', kn: 'ಮನಸ್ಥಿತಿ ಬದಲಾವಣೆ', bn: 'মেজাজ পরিবর্তন', en: 'Mood swings' },
  sAcne:      { hi: 'मुँहासे', ta: 'முகப்பரு', te: 'మొటిమలు', mr: 'पुरळ', kn: 'ಮೊಡವೆ', bn: 'ব্রণ', en: 'Acne' },
  sBreast:    { hi: 'स्तन कोमलता', ta: 'மார்பக வலி', te: 'రొమ్ము నొప్పి', mr: 'स्तनदुखी', kn: 'ಎದೆ ನೋವು', bn: 'স্তনে ব্যথা', en: 'Breast tenderness' },
  sNausea:    { hi: 'जी मिचलाना', ta: 'குமட்டல்', te: 'వాంతి భావన', mr: 'मळमळ', kn: 'ವಾಕರಿಕೆ', bn: 'বমি ভাব', en: 'Nausea' },
  sCravings:  { hi: 'खाने की तलब', ta: 'பசி உணர்வு', te: 'ఆహార కోరిక', mr: 'खाण्याची इच्छा', kn: 'ಆಹಾರ ಬಯಕೆ', bn: 'খাবারের তীব্র ইচ্ছা', en: 'Cravings' },

  // ─── Mood names ───
  mHappy:     { hi: 'खुश', ta: 'மகிழ்ச்சி', te: 'సంతోషం', mr: 'आनंदी', kn: 'ಸಂತೋಷ', bn: 'খুশি', en: 'Happy' },
  mCalm:      { hi: 'शांत', ta: 'அமைதி', te: 'ప్రశాంతం', mr: 'शांत', kn: 'ಶಾಂತ', bn: 'শান্ত', en: 'Calm' },
  mAnxious:   { hi: 'चिंतित', ta: 'கவலை', te: 'ఆందోళన', mr: 'चिंताग्रस्त', kn: 'ಆತಂಕ', bn: 'উদ্বিগ্ন', en: 'Anxious' },
  mSad:       { hi: 'उदास', ta: 'சோகம்', te: 'దుఃఖం', mr: 'दुःखी', kn: 'ದುಃಖ', bn: 'দুঃখিত', en: 'Sad' },
  mIrritable: { hi: 'चिड़चिड़ा', ta: 'எரிச்சல்', te: 'చిరాకు', mr: 'चिडचिड', kn: 'ಕಿರಿಕಿರಿ', bn: 'বিরক্ত', en: 'Irritable' },
  mEnergetic: { hi: 'ऊर्जावान', ta: 'சுறுசுறுப்பு', te: 'శక్తివంతం', mr: 'उत्साही', kn: 'ಚೈತನ್ಯ', bn: 'প্রাণবন্ত', en: 'Energetic' },
  mTired:     { hi: 'थका हुआ', ta: 'களைப்பு', te: 'అలసట', mr: 'थकलेले', kn: 'ದಣಿವು', bn: 'ক্লান্ত', en: 'Tired' },

  // ─── Footer ───
  footerAlly:    { hi: 'ज्ञान शक्ति है। मासिक स्वास्थ्य पर चुप्पी तोड़ें।', ta: 'அறிவே சக்தி. மாதவிடாய் சுகாதாரத்தில் மௌனத்தை உடையுங்கள்.', te: 'జ్ఞానమే శక్తి. ఋతు ఆరోగ్యంపై మౌనాన్ని బద్దలు కొట్టండి.', mr: 'ज्ञान हीच शक्ती. मासिक आरोग्यावरील शांतता मोडा.', kn: 'ಜ್ಞಾನವೇ ಶಕ್ತಿ. ಮುಟ್ಟಿನ ಆರೋಗ್ಯದ ಬಗ್ಗೆ ಮೌನ ಮುರಿಯಿರಿ.', bn: 'জ্ঞানই শক্তি। মাসিক স্বাস্থ্যে নীরবতা ভাঙুন।', en: 'Knowledge is power. Break the silence around menstrual health.' },
  deleteConfirm: { hi: 'क्या आप इस चक्र को हटाना चाहती हैं?', ta: 'இந்த சுழற்சியை நீக்க விரும்புகிறீர்களா?', te: 'ఈ చక్రాన్ని తొలగించాలనుకుంటున్నారా?', mr: 'तुम्हाला हे चक्र हटवायचे आहे का?', kn: 'ಈ ಚಕ್ರವನ್ನು ಅಳಿಸಲು ಬಯಸುವಿರಾ?', bn: 'আপনি কি এই চক্রটি মুছে ফেলতে চান?', en: 'Delete this cycle entry?' },
  footerTracker: { hi: 'आपका पीरियड डेटा निजी है और केवल आपको दिखाई देता है। यह चिकित्सा निदान नहीं है।', ta: 'உங்கள் மாதவிடாய் தகவல் தனிப்பட்டது. இது மருத்துவ நோயறிதல் அல்ல.', te: 'మీ పీరియడ్ డేటా ప్రైవేట్. ఇది వైద్య నిర్ధారణ కాదు.', mr: 'तुमचा पाळी डेटा खाजगी आहे. हे वैद्यकीय निदान नाही.', kn: 'ನಿಮ್ಮ ಮುಟ್ಟಿನ ಡೇಟಾ ಖಾಸಗಿ. ಇದು ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯ ಅಲ್ಲ.', bn: 'আপনার পিরিয়ড ডেটা ব্যক্তিগত। এটি চিকিৎসা নির্ণয় নয়।', en: 'Your period data is private and visible only to you. Not a medical diagnosis.' },
};

// Helper to get translated string
function t(key: string, lang: Language): string {
  return T[key]?.[lang] || T[key]?.en || key;
}

// Symptom keys map for translation
const SYMPTOM_KEYS = ['sCramps', 'sHeadache', 'sBackPain', 'sBloating', 'sFatigue', 'sMoodSwings', 'sAcne', 'sBreast', 'sNausea', 'sCravings'];
const SYMPTOM_EN = ['Cramps', 'Headache', 'Back pain', 'Bloating', 'Fatigue', 'Mood swings', 'Acne', 'Breast tenderness', 'Nausea', 'Cravings'];
const MOOD_KEYS = ['mHappy', 'mCalm', 'mAnxious', 'mSad', 'mIrritable', 'mEnergetic', 'mTired'];
const MOOD_EN = ['Happy', 'Calm', 'Anxious', 'Sad', 'Irritable', 'Energetic', 'Tired'];

// Suggested questions per language
const ALLY_QUESTIONS: Record<Language, string[]> = {
  hi: ['पीरियड्स के बारे में मुझे क्या जानना चाहिए?', 'मैं अपनी बहन/पत्नी की कैसे मदद कर सकता हूं?', 'पीरियड्स से जुड़े मिथक क्या हैं?'],
  ta: ['மாதவிடாய் பற்றி நான் என்ன தெரிந்து கொள்ள வேண்டும்?', 'என் சகோதரி/மனைவிக்கு எப்படி உதவலாம்?', 'மாதவிடாய் பற்றிய கட்டுக்கதைகள் என்ன?'],
  te: ['పీరియడ్స్ గురించి నాకు ఏమి తెలియాలి?', 'నా సోదరి/భార్యకు నేను ఎలా సహాయం చేయగలను?', 'పీరియడ్స్ గురించి అపోహలు ఏమిటి?'],
  mr: ['मासिक पाळीबद्दल मला काय माहित असावे?', 'मी माझ्या बहिणीची/पत्नीची कशी मदत करू शकतो?', 'पाळीबद्दलचे गैरसमज काय आहेत?'],
  kn: ['ಮುಟ್ಟಿನ ಬಗ್ಗೆ ನಾನು ಏನು ತಿಳಿದಿರಬೇಕು?', 'ನನ್ನ ಸಹೋದರಿ/ಪತ್ನಿಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?', 'ಮುಟ್ಟಿನ ಬಗ್ಗೆ ಮಿಥ್ಯೆಗಳೇನು?'],
  bn: ['পিরিয়ড সম্পর্কে আমার কী জানা উচিত?', 'আমি কীভাবে আমার বোন/স্ত্রীকে সাহায্য করতে পারি?', 'পিরিয়ড সম্পর্কে ভুল ধারণাগুলো কী?'],
  en: ['What should I know about periods?', 'How can I support my sister/wife during periods?', 'What are common myths about periods?'],
};

const SELF_QUESTIONS: Record<Language, string[]> = {
  hi: ['पीरियड्स में दर्द कम करने के उपाय', 'PCOS क्या है?', 'पीरियड में क्या खाना चाहिए'],
  ta: ['மாதவிடாய் வலியை இயற்கையாக குறைப்பது எப்படி', 'PCOS என்றால் என்ன?', 'மாதவிடாய் நேரத்தில் என்ன சாப்பிட வேண்டும்'],
  te: ['పీరియడ్ నొప్పిని సహజంగా తగ్గించడం ఎలా', 'PCOS అంటే ఏమిటి?', 'పీరియడ్ సమయంలో ఏమి తినాలి'],
  mr: ['पाळीदुखी कमी करण्याचे नैसर्गिक उपाय', 'PCOS म्हणजे काय?', 'पाळीत काय खावे'],
  kn: ['ಮುಟ್ಟಿನ ನೋವನ್ನು ನೈಸರ್ಗಿಕವಾಗಿ ಕಡಿಮೆ ಮಾಡುವುದು ಹೇಗೆ', 'PCOS ಎಂದರೇನು?', 'ಮುಟ್ಟಿನ ಸಮಯದಲ್ಲಿ ಏನು ತಿನ್ನಬೇಕು'],
  bn: ['পিরিয়ডের ব্যথা প্রাকৃতিকভাবে কমানোর উপায়', 'PCOS কী?', 'পিরিয়ডে কী খাওয়া উচিত'],
  en: ['How to reduce period pain naturally', 'What is PCOS?', 'What to eat during periods'],
};

export default function PeriodHealthPage() {
  const [cycles, setCycles] = useState<PeriodCycle[]>([]);
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('hi');

  const [showLogForm, setShowLogForm] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logPeriodLength, setLogPeriodLength] = useState('5');
  const [logFlow, setLogFlow] = useState('medium');
  const [logSymptoms, setLogSymptoms] = useState<string[]>([]);
  const [logMood, setLogMood] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sehat_language');
    if (saved) setLanguage(saved as Language);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/period-tracker');
      if (res.status === 401) { setError('sign-in'); return; }
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setGender(data.gender);
      setCycles(data.cycles);
      setPredictions(data.predictions);
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogCycle = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/period-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log', cycle_start: logDate,
          period_length: parseInt(logPeriodLength) || null,
          flow_level: logFlow || null, symptoms: logSymptoms,
          mood: logMood || null, notes: logNotes || null,
        }),
      });
      if (res.ok) { setShowLogForm(false); setLogSymptoms([]); setLogMood(''); setLogNotes(''); await fetchData(); }
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const isAlly = gender === 'male' || gender === 'other' || gender === 'prefer_not_to_say';
  const aiContext = isAlly ? 'ally' : 'self';

  const handleAskAI = async () => {
    if (!question.trim()) return;
    setAiLoading(true); setAiAnswer('');
    try {
      const res = await fetch('/api/period-tracker', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ask', question, language, context: aiContext }),
      });
      if (res.ok) { const data = await res.json(); setAiAnswer(data.answer); }
    } catch { /* silent */ }
    finally { setAiLoading(false); }
  };

  const handleDeleteCycle = async (id: string) => {
    if (!window.confirm(t('deleteConfirm', language))) return;
    try {
      await fetch('/api/period-tracker', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      await fetchData();
    } catch { /* silent */ }
  };

  const toggleSymptom = (s: string) => {
    setLogSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const suggestedQuestions = isAlly ? ALLY_QUESTIONS[language] : SELF_QUESTIONS[language];
  const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === language);
  const speechCode = langConfig?.speechCode || 'en-IN';

  const flowOptions = [
    { value: 'light', label: t('flowLight', language), color: 'bg-pink-200' },
    { value: 'medium', label: t('flowMedium', language), color: 'bg-pink-400' },
    { value: 'heavy', label: t('flowHeavy', language), color: 'bg-pink-600' },
  ];

  // ─── Navigation header ───
  const NavHeader = () => (
    <header className="bg-white/80 backdrop-blur-md border-b border-pink-100 px-4 py-4 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/" title="Sehat">
            <SehatOrb size="sm" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{t(isAlly ? 'headerTitleAlly' : 'headerTitle', language)}</h1>
            <p className="text-[10px] text-pink-400">{t(isAlly ? 'headerSubtitleAlly' : 'headerSubtitle', language)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="/history" className="text-xs text-gray-500 hover:text-pink-600 px-2.5 py-1.5 rounded-lg hover:bg-pink-50 transition-colors">{t('history', language)}</Link>
          <Link href="/dashboard" className="text-xs text-gray-500 hover:text-pink-600 px-2.5 py-1.5 rounded-lg hover:bg-pink-50 transition-colors">{t('dashboard', language)}</Link>
        </div>
      </div>
      {/* Language pills — matching main page style with pink theme */}
      <div className="max-w-3xl mx-auto px-4 pt-2 pb-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {SUPPORTED_LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLanguage(l.code)}
            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
              language === l.code
                ? 'bg-pink-500 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-pink-200 hover:text-pink-600'
            }`}
          >
            {l.nativeLabel}
          </button>
        ))}
      </div>
    </header>
  );

  if (loading) {
    return (<div className="min-h-screen bg-gradient-to-b from-pink-50 to-white"><NavHeader /><div className="max-w-3xl mx-auto px-4 py-6 space-y-4">{[...Array(3)].map((_, i) => (<div key={i} className="bg-white rounded-2xl border border-pink-100 p-5 h-24 animate-pulse" />))}</div></div>);
  }

  if (error === 'sign-in') {
    return (<div className="min-h-screen bg-gradient-to-b from-pink-50 to-white"><NavHeader /><div className="flex flex-col items-center justify-center gap-4 p-4 py-20"><div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center"><span className="text-3xl">🌸</span></div><h2 className="text-xl font-bold text-gray-700">{t('signInTitle', language)}</h2><p className="text-gray-400 text-center max-w-sm">{t('signInDesc', language)}</p><Link href="/" className="mt-2 px-6 py-2.5 bg-pink-500 text-white rounded-xl font-medium hover:bg-pink-600 transition-colors">{t('backToSehat', language)}</Link></div></div>);
  }

  if (error) {
    return (<div className="min-h-screen bg-gradient-to-b from-pink-50 to-white"><NavHeader /><div className="flex items-center justify-center py-20"><div className="text-center space-y-3"><p className="text-gray-500">{error}</p><button onClick={() => { setError(null); setLoading(true); fetchData(); }} className="px-4 py-2 bg-pink-500 text-white text-sm rounded-lg hover:bg-pink-600 transition-colors">{t('retry', language)}</button></div></div></div>);
  }

  const daysUntilNext = predictions?.nextPeriodDate
    ? Math.floor((new Date(predictions.nextPeriodDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // ─── AI Q&A Section ───
  const AIQASection = () => (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <h2 className="text-sm font-semibold text-gray-700">{t(isAlly ? 'askTitleAlly' : 'askTitle', language)}</h2>
        <span className="text-[10px] text-pink-400 ml-auto">Powered by Claude</span>
      </div>
      <p className="text-xs text-gray-400">{t(isAlly ? 'askDescAlly' : 'askDesc', language)}</p>
      <div className="flex gap-2">
        <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAskAI()} placeholder={t('askPlaceholder', language)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200" disabled={aiLoading} />
        <button onClick={handleAskAI} disabled={aiLoading || !question.trim()} className="px-4 py-2 bg-pink-500 text-white text-sm rounded-lg font-medium hover:bg-pink-600 transition-colors disabled:opacity-50">{aiLoading ? '...' : t('askBtn', language)}</button>
      </div>
      {!aiAnswer && !aiLoading && (
        <div className="flex flex-wrap gap-1.5">
          {suggestedQuestions.map((q) => (<button key={q} onClick={() => setQuestion(q)} className="text-[11px] text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full hover:bg-pink-100 transition-colors">{q}</button>))}
        </div>
      )}
      {aiLoading && (<div className="flex items-center gap-2 text-sm text-pink-500"><div className="animate-spin w-4 h-4 border-2 border-pink-200 border-t-pink-500 rounded-full" />{t('thinking', language)}</div>)}
      {aiAnswer && (
        <div className="bg-pink-50/50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed animate-fade-in">
          <RenderMarkdown text={aiAnswer} />
          <div className="mt-3 pt-2 border-t border-pink-100 flex items-center gap-2">
            <ReadAloudButton text={aiAnswer} languageCode={speechCode} size="sm" />
            <span className="text-[10px] text-gray-400 italic">{t('aiDisclaimer', language)}</span>
          </div>
        </div>
      )}
    </div>
  );

  const FACT_ICONS = ['📅', '💡', '🛒', '⚕️', '💬'];
  const FACT_KEYS = ['fact1', 'fact2', 'fact3', 'fact4', 'fact5'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <NavHeader />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ════════ ALLY VIEW ════════ */}
        {isAlly && (
          <>
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border border-pink-100 p-6 text-center space-y-3">
              <span className="text-4xl">💪🌸</span>
              <h2 className="text-xl font-bold text-gray-800">{t('allyHeroTitle', language)}</h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">{t('allyHeroDesc', language)}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
              {[
                { tKey: 'eduCard1', icon: '📖' },
                { tKey: 'eduCard2', icon: '🤝' },
                { tKey: 'eduCard3', icon: '🚫' },
                { tKey: 'eduCard4', icon: '🏥' },
              ].map(({ tKey, icon }) => (
                <div key={tKey} className="card-clinical !border-pink-100 p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <h3 className="text-sm font-semibold text-gray-700">{t(`${tKey}Title`, language)}</h3>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{t(`${tKey}Body`, language)}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('quickFacts', language)}</h3>
              <div className="space-y-2.5">
                {FACT_KEYS.map((key, i) => (
                  <div key={key} className="flex items-start gap-2.5">
                    <span className="text-base flex-shrink-0">{FACT_ICONS[i]}</span>
                    <p className="text-xs text-gray-600 leading-relaxed">{t(key, language)}</p>
                  </div>
                ))}
              </div>
            </div>

            <AIQASection />

            <div className="bg-purple-50 rounded-2xl border border-purple-100 p-5 text-center space-y-2">
              <p className="text-sm text-purple-700 font-medium">{t('ctaShare', language)}</p>
              <p className="text-xs text-purple-500">{t('ctaBreak', language)}</p>
            </div>
          </>
        )}

        {/* ════════ TRACKER VIEW ════════ */}
        {!isAlly && (
          <>
            {predictions?.notification && (
              <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
                <span className="text-2xl flex-shrink-0">🔔</span>
                <p className="text-sm font-medium text-pink-800">{predictions.notification}</p>
              </div>
            )}

            {predictions && (
              <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t('cycleOverview', language)}</h2>
                  {cycles.length > 0 && <span className="text-xs text-pink-400">{cycles.length} {t('cyclesLogged', language)}</span>}
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-2xl font-bold text-pink-600">{predictions.avgCycleLength}</p><p className="text-xs text-gray-400">{t('avgCycleDays', language)}</p></div>
                  <div><p className="text-2xl font-bold text-pink-500">{predictions.avgPeriodLength}</p><p className="text-xs text-gray-400">{t('avgPeriodDays', language)}</p></div>
                  <div>
                    {daysUntilNext !== null ? (<><p className={`text-2xl font-bold ${daysUntilNext < 0 ? 'text-orange-500' : daysUntilNext <= 3 ? 'text-pink-600' : 'text-gray-700'}`}>{daysUntilNext < 0 ? Math.abs(daysUntilNext) : daysUntilNext}</p><p className="text-xs text-gray-400">{daysUntilNext < 0 ? t('daysLate', language) : t('daysUntilNext', language)}</p></>) : (<><p className="text-2xl font-bold text-gray-300">--</p><p className="text-xs text-gray-400">{t('nextPeriod', language)}</p></>)}
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setShowLogForm(!showLogForm)} className="w-full py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl shadow-lg shadow-pink-200/50 hover:from-pink-600 hover:to-pink-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <span className="text-lg">+</span>{t('logPeriod', language)}
            </button>

            {showLogForm && (
              <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5 space-y-4 animate-fade-in">
                <h3 className="font-semibold text-gray-700">{t('logYourPeriod', language)}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 mb-1 block">{t('startDate', language)}</label><input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">{t('periodLength', language)}</label><input type="number" value={logPeriodLength} onChange={(e) => setLogPeriodLength(e.target.value)} min="1" max="14" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">{t('flowLevel', language)}</label>
                  <div className="flex gap-2">
                    {flowOptions.map(f => (<button key={f.value} onClick={() => setLogFlow(f.value)} className={`flex-1 py-2 text-sm rounded-lg border transition-all ${logFlow === f.value ? 'border-pink-400 bg-pink-50 text-pink-700 font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}><span className={`inline-block w-2 h-2 rounded-full ${f.color} mr-1`} />{f.label}</button>))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">{t('symptoms', language)}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SYMPTOM_KEYS.map((key, i) => (<button key={key} onClick={() => toggleSymptom(SYMPTOM_EN[i])} className={`px-2.5 py-1 text-xs rounded-full border transition-all ${logSymptoms.includes(SYMPTOM_EN[i]) ? 'border-pink-400 bg-pink-50 text-pink-700 font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{t(key, language)}</button>))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">{t('mood', language)}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MOOD_KEYS.map((key, i) => (<button key={key} onClick={() => setLogMood(logMood === MOOD_EN[i] ? '' : MOOD_EN[i])} className={`px-2.5 py-1 text-xs rounded-full border transition-all ${logMood === MOOD_EN[i] ? 'border-pink-400 bg-pink-50 text-pink-700 font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{t(key, language)}</button>))}
                  </div>
                </div>
                <div><label className="text-xs text-gray-500 mb-1 block">{t('notesOpt', language)}</label><textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" /></div>
                <button onClick={handleLogCycle} disabled={saving} className="w-full py-2.5 bg-pink-500 text-white font-medium rounded-xl hover:bg-pink-600 transition-colors disabled:opacity-50">{saving ? t('saving', language) : t('save', language)}</button>
              </div>
            )}

            <AIQASection />

            {cycles.length > 0 && (
              <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('cycleHistory', language)}</h2>
                <div className="space-y-2">
                  {cycles.slice(0, 12).map((c) => {
                    const startDate = new Date(c.cycle_start);
                    const flowKey = c.flow_level === 'light' ? 'flowLight' : c.flow_level === 'heavy' ? 'flowHeavy' : 'flowMedium';
                    return (
                      <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0"><span className="text-xs font-bold text-pink-600">{startDate.getDate()}</span></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700">{startDate.toLocaleDateString(language === 'en' ? 'en-IN' : `${language}-IN`, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            {c.period_length && <span>{c.period_length} {t('days', language)}</span>}
                            {c.flow_level && <span>{t(flowKey, language)} {t('flow', language)}</span>}
                            {c.cycle_length && <span>{c.cycle_length} {t('dayCycle', language)}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteCycle(c.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0" aria-label="Delete cycle">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {cycles.length === 0 && !showLogForm && (
              <div className="text-center py-8 space-y-3">
                <span className="text-5xl">🌸</span>
                <h3 className="text-lg font-semibold text-gray-700">{t('emptyTitle', language)}</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">{t('emptyDesc', language)}</p>
              </div>
            )}
          </>
        )}

        <p className="text-center text-[10px] text-gray-300 pb-4">{t(isAlly ? 'footerAlly' : 'footerTracker', language)}</p>
      </div>
    </div>
  );
}
