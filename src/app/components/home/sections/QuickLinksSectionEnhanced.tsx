import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Map, Calendar, Library, CheckSquare, Zap } from "lucide-react";
import { useMemo, memo } from "react";
import { rpgCommonStyles } from "../constants";

export const QuickLinksSectionEnhanced = memo(function QuickLinksSectionEnhanced() {
  const quickLinks = useMemo(() => [
    {
      href: "/progress",
      icon: <Map className="h-6 w-6 text-blue-400" />,
      title: "خريطة التقدم (World Map)",
      description: "راقب توسع نفوذك وإنجازاتك في اللعبة",
      delay: 0.1,
      color: "bg-blue-500/10 border-blue-500/20"
    },
    {
      href: "/schedule",
      icon: <Calendar className="h-6 w-6 text-green-400" />,
      title: "سجل المهام (Quest Log)",
      description: "المهام اليومية والأحداث الموقوتة",
      delay: 0.2,
      color: "bg-green-500/10 border-green-500/20"
    },
    {
      href: "/resources",
      icon: <Library className="h-6 w-6 text-purple-400" />,
      title: "الأرشيف السري (Archives)",
      description: "المخطوطات والأسلحة المعرفية النادرة",
      delay: 0.3,
      color: "bg-purple-500/10 border-purple-500/20"
    },
    {
      href: "/tasks",
      icon: <CheckSquare className="h-6 w-6 text-amber-400" />,
      title: "لوحة الأوامر (Command Center)",
      description: "إدارة العمليات والمهام النشطة",
      delay: 0.4,
      color: "bg-amber-500/10 border-amber-500/20"
    }
  ], []);

  return (
    <section className="mt-12 max-w-7xl mx-auto px-4" aria-labelledby="quick-links-heading">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
            <Zap className="h-6 w-6 text-yellow-400 animate-pulse" />
        </div>
        <h2 
            id="quick-links-heading"
            className={`text-2xl md:text-3xl font-bold ${rpgCommonStyles.neonText}`}
        >
            الانتقال السريع (Fast Travel)
        </h2>
      </motion.div>
      
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: link.delay, duration: 0.5 }}
            whileHover={{ y: -8 }}
            className="h-full"
          >
            <Link 
              href={link.href}
              className="group h-full block"
            >
              <Card className={`h-full ${rpgCommonStyles.card} flex flex-col items-center text-center p-0 border-transparent hover:border-primary/30`}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="p-6 w-full relative z-10 flex flex-col items-center h-full">
                  <div className={`w-16 h-16 rounded-2xl ${link.color} border flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 shadow-[0_0_15px_rgba(0,0,0,0.2)]`}>
                    {link.icon}
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-gray-100 group-hover:text-primary transition-colors">{link.title}</h3>
                  <p className="text-gray-400 text-sm flex-grow leading-relaxed mb-4">{link.description}</p>
                  
                  <div className="w-full h-px bg-white/10 mb-4"></div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full text-primary hover:text-primary hover:bg-white/5 group-hover:bg-primary/10 transition-all font-medium"
                  >
                    <span>انتقال فوري</span>
                    <ArrowRight className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <Link href="/dashboard">
          <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white backdrop-blur-sm px-8">
            استكشاف الخريطة الكاملة
          </Button>
        </Link>
      </motion.div>
    </section>
  );
});
QuickLinksSectionEnhanced.displayName = "QuickLinksSectionEnhanced";

export default QuickLinksSectionEnhanced;
