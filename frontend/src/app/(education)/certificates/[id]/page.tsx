"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { m } from "framer-motion";
import { Award, Download, Share2, Printer, CheckCircle2, ShieldCheck, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

export default function CertificatePage() {
  const params = useParams();
  const { fetchWithAuth } = useAuth();
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCert = async () => {
      try {
        const res = await fetchWithAuth(`/api/certificates/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setCert(data.certificate);
        } else {
          toast.error("فشل في تحميل الشهادة");
        }
      } catch (error) {
        console.error("Error fetching cert:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchCert();
  }, [params.id, fetchWithAuth]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0D14]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0D14] text-white p-4">
        <Award className="w-16 h-16 text-gray-600 mb-4" />
        <h1 className="text-2xl font-black">الشهادة غير موجودة</h1>
        <p className="text-gray-400 mt-2">عذراً، لم نتمكن من العثور على سجل لهذه الشهادة.</p>
      </div>
    );
  }

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#0B0D14] text-white py-12 px-4 selection:bg-primary/30" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Actions Bar - Hidden on Print */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 print:hidden">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black">شهادة إتمام معتمدة</h1>
              <p className="text-xs text-gray-400 font-bold">رقم الشهادة: {cert.id}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={handlePrint} variant="outline" className="rounded-xl gap-2 font-bold border-white/10 hover:bg-white/5">
              <Printer className="w-4 h-4" />
              طباعة / PDF
            </Button>
            <Button className="rounded-xl gap-2 font-black bg-primary hover:bg-primary/90 text-white">
              <Share2 className="w-4 h-4" />
              مشاركة الإنجاز
            </Button>
          </div>
        </div>

        {/* --- THE CERTIFICATE DESIGN --- */}
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white text-[#1a1a1a] p-1 shadow-2xl rounded-sm print:shadow-none print:m-0"
        >
          {/* Outer Border */}
          <div className="border-[16px] border-[#1a1a1a] p-2 relative overflow-hidden">
            {/* Inner Border */}
            <div className="border-[2px] border-[#d4af37] p-12 md:p-24 flex flex-col items-center text-center space-y-12 relative">
              
              {/* Corner Ornaments */}
              <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-[#d4af37]" />
              <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-[#d4af37]" />
              <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-[#d4af37]" />
              <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-[#d4af37]" />

              {/* Background Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <Award className="w-[500px] h-[500px]" />
              </div>

              {/* Header */}
              <div className="space-y-4 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 bg-[#1a1a1a] flex items-center justify-center rounded-full border-4 border-[#d4af37]">
                    <Award className="w-12 h-12 text-[#d4af37]" />
                  </div>
                </div>
                <h2 className="text-4xl md:text-6xl font-serif font-black tracking-widest uppercase">شهادة إتمام</h2>
                <div className="h-1 w-32 bg-[#d4af37] mx-auto" />
              </div>

              {/* Recipient */}
              <div className="space-y-6 relative z-10">
                <p className="text-xl font-medium text-gray-600">نُشهد بأن الطالب / الطالبة</p>
                <h3 className="text-4xl md:text-5xl font-black text-[#1a1a1a] underline decoration-[#d4af37] decoration-4 underline-offset-8">
                  {cert.user.name}
                </h3>
              </div>

              {/* Course Info */}
              <div className="space-y-6 relative z-10 max-w-2xl">
                <p className="text-xl leading-relaxed">
                  قد أكمل بنجاح كافة المتطلبات والدروس التعليمية للدورة التدريبية:
                </p>
                <h4 className="text-3xl font-black text-primary">
                   {cert.subject.nameAr || cert.subject.name}
                </h4>
                <div className="flex items-center justify-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
                  <span className="h-px w-8 bg-gray-300" />
                  بتاريخ {issuedDate}
                  <span className="h-px w-8 bg-gray-300" />
                </div>
              </div>

              {/* Signatures */}
              <div className="w-full pt-16 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
                <div className="flex flex-col items-center">
                  <div className="h-16 flex items-end mb-2">
                    <img src="/signatures/director.png" alt="Director Signature" className="h-12 object-contain grayscale opacity-80" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                  <div className="w-48 h-px bg-gray-400 mb-2" />
                  <p className="text-sm font-bold">مدير الأكاديمية</p>
                  <p className="text-[10px] text-gray-400">منصة ثانوي التعليمية</p>
                </div>

                <div className="flex flex-col items-center">
                   <div className="w-24 h-24 border-4 border-[#d4af37] rounded-full flex items-center justify-center text-[#d4af37] rotate-12 opacity-80">
                      <div className="text-center">
                        <p className="text-[8px] font-black leading-none">VERIFIED</p>
                        <ShieldCheck className="w-8 h-8 mx-auto my-0.5" />
                        <p className="text-[6px] font-bold tracking-tighter">OFFICIAL SEAL</p>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="h-16 flex items-end mb-2">
                    <p className="font-cursive text-2xl text-gray-600 opacity-80">{cert.subject.instructorName || "مدرس الدورة"}</p>
                  </div>
                  <div className="w-48 h-px bg-gray-400 mb-2" />
                  <p className="text-sm font-bold">محاضر الدورة</p>
                  <p className="text-[10px] text-gray-400">قسم المواد العلمية</p>
                </div>
              </div>

              {/* QR Code Placeholder */}
              <div className="absolute bottom-8 right-8 text-center print:bottom-4 print:right-4">
                 <div className="w-20 h-20 bg-gray-100 border border-gray-200 flex items-center justify-center text-[8px] text-gray-400">
                   QR CODE VERIFICATION
                 </div>
                 <p className="text-[8px] mt-1 text-gray-400">تأكد من صحة الشهادة</p>
              </div>

            </div>
          </div>
        </m.div>

        {/* Bottom Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold">إتمام الدروس</p>
              <p className="text-2xl font-black">100%</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold">مستوى الكفاءة</p>
              <p className="text-2xl font-black">خبير</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold">النقاط المكتسبة</p>
              <p className="text-2xl font-black">+250 XP</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
