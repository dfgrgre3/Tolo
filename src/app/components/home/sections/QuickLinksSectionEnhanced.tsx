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
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-6 mb-12"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-400/30 rounded-2xl blur-lg animate-pulse" />
          <div className="p-4 bg-black/40 rounded-2xl border-2 border-yellow-500/30 backdrop-blur-xl shadow-[0_0_20px_rgba(234,179,8,0.2)]">
              <Zap className="h-8 w-8 text-yellow-400 fill-yellow-400/20" />
          </div>
        </div>
        <div>
          <h2 
              id="quick-links-heading"
              className={`text-4xl md:text-5xl font-black tracking-tight ${rpgCommonStyles.neonText} mb-1`}
          >
              الانتقال السريع
          </h2>
          <p className="text-gray-400 text-lg font-medium border-r-4 border-yellow-500/30 pr-4">
            Fast Travel: الوصول السريع للمناطق الحيوية في عالمك.
          </p>
        </div>
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
              <Card className={`h-full ${rpgCommonStyles.card} flex flex-col items-center text-center p-0 border-white/5 bg-black/40 backdrop-blur-2xl hover:border-yellow-500/30 transition-all duration-500 relative overflow-hidden group/card shadow-2xl`}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                
                {/* Inner Glow */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 ${link.color} blur-[60px] opacity-10 group-hover/card:opacity-30 transition-opacity duration-700`} />

                <CardContent className="p-8 w-full relative z-10 flex flex-col items-center h-full">
                  <div className={`w-20 h-20 rounded-[1.5rem] ${link.color} border-2 border-white/10 flex items-center justify-center mb-6 transition-all duration-500 group-hover/card:scale-110 group-hover/card:rotate-3 shadow-xl ring-4 ring-black/20`}>
                    {link.icon}
                  </div>
                  <h3 className="font-black text-xl mb-3 text-white group-hover/card:text-yellow-400 transition-colors tracking-tight">{link.title}</h3>
                  <p className="text-gray-400 text-base flex-grow leading-relaxed mb-8 group-hover/card:text-gray-300 transition-colors">{link.description}</p>
                  
                  <div className="w-full h-px bg-white/5 mb-6"></div>
                  
                  <Button 
                    variant="ghost" 
                    size="lg"
                    className="w-full py-6 bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-yellow-500/10 hover:border-yellow-500/20 transition-all font-black text-sm rounded-2xl flex items-center justify-center gap-3"
                  >
                    <span>انتقال فوري</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover/card:-translate-x-2 rtl:rotate-180" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
      

    </section>
  );
});
QuickLinksSectionEnhanced.displayName = "QuickLinksSectionEnhanced";

export default QuickLinksSectionEnhanced;
