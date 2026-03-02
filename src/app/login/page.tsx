"use client";

import { signIn } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Zap, Mail } from "lucide-react";

export default function Login() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 overflow-hidden selection:bg-indigo-500/30">
      
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600 blur-[120px] mix-blend-screen"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -100, 0],
            y: [0, 100, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-600 blur-[120px] mix-blend-screen"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Card className="w-full text-center border-white/10 shadow-2xl backdrop-blur-2xl bg-zinc-900/60 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          
          <CardHeader className="space-y-4 pb-8 pt-10">
            <motion.div 
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)] ring-1 ring-white/20"
            >
              <Zap className="w-8 h-8 text-white drop-shadow-md" />
            </motion.div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                Auto <span className="text-indigo-400">Mail</span>
              </CardTitle>
              <CardDescription className="text-zinc-400 font-medium text-base">
                Intelligent cold email automation.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pb-10 px-6">
            <Button 
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="group relative w-full h-12 text-base font-semibold bg-white text-zinc-950 hover:bg-zinc-100 hover:text-indigo-600 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] overflow-hidden"
            >
              <span className="flex items-center justify-center gap-3 relative z-10">
                <Mail className="w-5 h-5 transition-transform group-hover:scale-110" />
                Continue with Google
              </span>
            </Button>
            <p className="mt-6 text-sm text-zinc-500 font-medium">
              Secure authentication via Google Workspace.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
