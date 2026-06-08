"use client";

import { Suspense } from 'react';
import { SignIn } from '@clerk/nextjs';
import { m } from "framer-motion";
import { BackgroundLayers, LeftPanelInfo } from './_components';

function LoginForm() {
  const emptyDeviceInfo = { os: 'Windows', browser: 'Chrome' };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#020202] overflow-hidden selection:bg-primary/30" dir="rtl">
      <BackgroundLayers />
      <m.div
        initial={{ opacity: 0, y: 20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[1150px] grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden rounded-[3rem] border border-white/5 bg-black/40 backdrop-blur-3xl shadow-[0_50px_150px_rgba(0,0,0,0.9)]"
      >
        <LeftPanelInfo deviceInfo={emptyDeviceInfo} />
        <div className="lg:col-span-7 p-10 md:p-16 lg:p-24 bg-[#080808]/50 flex flex-col justify-center items-center">
          <div className="max-w-[440px] mx-auto w-full flex justify-center">
            <SignIn 
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
        </div>
      </m.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
