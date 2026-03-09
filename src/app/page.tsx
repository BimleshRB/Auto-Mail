"use client";

import { useState } from "react";
import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, Sparkles, Zap, Mail, Bot, Shield, Code2, Send, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Script from "next/script";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function LandingPage() {
  const { data: session } = useSession();

  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactStatus, setContactStatus] = useState<'idle'|'success'|'error'>('idle');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setContactStatus('idle');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });

      if (res.ok) {
        setContactStatus('success');
        setContactForm({ name: "", email: "", subject: "", message: "" });
      } else {
        setContactStatus('error');
      }
    } catch (err) {
      setContactStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleCheckout = async (planTier: 'growth' | 'scale') => {
    if (!session?.user) {
       // redirect to login
       window.location.href = '/login';
       return;
    }
    setCheckoutLoading(planTier);
    try {
      // 1. Generate Order ID from our secure backend
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier })
      });
      const data = await res.json();
      
      if (!res.ok) {
         alert(data.error || "Checkout failed");
         setCheckoutLoading(null);
         return;
      }

      // 2. Initialize Razorpay UI
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Auto Mail",
        description: `Upgrade to ${planTier.charAt(0).toUpperCase() + planTier.slice(1)} Plan`,
        order_id: data.orderId,
        handler: async function (response: any) {
           // 3. User paid. Send signatures to our backend for absolute verification
           const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                 razorpayOrderId: response.razorpay_order_id,
                 razorpayPaymentId: response.razorpay_payment_id,
                 razorpaySignature: response.razorpay_signature
              })
           });
           const verifyData = await verifyRes.json();
           if (verifyRes.ok) {
              alert("Payment Verified! Subscription Upgraded. Please refresh your dashboard.");
              window.location.href = '/dashboard';
           } else {
              alert("Payment verification failed: " + verifyData.error);
           }
        },
        prefill: {
          email: session.user.email,
        },
        theme: {
          color: "#4f46e5" // indigo-600
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (err) {
      console.error("Checkout crash", err);
      alert("Checkout failed to initialize. Please check your connection.");
    } finally {
      setCheckoutLoading(null);
    }
  };

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
      
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

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

        {/* Pricing Section */}
        <section id="pricing" className="py-24 px-6 relative border-t border-white/5 bg-zinc-950/80">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Simple, Transparent Pricing</h2>
              <p className="text-zinc-400 text-lg font-medium max-w-2xl mx-auto">Start dispatching for free, scale infinitely when you're ready.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free Tier */}
              <div className="p-8 rounded-3xl bg-zinc-900/40 border border-white/10 shadow-xl backdrop-blur-md flex flex-col relative">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">Hobby</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-extrabold text-white">$0</span>
                    <span className="text-zinc-500 font-medium">/month</span>
                  </div>
                  <p className="text-sm text-zinc-400">Perfect for trying out the AI outreach pipeline.</p>
                </div>
                <div className="space-y-4 mb-8 flex-1">
                  {['50 AI Emails per month', 'Max 2 Gemini API Keys', 'Max 2 Bulk Upload Campaigns', 'Standard Generation Speed'].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-zinc-300 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
                <Button asChild className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 shadow-sm font-bold h-12 rounded-xl transition-all">
                  <Link href="/login">Get Started</Link>
                </Button>
              </div>

              {/* Pro Tier (Highlighted) */}
             <div className="p-8 rounded-3xl bg-indigo-900/20 border border-indigo-500/30 shadow-[0_0_40px_rgba(79,70,229,0.15)] backdrop-blur-md flex flex-col relative transform md:-translate-y-4">
                <div className="absolute top-0 inset-x-0 transform -translate-y-1/2 flex justify-center">
                  <span className="bg-indigo-500 text-white text-xs font-bold px-4 py-1 rounded-full tracking-widest uppercase shadow-md">Most Popular</span>
                </div>
                <div className="mb-6 mt-2">
                  <h3 className="text-xl font-bold text-indigo-300 mb-2">Growth</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-extrabold text-white">$19</span>
                    <span className="text-zinc-500 font-medium">/month</span>
                  </div>
                  <p className="text-sm text-zinc-400">For professionals automating daily outreach.</p>
                </div>
                <div className="space-y-4 mb-8 flex-1">
                  {['5,000 AI Emails per month', 'Up to 10 Gemini API Keys', 'Unlimited Bulk Uploads', 'Smart Load Balancing', 'Fallback Verification Engines'].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-zinc-300 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => handleCheckout('growth')}
                  disabled={checkoutLoading === 'growth'}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] border border-indigo-400/20 font-bold h-12 rounded-xl transition-all"
                >
                  {checkoutLoading === 'growth' ? 'Connecting to Secure Gateway...' : 'Upgrade to Growth'}
                </Button>
              </div>

              {/* Enterprise Tier */}
              <div className="p-8 rounded-3xl bg-zinc-900/40 border border-white/10 shadow-xl backdrop-blur-md flex flex-col relative">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-extrabold text-white">Custom</span>
                  </div>
                  <p className="text-sm text-zinc-400">For agencies managing high-volume pipelines.</p>
                </div>
                <div className="space-y-4 mb-8 flex-1">
                  {['Unmetered API Generations', 'Unlimited API Keys', 'Dedicated IP Whitelisting', 'Priority Email Support', 'Custom Integrations'].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-zinc-300 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-zinc-500 shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
                <Button asChild className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 shadow-sm font-bold h-12 rounded-xl transition-all">
                  <a href="#contact">Contact Sales</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24 px-6 relative border-t border-white/5 bg-zinc-950">
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Get in Touch</h2>
              <p className="text-zinc-400 text-lg font-medium">Have custom requirements or need enterprise support? Let's talk.</p>
            </div>
            
            <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-sm font-bold tracking-wide">Name</Label>
                    <Input 
                      required 
                      value={contactForm.name}
                      onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                      className="bg-zinc-950/50 border-white/10 text-white h-12 rounded-xl focus-visible:ring-indigo-500 focus-visible:border-indigo-500" 
                      placeholder="John Doe" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-sm font-bold tracking-wide">Email</Label>
                    <Input 
                      required 
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                      className="bg-zinc-950/50 border-white/10 text-white h-12 rounded-xl focus-visible:ring-indigo-500 focus-visible:border-indigo-500" 
                      placeholder="john@example.com" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-sm font-bold tracking-wide">Subject</Label>
                  <Input 
                    required 
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                    className="bg-zinc-950/50 border-white/10 text-white h-12 rounded-xl focus-visible:ring-indigo-500 focus-visible:border-indigo-500" 
                    placeholder="Enquiry about..." 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-sm font-bold tracking-wide">Message</Label>
                  <Textarea 
                    required 
                    rows={5}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                    className="bg-zinc-950/50 border-white/10 text-white rounded-xl focus-visible:ring-indigo-500 focus-visible:border-indigo-500 resize-none py-3" 
                    placeholder="Tell us about your requirements..." 
                  />
                </div>

                {contactStatus === 'success' && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" /> Message sent successfully. We'll be in touch soon.
                  </div>
                )}
                {contactStatus === 'error' && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" /> Failed to send message. Please try again.
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-12 bg-white text-zinc-950 hover:bg-zinc-200 font-bold tracking-wide rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmitting ? "Sending..." : "Send Message"} <Send className="w-4 h-4" />
                </Button>
              </form>
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
