'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Root Loading Component
 * 
 * This component provides an immediate visual feedback during page transitions.
 * It uses a premium design with a smooth progress bar and a subtle spinner.
 */
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-opacity duration-300">
      {/* Top progress line mimic */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[101] overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center gap-6">
        {/* Modern Spinner */}
        <div className="relative h-16 w-16">
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-primary/20"
            initial={false}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{
              repeat: Infinity,
              duration: 1,
              ease: "linear",
            }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-4 border-primary/10"
            initial={false}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-primary border-b-transparent border-l-transparent"
            animate={{ rotate: -360 }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "linear",
            }}
          />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-1">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
          >
            جاري التحميل...
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-muted-foreground"
          >
            نحن نجهز لك محتوى مبهر
          </motion.p>
        </div>
      </div>
    </div>
  );
}
