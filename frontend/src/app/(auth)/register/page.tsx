"use client";

import { Suspense } from 'react';
import { SignUp } from '@clerk/nextjs';
import { m } from "framer-motion";
import { BackgroundLayers } from './_components';

function RegisterForm() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center py-12 px-4 bg-[#020202] overflow-hidden selection:bg-primary/30" dir="rtl">
      <BackgroundLayers />
      <m.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="relative w-full max-w-4xl space-y-12 flex flex-col items-center"
      >
        <m.div layout className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-black/60 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] w-full max-w-[500px]">
          <div className="p-8 md:p-12 flex justify-center w-full">
            <SignUp 
              appearance={{
                elements: {
                  cardBox: "w-full flex justify-center shadow-none",
                  card: "bg-transparent border-none shadow-none w-full",
                  headerTitle: "text-white text-2xl font-bold font-sans",
                  headerSubtitle: "text-neutral-400 font-sans",
                  socialButtonsBlockButton: "bg-neutral-900 border border-white/5 text-white hover:bg-neutral-800 transition-colors",
                  socialButtonsBlockButtonText: "text-white font-semibold",
                  formButtonPrimary: "bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-lg hover:shadow-orange-500/20",
                  formFieldLabel: "text-neutral-300 font-medium",
                  formFieldInput: "bg-neutral-900 border border-white/10 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500",
                  footerActionText: "text-neutral-400",
                  footerActionLink: "text-orange-500 hover:text-orange-400 font-bold",
                  identityPreviewText: "text-white",
                  identityPreviewEditButton: "text-orange-500 hover:text-orange-400",
                  formFieldWarningText: "text-yellow-500",
                  formFieldErrorText: "text-red-500 font-medium",
                  alertText: "text-red-500",
                  dividerText: "text-neutral-400",
                  dividerLine: "bg-neutral-800",
                  backLink: "text-orange-500 hover:text-orange-400 font-bold",
                  alternativeMethodsBlockButton: "bg-neutral-900 border border-white/5 text-white hover:bg-neutral-800 transition-colors"
                }
              }}
            />
          </div>
        </m.div>
      </m.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
