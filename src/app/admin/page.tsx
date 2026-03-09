"use client";

import { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Users, Mail, CheckCircle2, Search, ArrowLeft, CreditCard, Settings, MessageSquareQuote, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type TabType = 'users' | 'payments' | 'system-config' | 'messages' | 'testimonials' | 'pricing';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [systemConfig, setSystemConfig] = useState({
    razorpayKeyId: "",
    razorpayKeySecret: "",
    masterGeminiKey: "",
    maintenanceMode: false
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const staggerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom) => ({
      opacity: 1, 
      y: 0,
      transition: { delay: custom * 0.1, duration: 0.5, ease: "easeOut" }
    })
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const userRole = (session?.user as any)?.role?.toLowerCase() || 'user';
      if (userRole !== 'admin') {
         router.push("/dashboard");
      } else {
         fetchData();
      }
    }
  }, [status, session, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, msgsRes, configRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/messages'),
        fetch('/api/admin/config')
      ]);
      
      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsers(u.users || []);
      }
      
      if (msgsRes.ok) {
        const m = await msgsRes.json();
        setMessages(m.messages || []);
      }

      if (configRes.ok) {
        const c = await configRes.json();
        if (c.config) {
          setSystemConfig(prev => ({ ...prev, ...c.config }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  };

  const markMessageAsRead = async (id: string, currentStatus: string) => {
    if (currentStatus === 'read') return;
    try {
      await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetIds: [id], status: 'read' })
      });
      // Optimistic upate
      setMessages(prev => prev.map(m => m._id === id ? { ...m, status: 'read' } : m));
    } catch (err) {
      console.error("Failed to mark message as read", err);
    }
  };

  const saveSystemConfig = async () => {
    setSavingConfig(true);
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemConfig)
      });
      // Optionally show a toast/notification here
    } catch (err) {
      console.error("Failed to save config", err);
    } finally {
      setSavingConfig(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredMessages = messages.filter(m =>
    m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.subject && m.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-zinc-400 font-medium animate-pulse">Authenticating Admin Session...</p>
        </div>
      </div>
    );
  }

  type SidebarLink = {
    id: TabType;
    label: string;
    icon: React.ElementType;
    badge?: number;
  };

  const sidebarLinks: SidebarLink[] = [
    { id: 'users', label: 'Global Users', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'system-config', label: 'System Config', icon: Settings },
    { id: 'messages', label: 'Contact Messages', icon: Mail, badge: messages.filter(m => m.status === 'unread').length },
    { id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
    { id: 'pricing', label: 'Pricing Engine', icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-rose-500/30 overflow-x-hidden flex">
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-900/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] right-[-5%] w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-[100px]" />
      </div>

      {/* Sidebar Navigation */}
      <motion.aside 
        initial={{ x: -300 }} animate={{ x: 0 }} transition={{ type: 'spring', damping: 20 }}
        className="w-64 border-r border-white/5 bg-zinc-950/80 backdrop-blur-2xl relative z-20 flex flex-col h-screen sticky top-0"
      >
        <div className="h-20 flex items-center px-6 border-b border-white/5">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-700 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                  <ShieldAlert className="w-5 h-5 text-white" />
               </div>
               <div>
                 <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Admin</h1>
                 <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Command Center</p>
               </div>
            </div>
        </div>

        <div className="p-4 flex-1 space-y-1">
           {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                 <button
                   key={link.id}
                   onClick={() => setActiveTab(link.id as TabType)}
                   className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm font-semibold group ${isActive ? 'bg-rose-500/10 text-rose-400' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
                 >
                    <div className="flex items-center gap-3">
                       <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                       {link.label}
                    </div>
                    {link.badge && link.badge > 0 ? (
                       <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>{link.badge}</span>
                    ) : null}
                 </button>
              )
           })}
        </div>

        <div className="p-4 border-t border-white/5">
            <Button asChild variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white rounded-xl">
               <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Return to App</Link>
            </Button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 w-full flex flex-col h-screen overflow-y-auto">
        
        {/* Top Navbar */}
        <header className="h-20 border-b border-white/5 bg-zinc-950/40 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
           <h2 className="text-xl font-bold text-white capitalize flex items-center gap-3">
             {activeTab.replace('-', ' ')}
             <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Admin Access</span>
           </h2>

           <div className="relative w-72">
             <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
             <Input 
               placeholder="Search registry..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-9 bg-zinc-900/50 border-white/10 text-sm h-10 rounded-xl focus-visible:ring-rose-500 focus-visible:border-rose-500 text-zinc-300" 
             />
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
            {/* Users Tab */}
            {activeTab === 'users' && (
            <motion.div custom={1} initial="hidden" animate="visible" variants={staggerVariants} className="space-y-6">
                <Card className="bg-zinc-900/40 border-white/10 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-950/50 border-b border-white/5 text-xs uppercase text-zinc-500 font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">User Identity</th>
                            <th className="px-6 py-4">Security Role</th>
                            <th className="px-6 py-4">OAuth Provider</th>
                            <th className="px-6 py-4">Hardware Limits</th>
                            <th className="px-6 py-4">Account Creation</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                        {filteredUsers.length === 0 ? (
                            <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-medium">
                                No users found in database.
                            </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                            <tr key={user._id} className="hover:bg-zinc-800/20 transition-colors">
                                <td className="px-6 py-4">
                                <div className="font-semibold text-white">{user.name || 'Anonymous User'}</div>
                                <div className="text-zinc-500 text-xs">{user.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md border ${user.role?.toLowerCase() === 'admin' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                                    {user.role || 'user'}
                                </span>
                                </td>
                                <td className="px-6 py-4 text-zinc-400 text-xs font-mono">
                                {user.provider || 'unknown'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs text-zinc-400 font-mono space-y-1">
                                        <div>Plan: <span className="text-white font-semibold">{user.plan || 'free'}</span></div>
                                        <div className="text-indigo-400">Total Gens: {user.subscriptionStats?.templatesGeneratedThisMonth || 0}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs text-zinc-500 font-medium">
                                {new Date(user.createdAt || user.updatedAt).toLocaleDateString()}
                                </td>
                            </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
                </Card>
            </motion.div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
            <motion.div custom={1} initial="hidden" animate="visible" variants={staggerVariants} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMessages.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-zinc-500 font-medium bg-zinc-900/20 rounded-3xl border border-white/5 border-dashed">
                        Inbox zero. No contact messages found.
                    </div>
                    ) : (
                    filteredMessages.map((msg) => (
                        <div 
                        key={msg._id} 
                        className={`p-6 rounded-3xl border backdrop-blur-md transition-all relative overflow-hidden group flex flex-col ${msg.status === 'unread' ? 'bg-zinc-900/80 border-rose-500/30 shadow-[0_4px_20px_rgba(244,63,94,0.1)]' : 'bg-zinc-900/30 border-white/5 opacity-80'}`}
                        >
                        {/* Unread internal glow */}
                        {msg.status === 'unread' && <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/20 rounded-full blur-2xl -mr-10 -mt-10" />}
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <h3 className="text-sm font-bold text-white tracking-wide">{msg.name}</h3>
                                <a href={`mailto:${msg.email}`} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">{msg.email}</a>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-medium">{new Date(msg.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="mb-2 relative z-10">
                            <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest block mb-1">Subject</span>
                            <p className="text-sm text-white font-medium bg-zinc-950/50 p-2 rounded-lg border border-white/5">{msg.subject}</p>
                        </div>

                        <div className="relative z-10 mb-6 flex-1">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1">Payload</span>
                            <p className="text-sm text-zinc-400 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">{msg.message}</p>
                        </div>

                        {msg.status === 'unread' ? (
                            <Button 
                                onClick={() => markMessageAsRead(msg._id, msg.status)}
                                className="w-full mt-auto bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold text-xs h-9 rounded-xl relative z-10"
                            >
                                Mark as Read
                            </Button>
                        ) : (
                            <div className="w-full mt-auto h-9 rounded-xl bg-zinc-800/40 text-zinc-500 text-xs font-bold flex items-center justify-center gap-2 border border-white/5 shadow-inner">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Read
                            </div>
                        )}
                        </div>
                    ))
                    )}
                </div>
            </motion.div>
            )}

            {/* System Config Tab */}
            {activeTab === 'system-config' && (
              <motion.div custom={1} initial="hidden" animate="visible" variants={staggerVariants} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {/* Payment Gateway (Razorpay) */}
                   <Card className="bg-zinc-900/40 border-white/10 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                     <div className="p-6 border-b border-white/5 bg-zinc-950/30">
                        <div className="flex items-center gap-3 mb-1">
                           <CreditCard className="w-5 h-5 text-emerald-400" />
                           <h3 className="text-lg font-bold text-white">Payment Gateway</h3>
                        </div>
                        <p className="text-zinc-400 text-sm">Configure Razorpay credentials for SaaS billing.</p>
                     </div>
                     <div className="p-6 space-y-4">
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Razorpay Key ID</label>
                           <Input 
                             type="password" 
                             value={systemConfig.razorpayKeyId}
                             onChange={(e) => setSystemConfig(prev => ({...prev, razorpayKeyId: e.target.value}))}
                             placeholder="rzp_test_xxxxxxxxxx" 
                             className="rounded-xl border-white/10 bg-zinc-950/50 text-white font-mono placeholder:text-zinc-600 focus-visible:border-emerald-500 h-11" 
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Razorpay Key Secret</label>
                           <Input 
                             type="password" 
                             value={systemConfig.razorpayKeySecret}
                             onChange={(e) => setSystemConfig(prev => ({...prev, razorpayKeySecret: e.target.value}))}
                             placeholder="••••••••••••••••" 
                             className="rounded-xl border-white/10 bg-zinc-950/50 text-white font-mono placeholder:text-zinc-600 focus-visible:border-emerald-500 h-11" 
                           />
                        </div>
                        <Button 
                          onClick={saveSystemConfig}
                          disabled={savingConfig}
                          className="w-full mt-2 bg-rose-600 hover:bg-rose-500 text-white font-bold h-11 rounded-xl shadow-[0_0_15px_rgba(225,29,72,0.3)] disabled:opacity-50"
                        >
                           {savingConfig ? 'Saving...' : 'Save Payment Credentials'}
                        </Button>
                     </div>
                   </Card>

                   {/* Global Fallbacks */}
                   <Card className="bg-zinc-900/40 border-white/10 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                     <div className="p-6 border-b border-white/5 bg-zinc-950/30">
                        <div className="flex items-center gap-3 mb-1">
                           <Settings className="w-5 h-5 text-indigo-400" />
                           <h3 className="text-lg font-bold text-white">Global Application Tuning</h3>
                        </div>
                        <p className="text-zinc-400 text-sm">Hardware fallbacks and platform switches.</p>
                     </div>
                     <div className="p-6 space-y-4">
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Master Gemini API Key (Fallback)</label>
                           <Input 
                             type="password" 
                             value={systemConfig.masterGeminiKey}
                             onChange={(e) => setSystemConfig(prev => ({...prev, masterGeminiKey: e.target.value}))}
                             placeholder="AIzaSy..." 
                             className="rounded-xl border-white/10 bg-zinc-950/50 text-white font-mono placeholder:text-zinc-600 focus-visible:border-indigo-500 h-11" 
                           />
                           <div className="flex justify-between items-center">
                              <p className="text-[10px] text-zinc-500">Used if a Free-tier user exhausts their own limits during generation.</p>
                              <Button onClick={saveSystemConfig} disabled={savingConfig} variant="ghost" className="h-6 px-3 text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-md">Save Key</Button>
                           </div>
                        </div>
                        
                        <div className="p-4 rounded-2xl bg-zinc-950/50 border border-white/5 flex items-center justify-between mt-4">
                           <div>
                              <p className="text-sm font-bold text-white">Maintenance Mode</p>
                              <p className="text-xs text-zinc-500">Block all incoming traffic and user logins.</p>
                           </div>
                           <button 
                             onClick={() => {
                               const newState = !systemConfig.maintenanceMode;
                               setSystemConfig(prev => ({ ...prev, maintenanceMode: newState }));
                               saveSystemConfig();
                             }}
                             className={`w-12 h-6 rounded-full border border-white/10 relative transition-colors ${systemConfig.maintenanceMode ? 'bg-rose-600' : 'bg-zinc-800'}`}
                           >
                              <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${systemConfig.maintenanceMode ? 'left-7 text-rose-600' : 'left-1 bg-zinc-600'}`} />
                           </button>
                        </div>
                     </div>
                   </Card>
                </div>
              </motion.div>
            )}

            {/* Pricing Engine Tab */}
            {activeTab === 'pricing' && (
              <motion.div custom={1} initial="hidden" animate="visible" variants={staggerVariants} className="space-y-6">
                
                <div className="flex items-center justify-between bg-zinc-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md mb-8">
                   <div>
                     <h3 className="text-xl font-bold text-white">SaaS Tier Engine</h3>
                     <p className="text-zinc-400 text-sm mt-1">Configure feature quotas and billing mechanics for your customers.</p>
                   </div>
                   <Button className="bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl shadow-[0_0_15px_rgba(225,29,72,0.3)]">Publish Changes</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {/* Tier 1 */}
                   <div className="relative p-6 rounded-3xl border border-white/10 bg-zinc-900/60 overflow-hidden group hover:border-zinc-500/50 transition-colors">
                      <div className="mb-6">
                         <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-widest border border-white/5">Tier 1</span>
                         <h4 className="text-2xl font-bold text-white mt-4">Seed</h4>
                         <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-3xl font-bold text-white">$0</span>
                            <span className="text-zinc-500 text-sm font-medium">/mo</span>
                         </div>
                      </div>
                      
                      <div className="space-y-4">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Monthly Email Limit</label>
                            <Input defaultValue="50" className="rounded-xl border-white/5 bg-zinc-950/50 text-white font-mono h-10" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max API Keys</label>
                            <Input defaultValue="2" className="rounded-xl border-white/5 bg-zinc-950/50 text-white font-mono h-10" />
                         </div>
                         <div className="p-3 rounded-xl bg-zinc-950/50 border border-white/5 text-xs text-zinc-400">
                             Basic Templates <br/> No CRM Integrations <br/> Community Support
                         </div>
                      </div>
                   </div>

                   {/* Tier 2 */}
                   <div className="relative p-6 rounded-3xl border border-indigo-500/30 bg-indigo-950/10 overflow-hidden group">
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                      <div className="mb-6">
                         <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]">Tier 2</span>
                         <h4 className="text-2xl font-bold text-white mt-4">Growth</h4>
                         <div className="flex items-baseline gap-1 mt-2">
                            <Input defaultValue="29" className="w-16 rounded-xl border-white/10 bg-zinc-900/50 text-white text-xl font-bold h-10 px-2" />
                            <span className="text-zinc-500 text-sm font-medium">/mo</span>
                         </div>
                      </div>
                      
                      <div className="space-y-4">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Monthly Email Limit</label>
                            <Input defaultValue="5000" className="rounded-xl border-white/10 bg-zinc-950/50 text-white font-mono h-10 focus-visible:border-indigo-500" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max API Keys</label>
                            <Input defaultValue="Unlimited" readOnly className="rounded-xl border-white/5 bg-zinc-950/50 text-zinc-500 font-mono h-10 cursor-not-allowed" />
                         </div>
                         <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/10 text-xs text-indigo-200">
                             Advanced AI Personalization <br/> Priority Queues <br/> Standard Support
                         </div>
                      </div>
                   </div>

                   {/* Tier 3 */}
                   <div className="relative p-6 rounded-3xl border border-white/10 bg-zinc-900/60 overflow-hidden group hover:border-zinc-500/50 transition-colors">
                      <div className="mb-6">
                         <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-widest border border-white/5">Tier 3</span>
                         <h4 className="text-2xl font-bold text-white mt-4">Scale</h4>
                         <div className="flex items-baseline gap-1 mt-2">
                            <Input defaultValue="89" className="w-16 rounded-xl border-white/10 bg-zinc-900/50 text-white text-xl font-bold h-10 px-2" />
                            <span className="text-zinc-500 text-sm font-medium">/mo</span>
                         </div>
                      </div>
                      
                      <div className="space-y-4">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Monthly Email Limit</label>
                            <Input defaultValue="Unlimited" readOnly className="rounded-xl border-white/5 bg-zinc-950/50 text-zinc-500 font-mono h-10 cursor-not-allowed" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Monthly Contact Limit</label>
                            <Input defaultValue="50000" className="rounded-xl border-white/10 bg-zinc-950/50 text-white font-mono h-10" />
                         </div>
                         <div className="p-3 rounded-xl bg-zinc-950/50 border border-white/5 text-xs text-zinc-400">
                             Full CRM Integrations <br/> Custom Domains <br/> 24/7 White-glove Support
                         </div>
                      </div>
                   </div>

                </div>
              </motion.div>
            )}

            {/* Placeholders for other requested modules */}
            {['payments', 'testimonials'].includes(activeTab) && (
             <motion.div custom={1} initial="hidden" animate="visible" variants={staggerVariants} className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                 <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center">
                    <Settings className="w-8 h-8 text-zinc-600 animate-spin-slow" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Module under construction</h3>
                    <p className="text-zinc-500 text-sm mt-1 max-w-sm">The {activeTab.replace('-', ' ')} module is currently being integrated into the core Admin portal.</p>
                 </div>
             </motion.div>   
            )}

        </div>
      </main>
    </div>
  );
}
