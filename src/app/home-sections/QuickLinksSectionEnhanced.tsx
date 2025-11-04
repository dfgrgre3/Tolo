import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/shared/card";
import { Button } from "@/shared/button";
import { Badge } from "@/shared/badge";
import { ArrowRight } from "lucide-react";
import { useMemo, memo } from "react";

export const QuickLinksSectionEnhanced = memo(function QuickLinksSectionEnhanced() {
  const quickLinks = useMemo(() => [
    {
      href: "/progress",
      icon: "📈",
      title: "تتبع التقدم",
      description: "شاهد إحصائياتك وتقدمك الأسبوعي",
      delay: 0.1,
      color: "bg-blue-100 group-hover:bg-blue-200"
    },
    {
      href: "/schedule",
      icon: "🗓️",
      title: "الجدول الأسبوعي",
      description: "نظم دروسك ومهامك بسهولة",
      delay: 0.2,
      color: "bg-green-100 group-hover:bg-green-200"
    },
    {
      href: "/resources",
      icon: "📚",
      title: "الموارد الدراسية",
      description: "روابط ومصادر لكل المواد",
      delay: 0.3,
      color: "bg-purple-100 group-hover:bg-purple-200"
    },
    {
      href: "/tasks",
      icon: "✅",
      title: "المهام والتذكيرات",
      description: "إدارة مهامك وتنبيهاتك",
      delay: 0.4,
      color: "bg-orange-100 group-hover:bg-orange-200"
    }
  ], []);

  return (
    <section className="mt-6" aria-labelledby="quick-links-heading">
      <motion.h2 
        id="quick-links-heading"
        className="text-xl md:text-2xl font-bold mb-4 text-primary flex items-center gap-2"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <span>روابط سريعة</span>
        <span className="text-lg" aria-hidden="true">⚡</span>
      </motion.h2>
      
      <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-4">
        {quickLinks.map((link, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: link.delay, duration: 0.5 }}
            whileHover={{ y: -5 }}
            className="h-full"
          >
            <Link 
              href={link.href}
              className="group h-full"
            >
              <Card className="h-full border-border shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className={`w-14 h-14 rounded-full ${link.color} flex items-center justify-center mb-4 transition-colors duration-300`}>
                    <span className="text-2xl">{link.icon}</span>
                  </div>
                  <h3 className="font-semibold text-base md:text-lg mb-2">{link.title}</h3>
                  <p className="text-muted-foreground text-xs md:text-sm flex-grow">{link.description}</p>
                  <Button 
                    variant="link" 
                    size="sm"
                    className="mt-3 p-0 h-auto group-hover:gap-1 transition-all"
                  >
                    <span>تصفح</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
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
        className="mt-6 text-center"
      >
        <Link href="/dashboard">
          <Button variant="outline" className="border-primary hover:bg-primary/5">
            عرض جميع الخدمات
          </Button>
        </Link>
      </motion.div>
    </section>
  );
});
QuickLinksSectionEnhanced.displayName = "QuickLinksSectionEnhanced";

export default QuickLinksSectionEnhanced;
