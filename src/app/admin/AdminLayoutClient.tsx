'use client';

import { AdminNavigation } from '@/components/admin/AdminNavigation';
import { AdminProvider } from '@/contexts/AdminContext';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  userEmail?: string;
}

export function AdminLayoutClient({ children, userEmail }: AdminLayoutClientProps) {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-gray-950">
        {/* Admin Navigation */}
        <AdminNavigation userEmail={userEmail} />
        
        {/* Main Content Area */}
        <main className="lg:pl-64">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </AdminProvider>
  );
}