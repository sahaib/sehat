import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50 via-white to-teal-50/30">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-lg rounded-2xl',
            headerTitle: 'text-teal-800',
            formButtonPrimary: 'bg-teal-600 hover:bg-teal-700',
          },
        }}
      />
    </div>
  );
}
