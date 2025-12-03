import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Trophy, Users, Zap } from 'lucide-react';
import { ProgressSummary } from '@/lib/server-data-fetch';
import { FeaturesSection } from './sections/FeaturesSection';

interface GuestHomeProps {
  summary: ProgressSummary | null;
}

export function GuestHome({ summary }: GuestHomeProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-background">
        <div className="container px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="space-y-4 max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                منصتك التعليمية المتكاملة للثانوية العامة
              </h1>
              <p className="text-xl text-muted-foreground md:text-2xl max-w-[800px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                تعلم بذكاء، تتبع تقدمك، وحقق أهدافك مع أحدث أدوات التعليم الإلكتروني والذكاء الاصطناعي.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-lg gap-2">
                  ابدأ رحلتك مجاناً <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-12 px-8 text-lg">
                  تسجيل الدخول
                </Button>
              </Link>
            </div>

            {/* Stats Preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 pt-8 border-t w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-primary/10 rounded-full text-primary">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold">10k+</h3>
                <p className="text-sm text-muted-foreground">طالب نشط</p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold">500+</h3>
                <p className="text-sm text-muted-foreground">درس تعليمي</p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-yellow-500/10 rounded-full text-yellow-500">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold">100+</h3>
                <p className="text-sm text-muted-foreground">مسابقة</p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-green-500/10 rounded-full text-green-500">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold">24/7</h3>
                <p className="text-sm text-muted-foreground">دعم فني</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
        </div>
      </section>

      {/* Features Section */}
      <FeaturesSection />
    </div>
  );
}
