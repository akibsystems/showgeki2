import { Layout } from '@/components/layout';
import { AuthForm } from '@/components/auth/AuthForm';
import { AuthError } from '@/components/auth/AuthError';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-gold-400 bg-clip-text text-transparent mb-2">
              Tokyo Shakespeare Studio
            </h1>
            <p className="text-gray-400">
              AIが紡ぐシェイクスピア風物語
            </p>
          </div>
          
          <Suspense fallback={null}>
            <AuthError />
          </Suspense>
          
          <AuthForm mode="signin" redirectTo="/dashboard" />
        </div>
      </div>
    </Layout>
  );
}