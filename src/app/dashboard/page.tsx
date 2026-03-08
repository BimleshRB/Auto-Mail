"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Settings, Target, Send, Mail, Briefcase, Link as LinkIcon, Lock, Sparkles, LogOut, ShieldAlert, UserCircle, CheckCircle2, AlertCircle, Bot, Activity, ServerCrash, ChevronDown } from "lucide-react";
import { BulkUpload } from "@/components/BulkUpload";
import { LeadDatabase } from "@/components/LeadDatabase";

export default function Dashboard() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState({
    emailConfig: { gmailAddress: "", appPassword: "" },
    apiKeys: { geminiAsString: "", zerobounce: [] as string[], hunter: [] as string[], abstract: [] as string[] },
    professionalLinks: { resume: "", resumeText: "", portfolio: "", github: "", linkedin: "", twitter: "", mobileNumber: "" },
    jobPreferences: { roles: [] as string[] },
    apiUsageLogs: [] as any[]
  });

  const [targetDetails, setTargetDetails] = useState({
    hrName: "",
    companyName: "",
    hrEmail: "",
    targetRole: ""
  });

  const [emailTemplate, setEmailTemplate] = useState("");
  const [subject, setSubject] = useState("Application for Software Engineering Role");
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: "", type: null });
  const [activeTab, setActiveTab] = useState<'config' | 'single' | 'bulk' | 'database'>('database');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const predefinedRoles = ["Frontend Developer", "Backend Developer", "Full Stack Developer", "DevOps Engineer", "Mobile Developer", "AI/ML Engineer", "Product Manager"];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        
        let geminiStr = "";
        if (data.apiKeys && Array.isArray(data.apiKeys.gemini)) {
            geminiStr = data.apiKeys.gemini.join(", ");
        }

        setProfile({
          emailConfig: data.emailConfig || { gmailAddress: "", appPassword: "" },
          apiKeys: { 
            geminiAsString: geminiStr,
            zerobounce: data.apiKeys?.zerobounce || [],
            hunter: data.apiKeys?.hunter || [],
            abstract: data.apiKeys?.abstract || []
          },
          professionalLinks: data.professionalLinks || { resume: "", resumeText: "", portfolio: "", github: "", linkedin: "", twitter: "", mobileNumber: "" },
          jobPreferences: data.jobPreferences || { roles: [] },
          apiUsageLogs: data.apiUsageLogs || []
        });
        if (data.jobPreferences?.roles?.length > 0) {
          setTargetDetails(prev => ({ ...prev, targetRole: data.jobPreferences.roles[0] }));
        }
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  const showNotification = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: null }), 5000);
  };

  const saveProfile = async () => {
    setLoadingProfile(true);
    try {
      const payload = {
        emailConfig: profile.emailConfig,
        professionalLinks: profile.professionalLinks,
        apiKeys: { gemini: profile.apiKeys.geminiAsString.split(",").map(k => k.trim()).filter(Boolean) },
        jobPreferences: profile.jobPreferences
      };

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showNotification("Profile configurations saved securely.", "success");
      } else {
        showNotification("Failed to save profile configurations.", "error");
      }
    } catch (err) {
      showNotification("A network error occurred while saving.", "error");
    }
    setLoadingProfile(false);
  };

  const handleProfileChange = (section: 'emailConfig' | 'professionalLinks' | 'apiKeys', field: string, value: string | string[]) => {
    setProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const generateTemplate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetDetails)
      });
      const data = await res.json();
      if (res.ok) {
        setEmailTemplate(data.template);
        setSubject(`Application for ${targetDetails.targetRole} role at ${targetDetails.companyName}`);
        showNotification("AI template successfully generated.", "success");
      } else {
        showNotification(`Error: ${data.error}`, "error");
      }
    } catch (err) {
      showNotification("Failed to reach the AI generation service.", "error");
    }
    setGenerating(false);
  };

  const sendEmail = async () => {
    if (!emailTemplate || !targetDetails.hrEmail) {
      showNotification("Missing recipient email or generated template.", "error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hrEmail: targetDetails.hrEmail,
          emailBody: emailTemplate,
          subject: subject
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Email dispatched successfully via Gmail Integration!", "success");
      } else {
        showNotification(`Error: ${data.error}`, "error");
      }
    } catch (err) {
      showNotification("An error occurred while sending the email.", "error");
    }
    setSending(false);
  };

  const staggerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      },
    }),
  };

  const inputClasses = "rounded-xl border-white/10 bg-zinc-950/50 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 transition-all font-medium h-11";
  const labelClasses = "text-zinc-400 font-semibold text-xs tracking-wider uppercase mb-1.5 inline-block";
  const cardClasses = "border-white/5 shadow-2xl backdrop-blur-2xl bg-zinc-900/60 rounded-3xl overflow-hidden ring-1 ring-white/10 relative";

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white p-4 md:p-8 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[0%] left-[20%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[0%] right-[10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <motion.header 
          custom={0} initial="hidden" animate="visible" variants={staggerVariants}
          className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-6 bg-zinc-900/40 backdrop-blur-md px-6 md:px-8 py-5 rounded-3xl border border-white/5 shadow-lg"
        >
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-white/20 shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                Auto <span className="text-indigo-400">Mail</span>
              </h1>
              <p className="text-zinc-400 font-medium text-sm mt-0.5">Automated Cold Email Engine</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-zinc-950/60 text-zinc-300 px-4 py-2 rounded-full text-sm font-medium border border-white/5">
              <UserCircle className="w-4 h-4 text-indigo-400" /> 
              {session?.user?.email}
            </div>
            {(session?.user as any)?.role === 'admin' && (
              <Button asChild variant="outline" className="rounded-full border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 font-medium shadow-sm transition-colors">
                <a href="/admin"><ShieldAlert className="w-4 h-4 mr-2 text-rose-400"/> Admin Panel</a>
              </Button>
            )}
            <Button variant="ghost" onClick={() => signOut()} className="rounded-full hover:bg-rose-500/10 hover:text-rose-400 text-zinc-400 transition-colors font-medium">
               <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </motion.header>

        {/* Global Notifications */}
        <div className="h-16 w-full max-w-lg mx-auto fixed top-4 right-4 z-50 pointer-events-none flex flex-col gap-2">
          <AnimatePresence>
            {message.type && (
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                className={`p-4 rounded-2xl border flex items-center gap-3 shadow-2xl backdrop-blur-md pointer-events-auto
                  ${message.type === 'error' ? 'bg-rose-950/80 border-rose-500/30 text-rose-200' : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'}`}
              >
                {message.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                <span className="font-semibold text-sm tracking-wide">{message.text}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dashboard Tabs */}
        <motion.div custom={0.5} initial="hidden" animate="visible" variants={staggerVariants} className="flex space-x-6 border-b border-white/10 mb-8 px-2 overflow-x-auto custom-scrollbar">
          <button 
            onClick={() => setActiveTab('config')} 
            className={`pb-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'config' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/20'}`}
          >
            System Config
          </button>
          <button 
            onClick={() => setActiveTab('single')} 
            className={`pb-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'single' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/20'}`}
          >
            Single Target
          </button>
          <button 
            onClick={() => setActiveTab('bulk')} 
            className={`pb-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'bulk' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/20'}`}
          >
            Bulk Upload
          </button>
          <button 
            onClick={() => setActiveTab('database')} 
            className={`pb-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'database' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/20'}`}
          >
            Lead Database
          </button>
        </motion.div>

        {activeTab === 'config' && (
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* System Profile Settings */}
          <motion.div custom={1} initial="hidden" animate="visible" variants={staggerVariants} className="relative">
            <Card className={cardClasses}>
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30" />
              <CardHeader className="pb-6 pt-8 px-6 lg:px-8">
                <CardTitle className="flex items-center gap-3 text-xl font-bold tracking-tight text-white">
                  <div className="p-2 rounded-lg bg-zinc-800/80 ring-1 ring-white/10 shadow-inner">
                    <Settings className="w-5 h-5 text-zinc-300" />
                  </div>
                  System Config
                </CardTitle>
                <CardDescription className="text-zinc-500 text-sm mt-2 font-medium">Configure credentials and digital footprint.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 px-6 lg:px-8 pb-8">
                
                {/* Email Section */}
                <div className="space-y-5 relative">
                   <div className="absolute -inset-4 bg-zinc-950/30 rounded-2xl border border-white/5 pointer-events-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" />
                   <div className="relative z-10 space-y-4">
                     <h3 className="text-xs font-bold text-indigo-400/80 uppercase tracking-widest flex items-center gap-2">
                       <Mail className="w-3.5 h-3.5" /> Authentication
                     </h3>
                    <div>
                      <Label className={labelClasses}>Gmail Address</Label>
                      <Input 
                        type="email" 
                        className={inputClasses}
                        value={profile.emailConfig.gmailAddress} 
                        onChange={(e) => handleProfileChange('emailConfig', 'gmailAddress', e.target.value)} 
                        placeholder="engineering@gmail.com" 
                      />
                    </div>
                    <div>
                      <Label className={labelClasses}>App Password</Label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-600" />
                          <Input 
                            type="password" 
                            className={`${inputClasses} pl-10`}
                            value={profile.emailConfig.appPassword} 
                            onChange={(e) => handleProfileChange('emailConfig', 'appPassword', e.target.value)} 
                            placeholder="••••••••••••••••" 
                          />
                        </div>
                        <Button 
                          onClick={saveProfile} 
                          disabled={loadingProfile}
                          className="h-11 px-6 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 font-bold tracking-wide transition-all shadow-sm shrink-0"
                        >
                          {loadingProfile ? "Saving..." : "Save App Password"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Configuration Section */}
                <div className="space-y-5 relative mt-8">
                   <div className="absolute -inset-4 bg-zinc-950/30 rounded-2xl border border-white/5 pointer-events-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" />
                   <div className="relative z-10 space-y-4">
                     <h3 className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest flex items-center gap-2">
                       <Bot className="w-3.5 h-3.5" /> Generative AI
                     </h3>
                    <div>
                      <Label className={labelClasses}>Google Gemini API Keys</Label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-600" />
                          <Input 
                            type="text" 
                            className={`${inputClasses} pl-10`}
                            value={profile.apiKeys?.geminiAsString || ""} 
                            onChange={(e) => handleProfileChange('apiKeys', 'geminiAsString', e.target.value)} 
                            placeholder="AIzaSy..., AIzaSy2..." 
                          />
                        </div>
                        <Button 
                          onClick={saveProfile} 
                          disabled={loadingProfile}
                          className="h-11 px-6 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold tracking-wide transition-all shadow-sm"
                        >
                          {loadingProfile ? "Saving..." : "Save Key"}
                        </Button>
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">Enter multiple keys separated by commas. We will auto-rotate them if you hit limits.</p>
                    </div>
                  </div>
                </div>
                
                {/* Email Verification Engines Section */}
                <div className="space-y-5 relative mt-8">
                   <div className="absolute -inset-4 bg-zinc-950/30 rounded-2xl border border-white/5 pointer-events-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" />
                   <div className="relative z-10 space-y-4">
                     <h3 className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest flex items-center gap-2">
                       <ShieldAlert className="w-3.5 h-3.5" /> Identity Verification Engines (Optional)
                     </h3>
                     
                     <div className="space-y-4">
                        <div>
                          <Label className={labelClasses}>ZeroBounce API Keys (Recommended)</Label>
                          <Input 
                            className={`${inputClasses} font-mono text-sm tracking-wide`}
                            value={profile.apiKeys?.zerobounce ? profile.apiKeys.zerobounce.join(', ') : ""} 
                            onChange={(e) => handleProfileChange('apiKeys', 'zerobounce', e.target.value.split(',').map(k => k.trim()).filter(k => k))} 
                            placeholder="zba_..." 
                          />
                        </div>
                        <div>
                          <Label className={labelClasses}>Hunter.io API Keys (Tier 2 Fallback)</Label>
                          <Input 
                            className={`${inputClasses} font-mono text-sm tracking-wide`}
                            value={profile.apiKeys?.hunter ? profile.apiKeys.hunter.join(', ') : ""} 
                            onChange={(e) => handleProfileChange('apiKeys', 'hunter', e.target.value.split(',').map(k => k.trim()).filter(k => k))} 
                            placeholder="hunter_..." 
                          />
                        </div>
                        <div>
                          <Label className={labelClasses}>AbstractAPI Free Keys (Tier 3 Fallback)</Label>
                          <Input 
                            className={`${inputClasses} font-mono text-sm tracking-wide`}
                            value={profile.apiKeys?.abstract ? profile.apiKeys.abstract.join(', ') : ""} 
                            onChange={(e) => handleProfileChange('apiKeys', 'abstract', e.target.value.split(',').map(k => k.trim()).filter(k => k))} 
                            placeholder="abs_..." 
                          />
                        </div>
                     </div>
                     <p className="text-xs text-zinc-500 mt-2">Enter multiple keys per provider separated by commas. We will rotate them seamlessly and fallback across providers if rate limits are hit.</p>
                   </div>
                </div>

                {/* Professional Links Section */}
                <div className="space-y-5 relative mt-8">
                   <div className="absolute -inset-4 bg-zinc-950/30 rounded-2xl border border-white/5 pointer-events-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" />
                   <div className="relative z-10 space-y-4">
                     <h3 className="text-xs font-bold text-purple-400/80 uppercase tracking-widest flex items-center gap-2">
                       <LinkIcon className="w-3.5 h-3.5" /> Web Presence
                     </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className={labelClasses}>Resume</Label>
                        <Input 
                          className={`${inputClasses} text-sm`}
                          value={profile.professionalLinks.resume} 
                          onChange={(e) => handleProfileChange('professionalLinks', 'resume', e.target.value)} 
                          placeholder="https://drive.google.com/..." 
                        />
                      </div>
                      <div>
                        <Label className={labelClasses}>Portfolio</Label>
                        <Input 
                          className={`${inputClasses} text-sm`}
                          value={profile.professionalLinks.portfolio} 
                          onChange={(e) => handleProfileChange('professionalLinks', 'portfolio', e.target.value)} 
                          placeholder="https://johndoe.dev" 
                        />
                      </div>
                      <div>
                        <Label className={labelClasses}>GitHub</Label>
                        <Input 
                          className={`${inputClasses} text-sm`}
                          value={profile.professionalLinks.github} 
                          onChange={(e) => handleProfileChange('professionalLinks', 'github', e.target.value)} 
                          placeholder="https://github.com/..." 
                        />
                      </div>
                      <div>
                        <Label className={labelClasses}>LinkedIn</Label>
                        <Input 
                          className={`${inputClasses} text-sm`}
                          value={profile.professionalLinks.linkedin} 
                          onChange={(e) => handleProfileChange('professionalLinks', 'linkedin', e.target.value)} 
                          placeholder="https://linkedin.com/in/..." 
                        />
                      </div>
                      <div>
                        <Label className={labelClasses}>Mobile Number</Label>
                        <Input 
                          className={`${inputClasses} text-sm`}
                          value={profile.professionalLinks.mobileNumber || ''} 
                          onChange={(e) => handleProfileChange('professionalLinks', 'mobileNumber', e.target.value)} 
                          placeholder="+1 (555) 123-4567" 
                        />
                      </div>
                    </div>
                  </div>
                    
                    <div className="mt-6">
                      <Label className={labelClasses}>Raw Resume Context</Label>
                      <Textarea 
                        rows={6}
                        className={`${inputClasses} h-auto py-3 text-sm`}
                        value={profile.professionalLinks.resumeText || ""} 
                        onChange={(e) => handleProfileChange('professionalLinks', 'resumeText', e.target.value)} 
                        placeholder="Paste your entire resume text here. The AI will use this strictly as context to synthesize highly personalized email drafts." 
                      />
                    </div>
                </div>

                <Button 
                  onClick={saveProfile} 
                  disabled={loadingProfile} 
                  className="w-full h-12 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] font-bold tracking-wide transition-all mt-6"
                >
                  {loadingProfile ? "Syncing..." : "Save Configuration"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* API Health Tracking UI */}
          <motion.div custom={2} initial="hidden" animate="visible" variants={staggerVariants} className="relative">
            <Card className={cardClasses}>
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-30" />
              <CardHeader className="pb-6 pt-8 px-6 lg:px-8">
                <CardTitle className="flex items-center justify-between gap-3 text-xl font-bold tracking-tight text-white mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800/80 ring-1 ring-white/10 shadow-inner">
                      <Activity className="w-5 h-5 text-rose-400" />
                    </div>
                    API Health & Limits
                  </div>
                </CardTitle>
                <CardDescription className="text-zinc-500 text-sm font-medium">Real-time usage telemetry across your rotating Gemini instances.</CardDescription>
              </CardHeader>
              <CardContent className="px-6 lg:px-8 pb-8">
                {profile.apiUsageLogs && profile.apiUsageLogs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {profile.apiUsageLogs.map((log: any, idx: number) => (
                       <div key={idx} className="bg-zinc-950/60 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                         <div className="flex justify-between items-center text-xs font-mono text-zinc-500">
                           <span>Key Prefix</span>
                           <span className="text-white bg-zinc-800 px-2 py-0.5 rounded-md">{log.keyPrefix}</span>
                         </div>
                         <div className="flex justify-between items-end border-t border-white/5 pt-3">
                           <div className="flex items-center gap-2">
                             <ServerCrash className="w-4 h-4 text-rose-500" />
                             <span className="text-2xl font-bold text-white leading-none">{log.requestsMade} <span className="text-xs text-zinc-500 uppercase tracking-widest ml-1 font-sans">Hits</span></span>
                           </div>
                           <div className="text-[10px] text-zinc-600 text-right">
                             Last executed:<br/>
                             {new Date(log.lastUsed).toLocaleString()}
                           </div>
                         </div>
                       </div>
                     ))}
                  </div>
                ) : (
                  <div className="text-center text-sm font-medium text-zinc-600 py-6">No telemetry recorded yet. Generate templates to track API usage.</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
        )}

        {/* Column 2: Target Details & Email Preview (7 columns width) */}
        {activeTab === 'single' && (
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Target Details */}
            <motion.div custom={2} initial="hidden" animate="visible" variants={staggerVariants}>
              <Card className={cardClasses}>
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-30" />
                <CardHeader className="pb-6 pt-8 px-6 lg:px-8">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold tracking-tight text-white">
                    <div className="p-2 rounded-lg bg-zinc-800/80 ring-1 ring-white/10 shadow-inner">
                      <Target className="w-5 h-5 text-zinc-300" />
                    </div>
                    Lead Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 px-6 lg:px-8 pb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <Label className={labelClasses}>Contact Name</Label>
                      <Input 
                        className={inputClasses}
                        value={targetDetails.hrName} 
                        onChange={(e) => setTargetDetails(prev => ({ ...prev, hrName: e.target.value }))} 
                        placeholder="e.g. Sarah Connor" 
                      />
                    </div>
                    <div>
                      <Label className={labelClasses}>Target Organization</Label>
                      <Input 
                        className={inputClasses}
                        value={targetDetails.companyName} 
                        onChange={(e) => setTargetDetails(prev => ({ ...prev, companyName: e.target.value }))} 
                        placeholder="e.g. Cyberdyne Systems" 
                      />
                    </div>
                  </div>
                  <div>
                    <Label className={labelClasses}>Contact Email</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-600" />
                      <Input 
                        type="email" 
                        className={`${inputClasses} pl-10`}
                        value={targetDetails.hrEmail} 
                        onChange={(e) => setTargetDetails(prev => ({ ...prev, hrEmail: e.target.value }))} 
                        placeholder="sarah.c@cyberdyne.com" 
                      />
                    </div>
                  </div>
                  <div>
                    <Label className={labelClasses}>Desired Position</Label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-600 pointer-events-none z-10" />
                      
                      <button 
                        type="button"
                        onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                        className={`${inputClasses} pl-10 w-full text-left flex items-center justify-between ${!targetDetails.targetRole ? 'text-zinc-500' : 'text-white'}`}
                      >
                        <span className="truncate">{targetDetails.targetRole || "Select position structure..."}</span>
                        <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0" />
                      </button>

                      <AnimatePresence>
                        {roleDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 ring-1 ring-white/5"
                            >
                              <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                                {predefinedRoles.map(role => (
                                  <div 
                                    key={role}
                                    onClick={() => {
                                      setTargetDetails(prev => ({ ...prev, targetRole: role }));
                                      setRoleDropdownOpen(false);
                                    }}
                                    className={`px-3 py-2.5 mx-1 my-0.5 rounded-lg text-sm cursor-pointer flex items-center justify-between transition-colors ${targetDetails.targetRole === role ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}
                                  >
                                    <span className="truncate">{role}</span>
                                    {targetDetails.targetRole === role && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <Button 
                    onClick={generateTemplate} 
                    disabled={generating || !targetDetails.hrName || !targetDetails.companyName || !targetDetails.targetRole} 
                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border border-indigo-400/20 font-bold text-white tracking-wide transition-all gap-2 flex items-center justify-center"
                  >
                    <Sparkles className={`w-5 h-5 ${generating ? 'animate-pulse' : ''}`} />
                    {generating ? "Synthesizing AI Response..." : "Generate Neural Draft"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Email Preview & Send */}
            <motion.div custom={3} initial="hidden" animate="visible" variants={staggerVariants}>
              <Card className={cardClasses}>
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-30" />
                <CardHeader className="pb-6 pt-8 px-6 lg:px-8">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold tracking-tight text-white">
                    <div className="p-2 rounded-lg bg-zinc-800/80 ring-1 ring-white/10 shadow-inner">
                      <Send className="w-5 h-5 text-zinc-300" />
                    </div>
                    Execution Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 px-6 lg:px-8 pb-8">
                  <div>
                    <Label className={labelClasses}>Subject Structure</Label>
                    <Input 
                      className={`${inputClasses} font-semibold`}
                      value={subject} 
                      onChange={(e) => setSubject(e.target.value)} 
                    />
                  </div>
                  <div>
                    <Label className={labelClasses}>Payload Body</Label>
                    <Textarea 
                      rows={12} 
                      className={`rounded-xl border-white/10 bg-zinc-950/70 text-zinc-300 placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-all font-medium leading-relaxed resize-none p-4 shadow-inner`}
                      value={emailTemplate} 
                      onChange={(e) => setEmailTemplate(e.target.value)} 
                      placeholder="Executing synthesis... awaiting output stream."
                    />
                  </div>
                  <Button 
                    onClick={sendEmail} 
                    disabled={sending || !emailTemplate} 
                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] border border-emerald-400/20 font-bold text-white tracking-wide transition-all gap-2 flex items-center justify-center"
                  >
                    <Send className={`w-5 h-5 ${sending ? 'animate-bounce' : ''}`} />
                    {sending ? "Transmitting..." : "Initialize Dispatch"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
        
        {/* Bulk Upload Component */}
        {activeTab === 'bulk' && (
          <motion.div custom={1} initial="hidden" animate="visible" variants={staggerVariants} className="max-w-5xl mx-auto">
            <BulkUpload showNotification={showNotification} />
          </motion.div>
        )}
        
        {/* Lead Database Component */}
        {activeTab === 'database' && (
           <motion.div custom={1} initial="hidden" animate="visible" variants={staggerVariants}>
             <LeadDatabase profile={profile} showNotification={showNotification} />
           </motion.div>
        )}
      </div>
    </div>
  );
}
