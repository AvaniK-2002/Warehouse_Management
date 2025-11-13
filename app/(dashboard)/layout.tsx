import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-4 lg:p-6">
          <div className="w-full max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
