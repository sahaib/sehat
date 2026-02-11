'use client';

export default function DisclaimerFooter() {
  return (
    <div className="no-print text-center pt-2 pb-1 px-4">
      <p className="text-[11px] text-gray-400/80 leading-relaxed">
        Sehat is an AI triage assistant, not a medical professional.
        Always consult a qualified healthcare provider. Emergency: <strong className="text-gray-500">112</strong>
      </p>
    </div>
  );
}
