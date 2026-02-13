'use client';

import { useState, useEffect } from 'react';
import { Language } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

interface ProfileFormProps {
  onClose: () => void;
  language: Language;
}

const CONDITION_OPTIONS = [
  'Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Thyroid',
  'Arthritis', 'PCOD/PCOS', 'Kidney Disease', 'Liver Disease', 'Cancer',
];

export default function ProfileForm({ onClose, language }: ProfileFormProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [preferredLang, setPreferredLang] = useState<Language>(language);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load existing profile
  useEffect(() => {
    // Load name from localStorage for instant personalization
    const savedName = localStorage.getItem('sehat_user_name');
    if (savedName) setName(savedName);

    fetch('/api/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.profile) {
          if (data.profile.name) setName(data.profile.name);
          setAge(data.profile.age?.toString() || '');
          setGender(data.profile.gender || '');
          setConditions(data.profile.pre_existing_conditions || []);
          if (data.profile.preferred_language) setPreferredLang(data.profile.preferred_language as Language);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const toggleCondition = (c: string) => {
    setConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const handleSave = async () => {
    setSaving(true);
    // Persist name to localStorage for instant personalization across sessions
    if (name.trim()) {
      localStorage.setItem('sehat_user_name', name.trim());
    } else {
      localStorage.removeItem('sehat_user_name');
    }
    // Persist preferred language to localStorage for instant load on next visit
    localStorage.setItem('sehat_preferred_language', preferredLang);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          age: age ? parseInt(age) : null,
          gender: gender || null,
          pre_existing_conditions: conditions,
          preferred_language: preferredLang,
        }),
      });
      onClose();
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-2xl p-8 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 modal-overlay flex items-end sm:items-center justify-center z-50 px-0 sm:px-4 animate-fade-in">
      <div className="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[85dvh] overflow-y-auto shadow-2xl animate-slide-up border border-white/60">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Health Profile</h2>
              <p className="text-xs text-gray-400">All fields are optional</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center
                         hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-600 block mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              maxLength={50}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800
                         focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none
                         text-base transition-all duration-200"
            />
          </div>

          {/* Age */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-600 block mb-1.5">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 35"
              min="1"
              max="120"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800
                         focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none
                         text-base transition-all duration-200"
            />
          </div>

          {/* Gender */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-600 block mb-1.5">Gender</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
                { value: 'prefer_not_to_say', label: 'Prefer not to say' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGender(gender === opt.value ? '' : opt.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 border
                    ${gender === opt.value
                      ? 'bg-teal-50/80 border-teal-300 text-teal-700 shadow-sm shadow-teal-100/50'
                      : 'bg-white/60 border-gray-200 text-gray-600 hover:border-teal-200 hover:bg-white/80'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Language */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-600 block mb-1.5">Preferred Language</label>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setPreferredLang(lang.code)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 border
                    ${preferredLang === lang.code
                      ? 'bg-teal-50/80 border-teal-300 text-teal-700 shadow-sm shadow-teal-100/50'
                      : 'bg-white/60 border-gray-200 text-gray-600 hover:border-teal-200 hover:bg-white/80'
                    }`}
                >
                  {lang.nativeLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Pre-existing conditions */}
          <div className="mb-5">
            <label className="text-sm font-medium text-gray-600 block mb-1.5">
              Pre-existing conditions
            </label>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => toggleCondition(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border
                    ${conditions.includes(c)
                      ? 'bg-teal-50/80 border-teal-300 text-teal-700 shadow-sm shadow-teal-100/50 scale-105'
                      : 'bg-white/60 border-gray-200 text-gray-500 hover:border-teal-200 hover:bg-white/80 hover:scale-105'
                    }`}
                >
                  {conditions.includes(c) && '✓ '}{c}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl
                       hover:from-teal-600 hover:to-teal-700 transition-all duration-300 active:scale-[0.98]
                       disabled:opacity-60 disabled:cursor-wait
                       shadow-md shadow-teal-200/30 hover:shadow-lg hover:shadow-teal-300/30"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>

          <p className="text-[10px] text-gray-300 text-center mt-3">
            Your data is stored securely and only used to personalize your triage experience.
          </p>
        </div>
      </div>
    </div>
  );
}
