import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
          <p className="text-slate-600">
            Welcome, Admin <strong>{session.user?.name}</strong>! 
            Only users with the 'admin' role can view this page.
          </p>
        </div>
      </div>
    </div>
  );
}
