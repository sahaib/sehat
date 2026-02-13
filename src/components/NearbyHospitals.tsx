'use client';

import { NearbyHospital } from '@/types';

interface NearbyHospitalsProps {
  hospitals: NearbyHospital[];
}

export default function NearbyHospitals({ hospitals }: NearbyHospitalsProps) {
  if (hospitals.length === 0) return null;

  return (
    <div className="mt-3">
      <h3 className="section-label mb-2 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-teal-600" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        Nearby hospitals
      </h3>
      <div className="space-y-2">
        {hospitals.map((h, i) => (
          <a
            key={i}
            href={h.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/60
                       hover:border-teal-300 hover:bg-teal-50/50 transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-teal-600" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{h.name}</p>
              <p className="text-xs text-gray-500">
                {h.distance_km} km away
                {h.type === 'clinic' || h.type === 'phc' ? ' \u00b7 Clinic' : ' \u00b7 Hospital'}
                {h.phone && ` \u00b7 ${h.phone}`}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
