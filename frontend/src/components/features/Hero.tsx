
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
      <div className="container px-4 text-center">
        {/* Badge */}
        <div className="mx-auto mb-8 flex max-w-fit items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 backdrop-blur-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">New Feature: AI Tutor</span>
        </div>

        {/* Heading */}
        <h1 className="mx-auto mb-6 max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          Master Your Studies with <br />
          <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            AI-Powered Learning
          </span>
        </h1>

        {/* Subheading */}
        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Tolo provides personalized learning paths, real-time progress tracking, and interactive quizzes to help you excel in your exams.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="h-12 min-w-[200px] px-8 text-base">
            Start Learning Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="h-12 min-w-[200px] px-8 text-base">
            View Analytics
          </Button>
        </div>

        {/* Visual Element (Gradient Blob) */}
        <div className="absolute top-1/2 left-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 opacity-20 dark:opacity-40">
           <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-blue-600 blur-[100px]" />
        </div>
      </div>
    </section>);

}