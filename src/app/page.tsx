"use client";

import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, Mail, Bot, Shield, Code2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function LandingPage() {
  const { data: session } = useSession();

  const fadeIn: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const stagger: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[150px] mix-blend-screen" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[40%] right-[0%] w-[600px] h-[600px] bg-purple-600 rounded-full blur-[150px] mix-blend-screen" 
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Auto <span className="text-indigo-400">Mail</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild className="bg-white text-zinc-950 hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] font-semibold transition-all">
              <Link href={session ? "/dashboard" : "/login"}>
                {session ? "Dashboard" : "Try It"} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <motion.div 
            initial="hidden" animate="visible" variants={stagger}
            className="max-w-5xl mx-auto text-center space-y-8"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-medium tracking-wide">
              <Sparkles className="w-4 h-4" />
              Powered by Google Gemini 2.5 Flash
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-sm leading-tight">
              Hyper-Personalized Cold Emails <br className="hidden md:block"/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">
                Generated in Seconds.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-400 font-medium leading-relaxed">
              Stop writing generic applications. Auto Mail synthesizes your digital footprint and target roles to craft the perfect email, directly dispatched via Gmail integrations.
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] border border-indigo-400/20 font-bold transition-all">
                <Link href={session ? "/dashboard" : "/login"}>
                  {session ? "Open Dashboard" : "Try It"} <Zap className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-24 px-6 border-t border-white/5 bg-zinc-950/50 backdrop-blur-3xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/0 to-zinc-950 pointer-events-none" />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">The Engineering Pipeline</h2>
              <p className="text-zinc-400 text-lg font-medium max-w-2xl mx-auto">Built for developers and professionals who want to scale their outreach without sacrificing personalization.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: <Bot className="w-6 h-6 text-indigo-400" />, title: "Neural Synthesis", desc: "Uses the Google Gemini Flash API to inject your Resume, GitHub, and Portfolio data into highly targeted email templates." },
                { icon: <Mail className="w-6 h-6 text-emerald-400" />, title: "Direct Dispatch", desc: "Connects securely to Nodemailer and Gmail App Passwords to natively send emails straight from your own inbox." },
                { icon: <Shield className="w-6 h-6 text-rose-400" />, title: "Role-Based Access", desc: "Enterprise-grade authorization out-of-the-box utilizing NextAuth alongside MongoDB session state management." },
                { icon: <Code2 className="w-6 h-6 text-cyan-400" />, title: "Developer First", desc: "Built entirely on Next.js 14 App Router and strictly typed with TypeScript for maximum performance and stability." },
                { icon: <Zap className="w-6 h-6 text-yellow-400" />, title: "Hyper Responsive", desc: "Ultra-premium glassmorphism UI styled with Tailwind CSS and animated smoothly with Framer Motion." },
                { icon: <Sparkles className="w-6 h-6 text-purple-400" />, title: "Dynamic Templating", desc: "Preview, refine, and edit the AI-generated email payload right before execution in real-time." }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 shadow-xl backdrop-blur-md hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-zinc-400 font-medium leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 relative overflow-hidden">
           <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
           <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white">Ready to automate your applications?</h2>
              <p className="text-xl text-zinc-400 font-medium pb-4">Deploy your first personalized AI email today.</p>
              <Button asChild size="lg" className="h-14 px-10 text-lg bg-white text-zinc-950 hover:bg-zinc-200 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] font-bold transition-all">
                <Link href={session ? "/dashboard" : "/login"}>
                  Open Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
           </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-zinc-950 py-12 text-center text-zinc-500 font-medium text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <Sparkles className="w-4 h-4" /> Auto Mail Platform
          </div>
          <p>© {new Date().getFullYear()} Auto Mail. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
