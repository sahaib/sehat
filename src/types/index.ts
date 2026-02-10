export type Language = 'hi' | 'ta' | 'te' | 'mr' | 'kn' | 'bn' | 'en';

export type Severity = 'emergency' | 'urgent' | 'routine' | 'self_care';

export type CareLevel = 'home' | 'phc' | 'district_hospital' | 'emergency';

export type Urgency = 'immediate' | 'within_6h' | 'within_24h' | 'within_week' | 'when_convenient';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  language?: Language;
  isFollowUp?: boolean;
}

export interface DoctorSummary {
  english: string;
  local: string;
}

export interface ActionPlan {
  go_to: string;
  care_level: CareLevel;
  urgency: Urgency;
  tell_doctor: DoctorSummary;
  do_not: string[];
  first_aid: string[];
  emergency_numbers?: string[];
}

export interface TriageResult {
  is_medical_query: boolean;
  redirect_message?: string | null;
  severity: Severity;
  confidence: number;
  reasoning_summary: string;
  symptoms_identified: string[];
  red_flags: string[];
  risk_factors: string[];
  needs_follow_up: boolean;
  follow_up_question: string | null;
  action_plan: ActionPlan;
  disclaimer: string;
}

export interface EmergencyDetection {
  isEmergency: boolean;
  matchedKeywords: string[];
  detectedLanguage?: Language;
}

export interface TriageRequest {
  message: string;
  language: Language;
  conversationHistory: Message[];
  sessionId: string;
}

export interface TranscribeResponse {
  text: string;
  language: string;
  confidence: number;
}

export type StreamEvent =
  | { type: 'thinking'; content: string }
  | { type: 'thinking_done' }
  | { type: 'result'; data: TriageResult }
  | { type: 'follow_up'; question: string }
  | { type: 'text'; content: string }
  | { type: 'error'; message: string }
  | { type: 'emergency'; data: EmergencyDetection };

export interface ConversationState {
  sessionId: string;
  messages: Message[];
  currentResult: TriageResult | null;
  thinkingContent: string;
  isThinking: boolean;
  isStreaming: boolean;
  followUpCount: number;
  language: Language;
  isEmergency: boolean;
  emergencyData: EmergencyDetection | null;
  error: string | null;
}

export type ConversationAction =
  | { type: 'SET_LANGUAGE'; language: Language }
  | { type: 'USER_MESSAGE'; message: string }
  | { type: 'STREAM_START' }
  | { type: 'STREAM_THINKING'; content: string }
  | { type: 'STREAM_THINKING_DONE' }
  | { type: 'STREAM_RESULT'; data: TriageResult }
  | { type: 'STREAM_FOLLOW_UP'; question: string }
  | { type: 'STREAM_EMERGENCY'; data: EmergencyDetection }
  | { type: 'STREAM_ERROR'; message: string }
  | { type: 'STREAM_END' }
  | { type: 'CLIENT_EMERGENCY'; detection: EmergencyDetection }
  | { type: 'RESET' };
