export type Language = 'hi' | 'ta' | 'te' | 'mr' | 'kn' | 'bn' | 'en';

export interface FollowUpOption {
  label: string;
  value: string;
}

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
  followUpOptions?: FollowUpOption[] | null;
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
  follow_up_options?: FollowUpOption[] | null;
  action_plan: ActionPlan;
  disclaimer: string;
}

export interface PatientProfile {
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  pre_existing_conditions?: string[];
  preferred_language?: string | null;
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
  inputMode?: 'text' | 'voice' | 'voice_conversation';
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
  | { type: 'follow_up'; question: string; options?: FollowUpOption[] }
  | { type: 'text'; content: string }
  | { type: 'error'; message: string }
  | { type: 'emergency'; data: EmergencyDetection }
  | { type: 'tool_call'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: Record<string, unknown> }
  | { type: 'early_tts'; content: string };

export interface ToolStep {
  name: string;
  input: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: 'running' | 'done';
}

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
  toolSteps: ToolStep[];
}

export type ConversationAction =
  | { type: 'SET_LANGUAGE'; language: Language }
  | { type: 'USER_MESSAGE'; message: string }
  | { type: 'STREAM_START' }
  | { type: 'STREAM_THINKING'; content: string }
  | { type: 'STREAM_THINKING_DONE' }
  | { type: 'STREAM_RESULT'; data: TriageResult }
  | { type: 'STREAM_FOLLOW_UP'; question: string; options?: FollowUpOption[] }
  | { type: 'STREAM_EMERGENCY'; data: EmergencyDetection }
  | { type: 'STREAM_ERROR'; message: string }
  | { type: 'STREAM_END' }
  | { type: 'STREAM_TOOL_CALL'; name: string; input: Record<string, unknown> }
  | { type: 'STREAM_TOOL_RESULT'; name: string; result: Record<string, unknown> }
  | { type: 'CLIENT_EMERGENCY'; detection: EmergencyDetection }
  | { type: 'RESTORE_SESSION'; sessionId: string; messages: Message[]; result: TriageResult | null; thinkingContent: string; language: Language }
  | { type: 'RESET' };
