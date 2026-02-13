/**
 * Agentic triage tools — Claude Opus 4.6 decides which tools to call
 * during medical triage to enrich its reasoning with patient context,
 * symptom pattern analysis, specialist recommendations, and more.
 *
 * Each tool has:
 *   - An Anthropic tool schema definition
 *   - A handler function that executes the tool and returns structured data
 */

import Anthropic from '@anthropic-ai/sdk';
import { getServiceClient } from './supabase';

// ─── Types ───────────────────────────────────────────

export interface ToolContext {
  clerkUserId: string | null;
  sessionId?: string | null;
  location?: { lat: number; lng: number } | null;
}

type ToolHandler = (
  input: Record<string, unknown>,
  ctx: ToolContext
) => Promise<Record<string, unknown>>;

// ─── Tool Definitions (Anthropic schema) ─────────────

export const TRIAGE_TOOLS: Anthropic.Tool[] = [
  // ── Category 1: Patient Context ──
  {
    name: 'get_patient_history',
    description:
      'Fetch past triage sessions for this patient. Use this when you want to understand if the patient has recurring symptoms, past emergency visits, or a pattern of health issues. Returns previous session summaries including severity, symptoms, and dates.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Max number of past sessions to retrieve (default 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_medication_context',
    description:
      'Check if the patient mentioned medications or ongoing treatments in past triage sessions. Use this when current symptoms might interact with known medications or when the patient mentions taking medicines.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // ── Category 2: Symptom Analysis ──
  {
    name: 'analyze_symptom_patterns',
    description:
      'Analyze frequency and recurrence patterns of symptoms across past sessions. Use this when the patient reports symptoms that might be recurring (headaches, fevers, pain) to detect escalation patterns.',
    input_schema: {
      type: 'object' as const,
      properties: {
        symptoms: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of current symptoms to check for recurrence',
        },
        timeframe_days: {
          type: 'number',
          description: 'Look-back window in days (default 90)',
        },
      },
      required: ['symptoms'],
    },
  },
  {
    name: 'check_symptom_combinations',
    description:
      'Cross-reference a cluster of symptoms against known medical condition patterns. Use this when the patient presents multiple symptoms that together might indicate a specific condition requiring specialist care.',
    input_schema: {
      type: 'object' as const,
      properties: {
        symptoms: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of symptoms to check against known condition clusters',
        },
      },
      required: ['symptoms'],
    },
  },

  // ── Category 3: Specialist Recommendation ──
  {
    name: 'recommend_specialist',
    description:
      'Determine which type of medical specialist the patient should see based on their symptoms and severity. Use this when symptoms point to a specific medical domain (cardiology, neurology, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {
        symptoms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key symptoms for specialist matching',
        },
        severity: {
          type: 'string',
          enum: ['emergency', 'urgent', 'routine', 'self_care'],
          description: 'Current assessed severity',
        },
        age_group: {
          type: 'string',
          enum: ['infant', 'child', 'adolescent', 'adult', 'elderly'],
          description: 'Patient age group if known',
        },
        gender: {
          type: 'string',
          enum: ['male', 'female', 'other'],
          description: 'Patient gender if relevant',
        },
      },
      required: ['symptoms', 'severity'],
    },
  },
  {
    name: 'get_facility_type',
    description:
      'Map a specialist recommendation to the appropriate Indian healthcare facility tier (PHC, CHC, District Hospital, Tertiary). Use this after recommending a specialist to tell the patient WHERE to go.',
    input_schema: {
      type: 'object' as const,
      properties: {
        specialist: {
          type: 'string',
          description: 'Type of specialist needed',
        },
        severity: {
          type: 'string',
          enum: ['emergency', 'urgent', 'routine', 'self_care'],
          description: 'Current severity level',
        },
      },
      required: ['specialist', 'severity'],
    },
  },

  {
    name: 'find_nearby_hospitals',
    description:
      'Find real hospitals and clinics near the patient\'s current location using map data. Use this when recommending a hospital, clinic, or PHC visit — it returns actual facility names, distances, and Google Maps directions. Only call this if the patient\'s location is available (the system will tell you).',
    input_schema: {
      type: 'object' as const,
      properties: {
        care_level: {
          type: 'string',
          enum: ['phc', 'clinic', 'hospital', 'emergency'],
          description: 'Type of facility needed based on triage severity',
        },
        radius_km: {
          type: 'number',
          description: 'Search radius in kilometers (default 10, max 50)',
        },
      },
      required: ['care_level'],
    },
  },

  // ── Category 4: Women's Health ──
  {
    name: 'get_period_health_context',
    description:
      "Check the patient's menstrual cycle data to correlate symptoms with cycle phase. Use this for female patients when symptoms like headache, mood changes, cramps, or bloating might be period-related.",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // ── Category 5: Regional & Seasonal Intelligence ──
  {
    name: 'check_regional_disease_alerts',
    description:
      'Check current seasonal and regional disease patterns in India. Use this when symptoms match monsoon-season diseases (dengue, malaria), summer diseases (heatstroke), or winter respiratory illnesses.',
    input_schema: {
      type: 'object' as const,
      properties: {
        month: {
          type: 'number',
          description: 'Current month (1-12)',
        },
        symptoms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Symptoms to cross-reference with seasonal patterns',
        },
      },
      required: ['month', 'symptoms'],
    },
  },
  {
    name: 'get_indian_health_schemes',
    description:
      'Check applicable Indian government health schemes that might cover the patient\'s treatment. Use this when the care level is district_hospital or emergency to inform the patient about free/subsidized options like Ayushman Bharat.',
    input_schema: {
      type: 'object' as const,
      properties: {
        care_level: {
          type: 'string',
          enum: ['home', 'phc', 'district_hospital', 'emergency'],
          description: 'Required care level',
        },
        condition_type: {
          type: 'string',
          description: 'General category of condition (cardiac, maternal, surgical, general, etc.)',
        },
      },
      required: ['care_level', 'condition_type'],
    },
  },
  {
    name: 'calculate_risk_score',
    description:
      'Compute a weighted risk score (0-100) from all gathered context including current symptoms, past severity history, recurring patterns, age, and comorbidities. Use this to give a quantitative risk assessment.',
    input_schema: {
      type: 'object' as const,
      properties: {
        current_symptoms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Current symptoms',
        },
        past_severity_history: {
          type: 'array',
          items: { type: 'string' },
          description: 'Past severity levels from history (e.g. ["urgent", "routine", "emergency"])',
        },
        recurring_patterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Known recurring symptom patterns',
        },
        age_group: {
          type: 'string',
          enum: ['infant', 'child', 'adolescent', 'adult', 'elderly'],
          description: 'Patient age group',
        },
        comorbidities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Known pre-existing conditions',
        },
      },
      required: ['current_symptoms'],
    },
  },

  // ── Category 6: Action Tools (write data) ──
  {
    name: 'save_clinical_note',
    description:
      'Save a clinical note about this patient (chronic conditions, allergies, family history, medication interactions). This data enriches future triage sessions. Use silently — never tell the patient you are saving.',
    input_schema: {
      type: 'object' as const,
      properties: {
        note_type: {
          type: 'string',
          enum: ['chronic_condition', 'allergy', 'family_history', 'medication', 'observation'],
          description: 'Category of clinical note',
        },
        content: {
          type: 'string',
          description: 'The clinical note content in English',
        },
        severity_context: {
          type: 'string',
          description: 'Current severity context for this note (optional)',
        },
      },
      required: ['note_type', 'content'],
    },
  },
  {
    name: 'schedule_followup_check',
    description:
      'Schedule a follow-up reminder for the patient. Use when the condition warrants checking back (fever monitoring, wound healing, medication response). Use silently.',
    input_schema: {
      type: 'object' as const,
      properties: {
        check_after_hours: {
          type: 'number',
          description: 'Hours after which to check back (e.g., 24, 48, 72)',
        },
        reason: {
          type: 'string',
          description: 'Why the follow-up is needed (in English)',
        },
        escalation_criteria: {
          type: 'string',
          description: 'When the patient should seek immediate care instead of waiting (optional)',
        },
      },
      required: ['check_after_hours', 'reason'],
    },
  },
  {
    name: 'update_risk_profile',
    description:
      'Update the patient risk profile with newly mentioned risk factors, conditions, or medications. Merges with existing profile data. Use when the patient mentions diabetes, hypertension, pregnancy, regular medications, etc. Use silently.',
    input_schema: {
      type: 'object' as const,
      properties: {
        risk_factors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Risk factors to add (e.g., ["smoker", "family history of diabetes"])',
        },
        conditions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Pre-existing conditions (e.g., ["diabetes type 2", "hypertension"])',
        },
        medications: {
          type: 'array',
          items: { type: 'string' },
          description: 'Current medications (e.g., ["metformin", "amlodipine"])',
        },
      },
      required: ['risk_factors'],
    },
  },
];

