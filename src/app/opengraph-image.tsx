import { ImageResponse } from 'next/og';

export const alt = 'Sehat - AI Medical Triage Assistant';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 40%, #4338CA 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background circles */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '30%',
            width: '250px',
            height: '250px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
          }}
        />

        {/* Main content area */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Text */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: '700px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              {/* Heart icon */}
              <svg
                width="52"
                height="52"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="white"
                />
                <path
                  d="M11 7h2v4h4v2h-4v4h-2v-4H7v-2h4V7z"
                  fill="#0D9488"
                />
              </svg>
              <span
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '22px',
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                AI Medical Triage
              </span>
            </div>

            <div
              style={{
                fontSize: '72px',
                fontWeight: 700,
                color: 'white',
                lineHeight: 1.1,
                marginBottom: '8px',
                display: 'flex',
              }}
            >
              Sehat
            </div>
            <div
              style={{
                fontSize: '40px',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 1.1,
                marginBottom: '24px',
                display: 'flex',
              }}
            >
              सेहत
            </div>
            <div
              style={{
                fontSize: '24px',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.5,
                fontWeight: 400,
                display: 'flex',
              }}
            >
              Voice-first medical triage in 7 Indian languages.
              Understand symptom severity. Get directed to the right care.
            </div>
          </div>

          {/* Right: Severity badges */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              marginLeft: '40px',
            }}
          >
            {[
              { label: 'Emergency', color: '#DC2626', icon: '🔴' },
              { label: 'Urgent', color: '#EA580C', icon: '🟠' },
              { label: 'Routine', color: '#CA8A04', icon: '🟡' },
              { label: 'Self-care', color: '#16A34A', icon: '🟢' },
            ].map(({ label, color }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: color,
                    display: 'flex',
                  }}
                />
                <span
                  style={{
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 500,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.15)',
            paddingTop: '20px',
            marginTop: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '24px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '16px',
            }}
          >
            <span style={{ display: 'flex' }}>7 Indian Languages</span>
            <span style={{ display: 'flex' }}>Voice-First</span>
            <span style={{ display: 'flex' }}>Extended Thinking</span>
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '16px',
              display: 'flex',
            }}
          >
            Powered by Claude Opus 4.6
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
