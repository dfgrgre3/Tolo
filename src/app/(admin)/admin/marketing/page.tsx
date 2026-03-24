"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { SearchInput } from "@/components/admin/ui/admin-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Send, Target, Sparkles, Gift, BellRing, Users, MailOpen } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function MarketingPage() {
  const [audience, setAudience] = React.useState("challenge_winners");
  const [rewardType, setRewardType] = React.useState("xp");
  const [isSending, setIsSending] = React.useState(false);

  // Stats mock
  const stats = {
    delivered: 12450,
    opened: "68%",
    lootsClaimed: 11020,
  };

  const handleLaunchCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      toast.success("تم إطلاق حملة الغنائم بنجاح لكافة المحاربين المستهدفين!");
    }, 2000);
  };

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="مركز التسويق الداخلي وحملات الغنائم (CRM)"
        description="تواصل مع جيش المحاربين بدقة. حدد الفئة المستهدفة، جهز رسالتك المحفزة، وأسقط لهم الغنائم (Loot Drops) لزيادة ارتباطهم بالمنصة."
      >
        <div className="flex bg-accent rounded-xl p-1 border">
           <AdminButton variant="outline" className="border-none shadow-none font-black text-primary">حملة جديدة</AdminButton>
           <AdminButton variant="ghost" className="text-muted-foreground hover:text-foreground font-bold">الحملات السابقة</AdminButton>
        </div>
      </PageHeader>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <AdminCard variant="glass" className="p-5 border-blue-500/20">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-sm font-bold text-muted-foreground">إجمالي الرسائل المُرسلة</p>
               <h3 className="text-3xl font-black mt-2 text-blue-500">{stats.delivered}</h3>
             </div>
             <MailOpen className="w-8 h-8 text-blue-500/50" />
           </div>
         </AdminCard>
         <AdminCard variant="glass" className="p-5 border-emerald-500/20">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-sm font-bold text-muted-foreground">معدل التفاعل والنقر (CTR)</p>
               <h3 className="text-3xl font-black mt-2 text-emerald-500">{stats.opened}</h3>
             </div>
             <Target className="w-8 h-8 text-emerald-500/50" />
           </div>
         </AdminCard>
         <AdminCard variant="glass" className="p-5 border-orange-500/20">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-sm font-bold text-muted-foreground">صناديق نادرة تم فتحها</p>
               <h3 className="text-3xl font-black mt-2 text-orange-500">{stats.lootsClaimed}</h3>
             </div>
             <Gift className="w-8 h-8 text-orange-500/50" />
           </div>
         </AdminCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <AdminCard variant="glass" className="p-6 border-border/50 shadow-sm relative overflow-hidden">
             
             <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Send className="w-40 h-40" />
             </div>

             <h3 className="text-xl font-black flex items-center gap-2 mb-6 text-primary">
               <Sparkles className="w-5 h-5" />
               صياغة حملة الغنائم (Loot Drop)
             </h3>

             <form onSubmit={handleLaunchCampaign} className="space-y-6 relative z-10">
               {/* Target Audience */}
               <div className="space-y-3">
                 <label className="text-sm font-bold block flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    الفئة المستهدفة (الكتائب)
                 </label>
                 <Select value={audience} onValueChange={setAudience}>
                   <SelectTrigger className="w-full h-12 rounded-xl text-right font-bold bg-background">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">جميع المحاربين المسجلين (Broadcast)</SelectItem>
                     <SelectItem value="challenge_winners">أبطال التحدي السابق فقط</SelectItem>
                     <SelectItem value="inactive_7">المنسحبين (غير متفاعلين منذ أسبوع)</SelectItem>
                     <SelectItem value="top_100">النخبة (أعلى 100 في الـ Leaderboard)</SelectItem>
                   </SelectContent>
                 </Select>
                 <p className="text-xs text-muted-foreground font-medium">العدد المتوقع: <span className="text-primary font-black">450 محارب</span></p>
               </div>

               {/* Reward Type */}
               <div className="space-y-3">
                 <label className="text-sm font-bold block flex items-center gap-2">
                    <Gift className="w-4 h-4 text-orange-500" />
                    نوع الغنيمة المرفقة
                 </label>
                 <Select value={rewardType} onValueChange={setRewardType}>
                   <SelectTrigger className="w-full h-12 rounded-xl text-right font-bold bg-background">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="xp">نقاط خبرة (XP) مجانية</SelectItem>
                     <SelectItem value="badge">شارة شرفية استثنائية (Badge)</SelectItem>
                     <SelectItem value="discount">كوبون خصم لاشتراك جديد</SelectItem>
                     <SelectItem value="none">بدون غنيمة (رسالة تشجيعية فقط)</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               
               {rewardType === "xp" && (
                 <div className="space-y-3">
                   <label className="text-sm font-bold block">مبلغ الـ XP</label>
                   <SearchInput type="number" placeholder="مثال: 500" defaultValue="500" className="bg-background h-12 text-center text-lg font-black text-amber-500" />
                 </div>
               )}

               {/* Message Details */}
               <div className="space-y-3 pt-4 border-t border-border/50">
                 <label className="text-sm font-bold block flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-blue-500" />
                    عنوان الإشعار (Notification Title)
                 </label>
                 <SearchInput placeholder="مثال: غنيمة أسطورية لمعركتك القادمة!" defaultValue="🎁 هدية من القيادة العُليا" className="bg-background h-12 font-bold" />
               </div>

               <div className="space-y-3">
                 <label className="text-sm font-bold block">محتوى البريد / التنبيه</label>
                 <Textarea 
                   placeholder="اكتب رسالتك الموجهة للمحاربين بثقة وحماس..." 
                   className="min-h-[140px] resize-none bg-background rounded-xl p-4 border-border font-medium"
                   defaultValue={`أيها المحارب المغوار، لقد أثبت كفاءتك في المعارك السابقة. تقديراً لجهودك، أرسلنا لك هذه الغنيمة لترفع من تصنيفك. استمر في القتال!`}
                 />
               </div>

               <AdminButton 
                  type="submit" 
                  size="lg" 
                  loading={isSending}
                  icon={Send}
                  className="w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest gap-2 bg-gradient-to-l from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all"
               >
                 إطلاق الحملة الآن (Launch)
               </AdminButton>

             </form>
          </AdminCard>
        </motion.div>

        {/* Live Preview / History Mock */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
           <div className="bg-accent/40 rounded-2xl p-6 border border-border/50 shadow-inner min-h-[400px]">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6 text-center">المعاينة الحية للمحارب (Live Preview)</h4>
              
              <div className="max-w-[320px] mx-auto bg-background rounded-[2rem] border-4 border-border shadow-2xl overflow-hidden relative min-h-[450px]">
                {/* Status bar mock */}
                <div className="bg-foreground/5 h-6 w-full flex justify-center pt-1.5">
                   <div className="w-16 h-1.5 bg-foreground/20 rounded-full"></div>
                </div>
                
                <div className="p-4 mt-6">
                   <motion.div 
                     initial={{ y: -20, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     transition={{ delay: 0.5 }}
                     className="bg-card rounded-2xl p-4 shadow-lg border border-border/50 relative overflow-hidden"
                   >
                     {rewardType === 'xp' && (
                       <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                     )}
                     <div className="flex items-start gap-3 relative z-10">
                        <div className="p-2 bg-primary/10 rounded-full text-primary shrink-0">
                          {rewardType === 'xp' ? <Gift className="w-6 h-6" /> : <BellRing className="w-6 h-6" />}
                        </div>
                        <div>
                          <h5 className="font-bold text-sm leading-tight">🎁 هدية من القيادة العُليا</h5>
                          <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">أيها المحارب المغوار، لقد أثبت كفاءتك في المعارك السابقة. تقديراً لجهودك، أرسلنا لك هذه الغنيمة لترفع من تصنيفك.</p>
                          
                          {rewardType === 'xp' && (
                            <div className="mt-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-black text-center py-1.5 rounded-lg">
                              +500 XP
                            </div>
                          )}
                          {!['none', 'xp'].includes(rewardType) && (
                            <div className="mt-3 bg-primary/10 text-primary border border-primary/20 text-xs font-black text-center py-1.5 rounded-lg">
                              استلام الغنيمة
                            </div>
                          )}
                        </div>
                     </div>
                   </motion.div>
                </div>
              </div>
           </div>
        </motion.div>
      </div>
    </div>
  );
}
