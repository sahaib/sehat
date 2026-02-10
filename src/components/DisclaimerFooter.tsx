'use client';

export default function DisclaimerFooter() {
  return (
    <div className="no-print text-center py-3 px-4">
      <p className="text-xs text-gray-400 leading-relaxed">
        Sehat is an AI triage assistant, not a medical professional.
        Always consult a qualified healthcare provider for medical advice.
        In an emergency, call <strong>112</strong>.
      </p>
    </div>
  );
}