// ─── Tool Handlers ───────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  get_patient_history: async (input, ctx) => {
    if (!ctx.clerkUserId) {
      return { sessions: [], total_sessions: 0, note: 'Anonymous user — no history available' };
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return { sessions: [], total_sessions: 0, note: 'Database not configured' };
    }

    const limit = typeof input.limit === 'number' ? Math.min(input.limit, 20) : 10;

    const { data, error } = await supabase
      .from('triage_sessions')
      .select('session_id, severity, symptoms, reasoning_summary, is_emergency, created_at')
      .eq('clerk_user_id', ctx.clerkUserId)
      .eq('is_medical_query', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[triage-tools] get_patient_history error:', error.message);
      return { sessions: [], total_sessions: 0, note: 'Failed to retrieve history' };
    }

    const sessions = (data || []).map((s) => ({
      severity: s.severity,
      symptoms: s.symptoms || [],
      reasoning: s.reasoning_summary,
      is_emergency: s.is_emergency,
      date: s.created_at,
    }));

    // Also fetch clinical notes for richer context
    const { data: notes } = await supabase
      .from('clinical_notes')
      .select('note_type, content, severity_context, created_at')
      .eq('clerk_user_id', ctx.clerkUserId)
      .order('created_at', { ascending: false })
      .limit(10);

    const clinicalNotes = (notes || []).map((n) => ({
      type: n.note_type,
      content: n.content,
      severity_context: n.severity_context,
      date: n.created_at,
    }));

    return { sessions, total_sessions: sessions.length, clinical_notes: clinicalNotes };
  },

  get_medication_context: async (_input, ctx) => {
    if (!ctx.clerkUserId) {
      return { mentioned_medications: [], conditions_treated: [], note: 'Anonymous user' };
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return { mentioned_medications: [], conditions_treated: [], note: 'Database not configured' };
    }

    const { data, error } = await supabase
      .from('triage_results')
      .select('result_json')
      .eq('clerk_user_id', ctx.clerkUserId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data) {
      return { mentioned_medications: [], conditions_treated: [] };
    }

    // Scan past results for medication mentions
    const medicationPatterns = /medication|medicine|tablet|capsule|dose|drug|prescribed|taking|दवा|दवाई|गोली|மருந்து|మందు|औषध|ಔಷಧ|ওষুধ/i;
    const medications = new Set<string>();
    const conditions = new Set<string>();

    for (const row of data) {
      const json = row.result_json as Record<string, unknown>;
      const reasoning = typeof json?.reasoning_summary === 'string' ? json.reasoning_summary : '';
      const symptoms = Array.isArray(json?.symptoms_identified) ? json.symptoms_identified : [];

      if (medicationPatterns.test(reasoning)) {
        // Extract simple medication context from reasoning
        const matches = reasoning.match(/(?:taking|prescribed|on)\s+([^,.]+)/gi);
        if (matches) matches.forEach((m: string) => medications.add(m.trim()));
      }

      symptoms.forEach((s: unknown) => {
        if (typeof s === 'string') conditions.add(s);
      });
    }

    return {
      mentioned_medications: Array.from(medications).slice(0, 10),
      conditions_treated: Array.from(conditions).slice(0, 15),
    };
  },

  analyze_symptom_patterns: async (input, ctx) => {
    const symptoms = input.symptoms as string[];
    const timeframeDays = typeof input.timeframe_days === 'number' ? input.timeframe_days : 90;

    if (!ctx.clerkUserId) {
      return {
        recurring: [],
        new_symptoms: symptoms,
        escalation_risk: 'unknown',
        note: 'Anonymous user — no history for pattern analysis',
      };
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return { recurring: [], new_symptoms: symptoms, escalation_risk: 'unknown' };
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeframeDays);

    const { data, error } = await supabase
      .from('triage_sessions')
      .select('symptoms, severity, created_at')
      .eq('clerk_user_id', ctx.clerkUserId)
      .eq('is_medical_query', true)
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false });

    if (error || !data) {
      return { recurring: [], new_symptoms: symptoms, escalation_risk: 'unknown' };
    }

    // Count symptom occurrences
    const symptomCounts = new Map<string, { count: number; severities: string[] }>();
    for (const session of data) {
      const pastSymptoms = Array.isArray(session.symptoms) ? session.symptoms : [];
      for (const ps of pastSymptoms) {
        if (typeof ps !== 'string') continue;
        const key = ps.toLowerCase();
        const entry = symptomCounts.get(key) || { count: 0, severities: [] };
        entry.count++;
        if (session.severity) entry.severities.push(session.severity);
        symptomCounts.set(key, entry);
      }
    }

    // Match current symptoms against historical
    const recurring: { symptom: string; count: number; trend: string }[] = [];
    const newSymptoms: string[] = [];

    for (const symptom of symptoms) {
      const key = symptom.toLowerCase();
      let matched = false;
      for (const [pastKey, entry] of symptomCounts) {
        if (pastKey.includes(key) || key.includes(pastKey)) {
          const trend = entry.severities.includes('emergency') || entry.severities.includes('urgent')
            ? 'escalating'
            : entry.count >= 3
              ? 'recurring'
              : 'stable';
          recurring.push({ symptom, count: entry.count, trend });
          matched = true;
          break;
        }
      }
      if (!matched) newSymptoms.push(symptom);
    }

    const escalationRisk = recurring.some((r) => r.trend === 'escalating')
      ? 'high'
      : recurring.some((r) => r.count >= 3)
        ? 'moderate'
        : 'low';

    return { recurring, new_symptoms: newSymptoms, escalation_risk: escalationRisk };
  },

  check_symptom_combinations: async (input) => {
    const symptoms = (input.symptoms as string[]).map((s) => s.toLowerCase());

    // Static medical knowledge base — symptom clusters
    const SYMPTOM_CLUSTERS = [
      {
        name: 'Dengue / Viral Hemorrhagic Fever',
        keywords: ['fever', 'headache', 'body ache', 'joint pain', 'rash', 'muscle pain', 'fatigue', 'nausea', 'bleeding'],
        min_match: 3,
        severity_hint: 'urgent',
        specialist: 'Internal Medicine / Infectious Disease',
      },
      {
        name: 'Chikungunya',
        keywords: ['fever', 'joint pain', 'swelling', 'rash', 'muscle pain', 'headache'],
        min_match: 3,
        severity_hint: 'urgent',
        specialist: 'Internal Medicine / Rheumatology',
      },
      {
        name: 'Malaria',
        keywords: ['fever', 'chills', 'sweating', 'headache', 'nausea', 'vomiting', 'body ache', 'fatigue'],
        min_match: 3,
        severity_hint: 'urgent',
        specialist: 'Internal Medicine',
      },
      {
        name: 'Typhoid',
        keywords: ['fever', 'headache', 'abdominal pain', 'weakness', 'poor appetite', 'diarrhea', 'constipation'],
        min_match: 3,
        severity_hint: 'urgent',
        specialist: 'Internal Medicine',
      },
      {
        name: 'Cardiac Event (MI / Angina)',
        keywords: ['chest pain', 'chest pressure', 'arm pain', 'jaw pain', 'shortness of breath', 'sweating', 'nausea', 'dizziness'],
        min_match: 2,
        severity_hint: 'emergency',
        specialist: 'Cardiology',
      },
      {
        name: 'Stroke (CVA)',
        keywords: ['facial drooping', 'arm weakness', 'speech difficulty', 'sudden headache', 'vision loss', 'confusion', 'numbness'],
        min_match: 2,
        severity_hint: 'emergency',
        specialist: 'Neurology / Emergency',
      },
      {
        name: 'Meningitis',
        keywords: ['fever', 'headache', 'stiff neck', 'neck pain', 'sensitivity to light', 'confusion', 'vomiting', 'rash'],
        min_match: 3,
        severity_hint: 'emergency',
        specialist: 'Neurology / Infectious Disease',
      },
      {
        name: 'Pneumonia',
        keywords: ['cough', 'fever', 'shortness of breath', 'chest pain', 'phlegm', 'fatigue', 'chills'],
        min_match: 3,
        severity_hint: 'urgent',
        specialist: 'Pulmonology',
      },
      {
        name: 'Urinary Tract Infection',
        keywords: ['burning urination', 'frequent urination', 'lower abdominal pain', 'cloudy urine', 'fever', 'back pain'],
        min_match: 2,
        severity_hint: 'routine',
        specialist: 'Urology / General Medicine',
      },
      {
        name: 'Migraine',
        keywords: ['headache', 'one-sided headache', 'nausea', 'sensitivity to light', 'sensitivity to sound', 'visual disturbance', 'aura'],
        min_match: 2,
        severity_hint: 'routine',
        specialist: 'Neurology',
      },
      {
        name: 'Gastroenteritis',
        keywords: ['vomiting', 'diarrhea', 'nausea', 'abdominal pain', 'stomach cramps', 'fever', 'dehydration'],
        min_match: 3,
        severity_hint: 'routine',
        specialist: 'Gastroenterology / General Medicine',
      },
      {
        name: 'Appendicitis',
        keywords: ['abdominal pain', 'right lower abdomen', 'nausea', 'vomiting', 'fever', 'loss of appetite'],
        min_match: 3,
        severity_hint: 'urgent',
        specialist: 'Surgery',
      },
      {
        name: 'Anemia',
        keywords: ['fatigue', 'weakness', 'pale skin', 'dizziness', 'shortness of breath', 'cold hands', 'headache'],
        min_match: 3,
        severity_hint: 'routine',
        specialist: 'Hematology / General Medicine',
      },
      {
        name: 'Thyroid Disorder',
        keywords: ['fatigue', 'weight change', 'hair loss', 'cold intolerance', 'heat intolerance', 'mood changes', 'swelling neck'],
        min_match: 3,
        severity_hint: 'routine',
        specialist: 'Endocrinology',
      },
      {
        name: 'Diabetic Emergency (DKA / Hypoglycemia)',
        keywords: ['confusion', 'fruity breath', 'rapid breathing', 'excessive thirst', 'frequent urination', 'nausea', 'shakiness', 'sweating'],
        min_match: 3,
        severity_hint: 'emergency',
        specialist: 'Endocrinology / Emergency',
      },
      {
        name: 'Tuberculosis',
        keywords: ['cough', 'persistent cough', 'blood in sputum', 'weight loss', 'night sweats', 'fever', 'fatigue', 'chest pain'],
        min_match: 3,
        severity_hint: 'urgent',
        specialist: 'Pulmonology / TB Specialist',
      },
    ];

    const matches: {
      name: string;
      matching_symptoms: string[];
      severity_hint: string;
      specialist: string;
    }[] = [];

    for (const cluster of SYMPTOM_CLUSTERS) {
      const matchingSymptoms = cluster.keywords.filter((keyword) =>
        symptoms.some((s) => s.includes(keyword) || keyword.includes(s))
      );
      if (matchingSymptoms.length >= cluster.min_match) {
        matches.push({
          name: cluster.name,
          matching_symptoms: matchingSymptoms,
          severity_hint: cluster.severity_hint,
          specialist: cluster.specialist,
        });
      }
    }

    return { possible_clusters: matches };
  },

  recommend_specialist: async (input) => {
    const symptoms = (input.symptoms as string[]).map((s) => s.toLowerCase());
    const severity = input.severity as string;

    // Symptom → specialist mapping
    const SPECIALIST_MAP: {
      keywords: string[];
      specialist: string;
      reasoning: string;
      typical_tests: string[];
    }[] = [
      {
        keywords: ['chest pain', 'heart', 'palpitations', 'cardiac', 'bp', 'blood pressure'],
        specialist: 'Cardiologist',
        reasoning: 'Cardiac symptoms require specialized cardiovascular evaluation',
        typical_tests: ['ECG', 'Echocardiogram', 'Cardiac enzymes (Troponin)', 'Lipid profile'],
      },
      {
        keywords: ['headache', 'migraine', 'seizure', 'dizziness', 'numbness', 'vision', 'tingling', 'paralysis'],
        specialist: 'Neurologist',
        reasoning: 'Neurological symptoms need specialized nerve/brain assessment',
        typical_tests: ['CT Head', 'MRI Brain', 'EEG', 'Nerve conduction study'],
      },
      {
        keywords: ['breathing', 'cough', 'asthma', 'wheeze', 'respiratory', 'lung', 'sputum'],
        specialist: 'Pulmonologist',
        reasoning: 'Respiratory symptoms require lung function evaluation',
        typical_tests: ['Chest X-ray', 'Pulmonary function test', 'Sputum culture', 'CT Chest'],
      },
      {
        keywords: ['abdominal', 'stomach', 'vomiting', 'diarrhea', 'gastric', 'acid', 'digestion', 'liver'],
        specialist: 'Gastroenterologist',
        reasoning: 'GI symptoms need digestive system evaluation',
        typical_tests: ['Ultrasound abdomen', 'Liver function test', 'Stool examination', 'Endoscopy'],
      },
      {
        keywords: ['joint', 'arthritis', 'bone', 'fracture', 'back pain', 'spine', 'muscle pain'],
        specialist: 'Orthopedic / Rheumatologist',
        reasoning: 'Musculoskeletal symptoms need bone/joint specialist evaluation',
        typical_tests: ['X-ray', 'MRI', 'ESR / CRP', 'Rheumatoid factor', 'Uric acid'],
      },
      {
        keywords: ['skin', 'rash', 'itching', 'allergy', 'hives', 'eczema', 'acne'],
        specialist: 'Dermatologist',
        reasoning: 'Skin conditions need dermatological evaluation',
        typical_tests: ['Skin biopsy', 'Allergy test (IgE)', 'Patch test', 'KOH mount'],
      },
      {
        keywords: ['urination', 'kidney', 'urine', 'bladder', 'prostate'],
        specialist: 'Urologist / Nephrologist',
        reasoning: 'Urinary/kidney symptoms need specialized evaluation',
        typical_tests: ['Urine analysis', 'Kidney function test', 'Ultrasound KUB', 'Urine culture'],
      },
      {
        keywords: ['pregnancy', 'menstrual', 'period', 'vaginal', 'gynec', 'breast'],
        specialist: 'Gynecologist / Obstetrician',
        reasoning: "Women's health issues need specialized reproductive care",
        typical_tests: ['Ultrasound pelvis', 'Blood test (HCG)', 'Pap smear', 'Hormonal panel'],
      },
      {
        keywords: ['eye', 'vision', 'blurry', 'eye pain', 'red eye'],
        specialist: 'Ophthalmologist',
        reasoning: 'Eye symptoms need specialized ophthalmic evaluation',
        typical_tests: ['Visual acuity test', 'Fundoscopy', 'Slit lamp exam', 'Intraocular pressure'],
      },
      {
        keywords: ['ear', 'hearing', 'throat', 'tonsil', 'sinus', 'nose', 'snoring'],
        specialist: 'ENT Specialist',
        reasoning: 'Ear/nose/throat symptoms need specialized evaluation',
        typical_tests: ['Audiometry', 'Nasal endoscopy', 'X-ray PNS', 'Throat culture'],
      },
      {
        keywords: ['diabetes', 'thyroid', 'hormonal', 'weight gain', 'weight loss'],
        specialist: 'Endocrinologist',
        reasoning: 'Metabolic/hormonal symptoms need endocrine evaluation',
        typical_tests: ['Blood sugar (fasting/PP)', 'HbA1c', 'Thyroid function test', 'Hormonal panel'],
      },
      {
        keywords: ['anxiety', 'depression', 'panic', 'insomnia', 'mental health', 'stress', 'suicidal'],
        specialist: 'Psychiatrist / Clinical Psychologist',
        reasoning: 'Mental health concerns need specialized psychological assessment',
        typical_tests: ['Psychological assessment', 'Depression screening (PHQ-9)', 'Anxiety screening (GAD-7)'],
      },
      {
        keywords: ['child', 'infant', 'baby', 'pediatric', 'vaccination'],
        specialist: 'Pediatrician',
        reasoning: 'Child health issues need pediatric specialist care',
        typical_tests: ['Growth assessment', 'Blood test (CBC)', 'Developmental screening'],
      },
    ];

    let bestMatch = {
      specialist: 'General Physician',
      reasoning: 'General evaluation recommended as starting point',
      typical_tests: ['Complete Blood Count (CBC)', 'Basic metabolic panel', 'Urinalysis'],
      urgency: severity === 'emergency' ? 'immediate' : severity === 'urgent' ? 'within_24h' : 'within_week',
    };

    let maxMatchScore = 0;
    for (const spec of SPECIALIST_MAP) {
      const matchScore = spec.keywords.filter((k) =>
        symptoms.some((s) => s.includes(k) || k.includes(s))
      ).length;
      if (matchScore > maxMatchScore) {
        maxMatchScore = matchScore;
        bestMatch = {
          specialist: spec.specialist,
          reasoning: spec.reasoning,
          typical_tests: spec.typical_tests,
          urgency: severity === 'emergency' ? 'immediate' : severity === 'urgent' ? 'within_24h' : 'within_week',
        };
      }
    }

    return bestMatch;
  },

  get_facility_type: async (input) => {
    const specialist = (input.specialist as string).toLowerCase();
    const severity = input.severity as string;

    // Specialist availability across Indian healthcare tiers
    const FACILITY_MAP: Record<string, {
      facility_level: string;
      available_at: string;
      alternative_if_unavailable: string;
    }> = {
      'general physician': {
        facility_level: 'PHC',
        available_at: 'Primary Health Centre (PHC) or above',
        alternative_if_unavailable: 'Any pharmacy with a licensed medical practitioner',
      },
      'cardiologist': {
        facility_level: 'District Hospital',
        available_at: 'District Hospital or Tertiary Care Centre',
        alternative_if_unavailable: 'General physician at CHC with ECG facility',
      },
      'neurologist': {
        facility_level: 'District Hospital',
        available_at: 'District Hospital or Medical College Hospital',
        alternative_if_unavailable: 'General physician at CHC — refer to district if needed',
      },
      'pulmonologist': {
        facility_level: 'District Hospital',
        available_at: 'District Hospital or Chest Hospital',
        alternative_if_unavailable: 'General physician at CHC with chest X-ray facility',
      },
      'gastroenterologist': {
        facility_level: 'District Hospital',
        available_at: 'District Hospital or Tertiary Care Centre',
        alternative_if_unavailable: 'General physician at CHC with ultrasound facility',
      },
      'orthopedic': {
        facility_level: 'CHC',
        available_at: 'Community Health Centre (CHC) or District Hospital',
        alternative_if_unavailable: 'PHC for first aid, then refer to CHC',
      },
      'dermatologist': {
        facility_level: 'District Hospital',
        available_at: 'District Hospital or urban clinic',
        alternative_if_unavailable: 'General physician at PHC for common skin conditions',
      },
      'gynecologist': {
        facility_level: 'CHC',
        available_at: 'Community Health Centre (CHC) or above — JSSK covers delivery',
        alternative_if_unavailable: 'ANM/ASHA worker for basic guidance, refer to CHC',
      },
      'pediatrician': {
        facility_level: 'CHC',
        available_at: 'Community Health Centre (CHC) or District Hospital',
        alternative_if_unavailable: 'PHC medical officer with pediatric training',
      },
      'psychiatrist': {
        facility_level: 'District Hospital',
        available_at: 'District Mental Health Programme (DMHP) centre or tertiary hospital',
        alternative_if_unavailable: 'Tele-MANAS helpline: 14416 or 1800-891-4416',
      },
      'ent specialist': {
        facility_level: 'District Hospital',
        available_at: 'District Hospital or above',
        alternative_if_unavailable: 'General physician at CHC',
      },
      'ophthalmologist': {
        facility_level: 'District Hospital',
        available_at: 'District Hospital or Vision Centre',
        alternative_if_unavailable: 'NPCB eye camp or mobile vision screening',
      },
      'endocrinologist': {
        facility_level: 'Tertiary',
        available_at: 'Medical College Hospital or Tertiary Centre',
        alternative_if_unavailable: 'General physician at District Hospital for diabetes/thyroid management',
      },
      'urologist': {
        facility_level: 'District Hospital',
        available_at: 'District Hospital or Tertiary Centre',
        alternative_if_unavailable: 'General physician at CHC for initial evaluation',
      },
    };

    // Find the best matching facility
    let match = FACILITY_MAP['general physician'];
    for (const [key, value] of Object.entries(FACILITY_MAP)) {
      if (specialist.includes(key) || key.includes(specialist)) {
        match = value;
        break;
      }
    }

    // Override for emergency — always tertiary
    if (severity === 'emergency') {
      return {
        facility_level: 'Tertiary / Emergency',
        available_at: 'Nearest hospital with emergency department — call 108 ambulance',
        alternative_if_unavailable: 'Any nearby hospital, then transfer. Call 112 for help.',
      };
    }

    return match;
  },

  get_period_health_context: async (_input, ctx) => {
    if (!ctx.clerkUserId) {
      return {
        cycle_day: null,
        phase: null,
        recent_symptoms: [],
        is_period_related: false,
        note: 'Anonymous user — no period data available',
      };
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return { cycle_day: null, phase: null, recent_symptoms: [], is_period_related: false };
    }

    const { data, error } = await supabase
      .from('period_cycles')
      .select('cycle_start, cycle_length, period_length, symptoms, flow_level')
      .eq('clerk_user_id', ctx.clerkUserId)
      .order('cycle_start', { ascending: false })
      .limit(3);

    if (error || !data || data.length === 0) {
      return {
        cycle_day: null,
        phase: null,
        recent_symptoms: [],
        is_period_related: false,
        note: 'No period tracking data found for this user',
      };
    }

    const latest = data[0];
    const cycleStart = new Date(latest.cycle_start);
    const today = new Date();
    const daysSinceStart = Math.floor((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    const cycleLength = latest.cycle_length || 28;
    const periodLength = latest.period_length || 5;

    const cycleDay = daysSinceStart <= cycleLength ? daysSinceStart + 1 : null;

    let phase = 'unknown';
    if (cycleDay) {
      if (cycleDay <= periodLength) phase = 'menstrual';
      else if (cycleDay <= 13) phase = 'follicular';
      else if (cycleDay <= 16) phase = 'ovulation';
      else phase = 'luteal';
    }

    // Collect symptoms from recent cycles
    const recentSymptoms = data
      .flatMap((c) => (Array.isArray(c.symptoms) ? c.symptoms : []))
      .filter((s, i, arr) => typeof s === 'string' && arr.indexOf(s) === i)
      .slice(0, 10);

    return {
      cycle_day: cycleDay,
      phase,
      recent_symptoms: recentSymptoms,
      is_period_related: phase === 'menstrual' || phase === 'luteal',
    };
  },

  check_regional_disease_alerts: async (input) => {
    const month = input.month as number;
    const symptoms = (input.symptoms as string[]).map((s) => s.toLowerCase());

    // India seasonal disease calendar
    const SEASONAL_DISEASES = [
      {
        disease: 'Dengue',
        peak_months: [7, 8, 9, 10, 11], // Jul-Nov (monsoon + post-monsoon)
        symptoms: ['fever', 'headache', 'joint pain', 'body ache', 'rash', 'muscle pain', 'fatigue', 'nausea', 'bleeding'],
        risk_level_in_season: 'high',
        risk_level_off_season: 'low',
      },
      {
        disease: 'Malaria',
        peak_months: [6, 7, 8, 9, 10], // Jun-Oct (monsoon)
        symptoms: ['fever', 'chills', 'sweating', 'headache', 'nausea', 'body ache'],
        risk_level_in_season: 'high',
        risk_level_off_season: 'low',
      },
      {
        disease: 'Chikungunya',
        peak_months: [7, 8, 9, 10], // Jul-Oct
        symptoms: ['fever', 'joint pain', 'swelling', 'rash', 'muscle pain'],
        risk_level_in_season: 'moderate',
        risk_level_off_season: 'low',
      },
      {
        disease: 'Leptospirosis',
        peak_months: [7, 8, 9, 10, 11], // Monsoon/floods
        symptoms: ['fever', 'muscle pain', 'jaundice', 'headache', 'red eyes', 'vomiting'],
        risk_level_in_season: 'moderate',
        risk_level_off_season: 'low',
      },
      {
        disease: 'Influenza / Viral Fever',
        peak_months: [11, 12, 1, 2, 3], // Nov-Mar (winter)
        symptoms: ['fever', 'cough', 'cold', 'body ache', 'sore throat', 'fatigue', 'runny nose'],
        risk_level_in_season: 'high',
        risk_level_off_season: 'moderate',
      },
      {
        disease: 'Heat Stroke / Heat Exhaustion',
        peak_months: [4, 5, 6], // Apr-Jun (summer)
        symptoms: ['headache', 'dizziness', 'nausea', 'confusion', 'hot skin', 'no sweating', 'rapid pulse'],
        risk_level_in_season: 'high',
        risk_level_off_season: 'low',
      },
      {
        disease: 'Japanese Encephalitis',
        peak_months: [6, 7, 8, 9, 10], // Monsoon
        symptoms: ['fever', 'headache', 'confusion', 'seizures', 'neck stiffness'],
        risk_level_in_season: 'moderate',
        risk_level_off_season: 'low',
      },
      {
        disease: 'Typhoid',
        peak_months: [6, 7, 8, 9], // Monsoon — contaminated water
        symptoms: ['fever', 'headache', 'abdominal pain', 'weakness', 'diarrhea', 'constipation'],
        risk_level_in_season: 'high',
        risk_level_off_season: 'moderate',
      },
      {
        disease: 'Respiratory Infections (Pneumonia, Bronchitis)',
        peak_months: [11, 12, 1, 2], // Winter + post-Diwali air pollution
        symptoms: ['cough', 'fever', 'breathing difficulty', 'chest pain', 'phlegm', 'wheezing'],
        risk_level_in_season: 'high',
        risk_level_off_season: 'moderate',
      },
      {
        disease: 'Scrub Typhus',
        peak_months: [9, 10, 11], // Post-monsoon
        symptoms: ['fever', 'headache', 'rash', 'muscle pain', 'eschar', 'lymph node swelling'],
        risk_level_in_season: 'moderate',
        risk_level_off_season: 'low',
      },
    ];

    const alerts: {
      disease: string;
      season: string;
      matching_symptoms: string[];
      risk_level: string;
    }[] = [];

    for (const disease of SEASONAL_DISEASES) {
      const matchingSymptoms = disease.symptoms.filter((ds) =>
        symptoms.some((s) => s.includes(ds) || ds.includes(s))
      );

      if (matchingSymptoms.length >= 2) {
        const inSeason = disease.peak_months.includes(month);
        alerts.push({
          disease: disease.disease,
          season: inSeason ? 'Currently in peak season' : 'Off-season (lower probability)',
          matching_symptoms: matchingSymptoms,
          risk_level: inSeason ? disease.risk_level_in_season : disease.risk_level_off_season,
        });
      }
    }

    // Sort by risk level
    const riskOrder: Record<string, number> = { high: 3, moderate: 2, low: 1 };
    alerts.sort((a, b) => (riskOrder[b.risk_level] || 0) - (riskOrder[a.risk_level] || 0));

    return { active_alerts: alerts, month, season_context: getSeasonName(month) };
  },

  get_indian_health_schemes: async (input) => {
    const careLevel = input.care_level as string;
    const conditionType = (input.condition_type as string).toLowerCase();

    const SCHEMES = [
      {
        name: 'Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)',
        coverage: 'Up to Rs 5 lakh per family per year for secondary and tertiary hospitalization',
        eligibility: 'Bottom 40% of population (based on SECC 2011 data). No age limit. Pre-existing conditions covered from day one.',
        how_to_access: 'Visit any empaneled hospital with Aadhaar card. Check eligibility at mera.pmjay.gov.in or call 14555. No enrollment fee.',
        applicable_care_levels: ['district_hospital', 'emergency'],
        condition_types: ['all'],
      },
      {
        name: 'Janani Suraksha Yojana (JSY)',
        coverage: 'Cash assistance for institutional delivery: Rs 1400 (rural) / Rs 1000 (urban)',
        eligibility: 'All pregnant women from BPL families. SC/ST women in all categories.',
        how_to_access: 'Register with ANM/ASHA worker during pregnancy. Benefit given at government hospital after delivery.',
        applicable_care_levels: ['phc', 'district_hospital', 'emergency'],
        condition_types: ['maternal', 'pregnancy', 'delivery'],
      },
      {
        name: 'Janani Shishu Suraksha Karyakram (JSSK)',
        coverage: 'Completely free: delivery, C-section, drugs, diagnostics, blood, diet, transport (home to facility and back)',
        eligibility: 'All pregnant women and sick newborns (up to 30 days) at public health facilities',
        how_to_access: 'Go to any government hospital. No payment required. Free ambulance: call 102 or 108.',
        applicable_care_levels: ['phc', 'district_hospital', 'emergency'],
        condition_types: ['maternal', 'pregnancy', 'delivery', 'neonatal', 'infant'],
      },
      {
        name: 'Rashtriya Bal Swasthya Karyakram (RBSK)',
        coverage: 'Free screening and management of 4Ds: Defects, Deficiencies, Diseases, Development delays in children 0-18 years',
        eligibility: 'All children 0-18 years',
        how_to_access: 'Mobile health teams visit Anganwadi centres and schools. District Early Intervention Centre for referrals.',
        applicable_care_levels: ['phc', 'district_hospital'],
        condition_types: ['pediatric', 'child', 'developmental'],
      },
      {
        name: 'National Programme for Prevention and Control of Cancer, Diabetes, CVD and Stroke (NPCDCS)',
        coverage: 'Free screening, diagnosis, and treatment at NCD clinics in district hospitals',
        eligibility: 'All citizens above 30 years for screening. Treatment at government NCD clinics.',
        how_to_access: 'Visit NCD clinic at district hospital. Population-based screening at PHC/CHC.',
        applicable_care_levels: ['phc', 'district_hospital', 'emergency'],
        condition_types: ['cardiac', 'diabetes', 'cancer', 'stroke', 'hypertension'],
      },
      {
        name: 'National Mental Health Programme (NMHP) / District Mental Health Programme',
        coverage: 'Free psychiatric OPD, medicines, and counseling at district hospitals',
        eligibility: 'All citizens. No income criteria.',
        how_to_access: 'Visit DMHP clinic at district hospital. Tele-MANAS helpline: 14416 / 1800-891-4416.',
        applicable_care_levels: ['district_hospital'],
        condition_types: ['mental health', 'psychiatric', 'depression', 'anxiety'],
      },
      {
        name: 'National Tuberculosis Elimination Programme (NTEP)',
        coverage: 'Free TB diagnosis (CBNAAT/TrueNat), treatment (entire course), nutritional support (Rs 500/month via Nikshay Poshan Yojana)',
        eligibility: 'All TB patients. No income criteria.',
        how_to_access: 'Visit nearest government health facility. Free testing and treatment. Register on Nikshay portal.',
        applicable_care_levels: ['phc', 'district_hospital'],
        condition_types: ['tuberculosis', 'tb', 'respiratory', 'cough'],
      },
      {
        name: 'Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA)',
        coverage: 'Free antenatal checkup on 9th of every month at government facilities',
        eligibility: 'All pregnant women (2nd and 3rd trimester)',
        how_to_access: 'Visit PHC/CHC/District Hospital on the 9th of any month. No appointment needed.',
        applicable_care_levels: ['phc', 'district_hospital'],
        condition_types: ['maternal', 'pregnancy'],
      },
    ];

    const applicable = SCHEMES.filter((scheme) => {
      const careLevelMatch = scheme.applicable_care_levels.includes(careLevel);
      const conditionMatch = scheme.condition_types.includes('all') ||
        scheme.condition_types.some((ct) => conditionType.includes(ct) || ct.includes(conditionType));
      return careLevelMatch && conditionMatch;
    });

    return {
      applicable_schemes: applicable.map(({ name, coverage, eligibility, how_to_access }) => ({
        name,
        coverage,
        eligibility,
        how_to_access,
      })),
    };
  },

  calculate_risk_score: async (input) => {
    const currentSymptoms = (input.current_symptoms as string[]) || [];
    const pastHistory = (input.past_severity_history as string[]) || [];
    const recurringPatterns = (input.recurring_patterns as string[]) || [];
    const ageGroup = (input.age_group as string) || 'adult';
    const comorbidities = (input.comorbidities as string[]) || [];

    let score = 0;
    const riskFactors: string[] = [];

    // Base score from symptom count (0-20)
    score += Math.min(currentSymptoms.length * 5, 20);
    if (currentSymptoms.length >= 4) {
      riskFactors.push(`Multiple concurrent symptoms (${currentSymptoms.length})`);
    }

    // Past severity history (0-25)
    const severityScores: Record<string, number> = { emergency: 15, urgent: 10, routine: 5, self_care: 2 };
    for (const sev of pastHistory) {
      score += severityScores[sev] || 0;
    }
    score = Math.min(score, 45); // Cap past history contribution
    if (pastHistory.includes('emergency')) {
      riskFactors.push('Previous emergency-level triage in history');
    }

    // Recurring patterns (0-20)
    score += Math.min(recurringPatterns.length * 7, 20);
    if (recurringPatterns.length >= 2) {
      riskFactors.push(`${recurringPatterns.length} recurring symptom patterns detected`);
    }

    // Age factor (0-15)
    const ageRisk: Record<string, number> = { infant: 15, child: 10, elderly: 12, adolescent: 3, adult: 0 };
    const ageScore = ageRisk[ageGroup] || 0;
    score += ageScore;
    if (ageScore >= 10) {
      riskFactors.push(`Age group (${ageGroup}) increases vulnerability`);
    }

    // Comorbidities (0-20)
    score += Math.min(comorbidities.length * 8, 20);
    if (comorbidities.length > 0) {
      riskFactors.push(`Pre-existing conditions: ${comorbidities.join(', ')}`);
    }

    // Cap at 100
    score = Math.min(Math.round(score), 100);

    let recommendation: string;
    if (score >= 70) recommendation = 'High risk — recommend immediate or urgent medical evaluation';
    else if (score >= 40) recommendation = 'Moderate risk — recommend medical consultation within 24-48 hours';
    else if (score >= 20) recommendation = 'Low-moderate risk — routine follow-up recommended';
    else recommendation = 'Low risk — home monitoring with clear return-to-care criteria';

    return { risk_score: score, risk_factors: riskFactors, recommendation };
  },

  find_nearby_hospitals: async (input, ctx) => {
    if (!ctx.location) {
      return {
        hospitals: [],
        note: 'Location not available. Recommend patient search Google Maps for nearest hospital.',
        fallback_url: 'https://www.google.com/maps/search/hospital+near+me',
      };
    }

    const { lat, lng } = ctx.location;
    const careLevel = (input.care_level as string) || 'hospital';
    const radiusKm = Math.min(typeof input.radius_km === 'number' ? input.radius_km : 10, 50);
    const radiusMeters = radiusKm * 1000;

    // Map care_level to OSM amenity tags
    const amenityFilter = careLevel === 'phc' || careLevel === 'clinic'
      ? '["amenity"~"clinic|doctors"]'
      : '["amenity"~"hospital|clinic"]';

    const query = `[out:json][timeout:10];(node${amenityFilter}(around:${radiusMeters},${lat},${lng});way${amenityFilter}(around:${radiusMeters},${lat},${lng}););out center body 20;`;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`Overpass API returned ${response.status}`);
      }

      const data = await response.json();
      const elements = (data.elements || []) as Array<Record<string, unknown>>;

      const hospitals = elements
        .map((el) => {
          const elLat = (el.lat as number) ?? (el.center as Record<string, number>)?.lat;
          const elLng = (el.lon as number) ?? (el.center as Record<string, number>)?.lon;
          const tags = (el.tags || {}) as Record<string, string>;
          const name = tags.name || tags['name:en'] || 'Unnamed facility';

          if (!elLat || !elLng) return null;

          const distance = haversineDistance(lat, lng, elLat, elLng);
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${elLat},${elLng}`;

          return {
            name,
            distance_km: Math.round(distance * 10) / 10,
            type: tags.amenity === 'clinic' || tags.amenity === 'doctors' ? 'clinic' : 'hospital',
            address: tags['addr:full'] || tags['addr:street'] || undefined,
            phone: tags.phone || tags['contact:phone'] || undefined,
            maps_url: mapsUrl,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (a as { distance_km: number }).distance_km - (b as { distance_km: number }).distance_km)
        .slice(0, 5);

      if (hospitals.length === 0) {
        return {
          hospitals: [],
          note: 'No facilities found nearby via map data.',
          fallback_url: `https://www.google.com/maps/search/${encodeURIComponent(
            careLevel === 'phc' || careLevel === 'clinic' ? 'clinic near me' : 'hospital near me'
          )}/@${lat},${lng},13z`,
        };
      }

      return { hospitals, total_found: elements.length };
    } catch (error) {
      console.error('[triage-tools] find_nearby_hospitals error:', error);
      return {
        hospitals: [],
        note: 'Could not fetch nearby facilities. Use the link below to search.',
        fallback_url: `https://www.google.com/maps/search/${encodeURIComponent(
          careLevel === 'phc' || careLevel === 'clinic' ? 'clinic near me' : 'hospital near me'
        )}/@${lat},${lng},13z`,
      };
    }
  },

  // ── Action Tools (write data) ──

  save_clinical_note: async (input, ctx) => {
    if (!ctx.clerkUserId) {
      return { saved: false, note: 'Anonymous user — note not saved. Triage continues normally.' };
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return { saved: false, note: 'Database not configured' };
    }

    const noteType = input.note_type as string;
    const content = input.content as string;
    const severityContext = typeof input.severity_context === 'string' ? input.severity_context : null;

    const { error } = await supabase.from('clinical_notes').insert({
      clerk_user_id: ctx.clerkUserId,
      note_type: noteType,
      content,
      severity_context: severityContext,
      session_id: ctx.sessionId || null,
    });

    if (error) {
      console.error('[triage-tools] save_clinical_note error:', error.message);
      return { saved: false, note: 'Failed to save note' };
    }

    return { saved: true, note_type: noteType };
  },

  schedule_followup_check: async (input, ctx) => {
    if (!ctx.clerkUserId) {
      return { scheduled: false, note: 'Anonymous user — reminder not saved. Triage continues normally.' };
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return { scheduled: false, note: 'Database not configured' };
    }

    const checkAfterHours = typeof input.check_after_hours === 'number' ? input.check_after_hours : 24;
    const reason = input.reason as string;
    const escalationCriteria = typeof input.escalation_criteria === 'string' ? input.escalation_criteria : null;

    const checkAt = new Date();
    checkAt.setHours(checkAt.getHours() + checkAfterHours);

    const { error } = await supabase.from('followup_checks').insert({
      clerk_user_id: ctx.clerkUserId,
      session_id: ctx.sessionId || null,
      check_at: checkAt.toISOString(),
      reason,
      escalation_criteria: escalationCriteria,
      status: 'pending',
    });

    if (error) {
      console.error('[triage-tools] schedule_followup_check error:', error.message);
      return { scheduled: false, note: 'Failed to schedule reminder' };
    }

    return { scheduled: true, check_at: checkAt.toISOString(), reason };
  },

  update_risk_profile: async (input, ctx) => {
    if (!ctx.clerkUserId) {
      return { updated: false, note: 'Anonymous user — profile not updated. Triage continues normally.' };
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return { updated: false, note: 'Database not configured' };
    }

    const riskFactors = Array.isArray(input.risk_factors) ? input.risk_factors.filter((s): s is string => typeof s === 'string') : [];
    const conditions = Array.isArray(input.conditions) ? input.conditions.filter((s): s is string => typeof s === 'string') : [];
    const medications = Array.isArray(input.medications) ? input.medications.filter((s): s is string => typeof s === 'string') : [];

    // Fetch existing profile to merge
    const { data: existing } = await supabase
      .from('profiles')
      .select('pre_existing_conditions')
      .eq('clerk_user_id', ctx.clerkUserId)
      .single();

    const existingConditions = Array.isArray(existing?.pre_existing_conditions) ? existing.pre_existing_conditions : [];
    const mergedConditions = Array.from(new Set([...existingConditions, ...conditions, ...medications]));

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          clerk_user_id: ctx.clerkUserId,
          pre_existing_conditions: mergedConditions,
        },
        { onConflict: 'clerk_user_id' }
      );

    if (error) {
      console.error('[triage-tools] update_risk_profile error:', error.message);
      return { updated: false, note: 'Failed to update profile' };
    }

    return {
      updated: true,
      risk_factors_added: riskFactors,
      conditions_merged: mergedConditions.length,
    };
  },
};

// ─── Tool Dispatcher ─────────────────────────────────

export async function executeTriageTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<Record<string, unknown>> {
  const handler = handlers[name];
  if (!handler) {
    return { error: `Unknown tool: ${name}` };
  }

  try {
    return await handler(input, ctx);
  } catch (error) {
    console.error(`[triage-tools] Error executing ${name}:`, error);
    return { error: `Tool execution failed: ${error instanceof Error ? error.message : 'unknown error'}` };
  }
}

// ─── Helpers ─────────────────────────────────────────

/** Calculate distance between two lat/lng points in kilometers (Haversine formula) */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getSeasonName(month: number): string {
  if (month >= 3 && month <= 5) return 'Summer (Grishma)';
  if (month >= 6 && month <= 9) return 'Monsoon (Varsha)';
  if (month >= 10 && month <= 11) return 'Post-Monsoon (Sharad)';
  return 'Winter (Shishira/Hemanta)';
}
