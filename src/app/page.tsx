'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Use replace instead of push to avoid navigation issues
    router.replace('/auth/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-800">
      <div className="text-white text-lg">Redirecting to login...</div>
    </div>
  );
}
