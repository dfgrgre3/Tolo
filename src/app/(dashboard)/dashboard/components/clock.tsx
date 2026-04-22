"use client";

import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

export function Clock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('ar-EG', { 
    hour: '2-digit', 
    minute: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div className="text-gray-400 text-sm font-bold flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
      <Calendar className="w-4 h-4 text-primary" />
      {formattedDate} | {formattedTime}
    </div>
  );
}
