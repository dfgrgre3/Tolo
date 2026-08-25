'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY } from '../design-system';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: '1',
    question: 'كيف أبدأ في التعلم على منصة ثنائي؟',
    answer: 'بسيط جداً! قم بالتسجيل المجاني، ابحث عن الكورس الذي تريده، وابدأ التعلم فوراً. جميع الكورسات متاحة فوراً بعد التسجيل.',
    category: 'البدء',
  },
  {
    id: '2',
    question: 'هل المحتوى موثوق ومن خبراء حقيقيين؟',
    answer: 'نعم، جميع مدرسينا متخصصون وذوو خبرة عملية. نقوم بمراجعة صارمة لجودة المحتوى قبل نشره.',
    category: 'الجودة',
  },
  {
    id: '3',
    question: 'هل أحصل على شهادة بعد إنهاء الكورس؟',
    answer: 'نعم، ستحصل على شهادة إتمام معتمدة قابلة للمشاركة على LinkedIn والسيرة الذاتية.',
    category: 'الشهادات',
  },
  {
    id: '4',
    question: 'ماذا لو لم أستطع متابعة الكورس بسرعة معينة؟',
    answer: 'لا مشكلة، جميع الكورسات متاحة طوال الوقت. تعلم بسرعتك الخاصة وبدون ضغط.',
    category: 'المرونة',
  },
  {
    id: '5',
    question: 'هل يمكنني استرجاع أموالي إذا لم أعجب بالكورس؟',
    answer: 'نعم، لدينا سياسة استرجاع 30 يوم بدون أي أسئلة. ضمان كامل لرضاك.',
    category: 'السياسات',
  },
  {
    id: '6',
    question: 'هل يوجد دعم من المدرس أثناء الكورس؟',
    answer: 'نعم، يمكنك طرح الأسئلة والتواصل مع المدرس مباشرة. نحن هنا لمساعدتك في كل خطوة.',
    category: 'الدعم',
  },
  {
    id: '7',
    question: 'هل أحتاج لمتطلبات معينة قبل البدء؟',
    answer: 'معظم الكورسات مخصصة للمبتدئين. سيتم توضيح أي متطلبات مسبقة في وصف الكورس.',
    category: 'المتطلبات',
  },
  {
    id: '8',
    question: 'كيف أختار الكورس المناسب لي؟',
    answer: 'ابحث حسب المجال أو المستوى. اقرأ وصف الكورس والتقييمات. يمكنك أيضاً الاستفسار من الدعم.',
    category: 'الاختيار',
  },
];

/**
 * FAQ Item Component
 */
function FAQItemComponent({ item, isOpen, onToggle }: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] overflow-hidden hover:border-[#0F766E] dark:hover:border-orange-500 transition-colors">
      {/* Question */}
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-start justify-between bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-750 transition-colors text-right"
        aria-expanded={isOpen}
      >
        <div className="flex-1 text-right">
          <p className="text-sm font-bold text-[#1E293B] dark:text-white text-right">
            {item.question}
          </p>
          {item.category && (
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              {item.category}
            </p>
          )}
        </div>
        <div className="ml-4 shrink-0">
          <ChevronDown
            className={`h-5 w-5 text-[#0F766E] dark:text-orange-500 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Answer */}
      {isOpen && (
        <div className="px-6 py-4 bg-[#F8FAFC] dark:bg-slate-900 border-t border-[#E2E8F0] dark:border-slate-700 text-right">
          <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
            {item.answer}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * FAQSection
 *
 * Displays frequently asked questions to help new users
 */
export function FAQSection() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(['1']));

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <section className="py-16 bg-white border-b border-[#E2E8F0] dark:bg-slate-900 dark:border-slate-800">
      <div className={CONTAINER.className}>
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <HelpCircle className="h-6 w-6 text-[#0F766E] dark:text-orange-500" />
            <h2 className={TYPOGRAPHY.sectionHeading}>
              الأسئلة الشائعة
            </h2>
          </div>
          <p className={TYPOGRAPHY.sectionSubheading}>
            إجابات على الأسئلة التي قد تكون لديك
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="max-w-3xl mx-auto space-y-3">
          {FAQ_ITEMS.map((item) => (
            <FAQItemComponent
              key={item.id}
              item={item}
              isOpen={openItems.has(item.id)}
              onToggle={() => toggleItem(item.id)}
            />
          ))}
        </div>

        {/* Additional Help */}
        <div className="mt-12 p-6 bg-gradient-to-br from-emerald-50 dark:from-orange-500/10 to-emerald-100/50 dark:to-orange-600/10 border border-emerald-200 dark:border-orange-500/30 rounded-[12px] text-center">
          <p className="text-sm font-bold text-[#1E293B] dark:text-white mb-3">
            لم تجد ما تبحث عنه؟
          </p>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mb-4">
            فريقنا متاح لمساعدتك 24/7 عبر البريد الإلكتروني والدردشة المباشرة
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button className="px-4 py-2 bg-white dark:bg-slate-800 text-[#0F766E] dark:text-orange-500 border border-[#0F766E] dark:border-orange-500 text-sm font-bold rounded-[8px] hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors">
              📧 اتصل بنا
            </button>
            <button className="px-4 py-2 bg-white dark:bg-slate-800 text-[#0F766E] dark:text-orange-500 border border-[#0F766E] dark:border-orange-500 text-sm font-bold rounded-[8px] hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors">
              💬 الدردشة المباشرة
            </button>
            <button className="px-4 py-2 bg-white dark:bg-slate-800 text-[#0F766E] dark:text-orange-500 border border-[#0F766E] dark:border-orange-500 text-sm font-bold rounded-[8px] hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors">
              📚 مركز المساعدة
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
