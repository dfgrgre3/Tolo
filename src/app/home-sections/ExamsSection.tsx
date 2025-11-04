import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import Link from "next/link";

// --- Skeleton Components for Loading State ---

const SubjectCardSkeleton = () => (
    <div className="bg-gray-200 rounded-xl p-4 text-center animate-pulse">
        <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-3"></div>
        <div className="w-20 h-4 bg-gray-300 rounded mx-auto"></div>
    </div>
);

const StatCardSkeleton = () => (
    <div className="bg-white/30 backdrop-blur-sm rounded-xl p-4 text-center border border-gray-200 animate-pulse">
        <div className="w-10 h-10 bg-gray-300 rounded-full mx-auto mb-3"></div>
        <div className="w-16 h-6 bg-gray-300 rounded mx-auto mb-2"></div>
        <div className="w-24 h-4 bg-gray-300 rounded mx-auto"></div>
    </div>
);


// --- Presentational Components ---

const SubjectCard = memo(({ emoji, name, onClick }: { emoji: string; name: string; onClick: () => void }) => (
    <button
        onClick={onClick}
        className="bg-white rounded-xl p-4 text-center shadow-md transition-all duration-300 hover:shadow-xl hover:scale-105 transform hover:border-primary border-2 border-transparent cursor-pointer w-full"
        aria-label={`اختر مادة ${name}`}
    >
        <div className="text-4xl mb-2" role="img" aria-hidden="true">{emoji}</div>
        <div className="text-sm font-semibold text-gray-800">{name}</div>
    </button>
));
SubjectCard.displayName = "SubjectCard";

const StatCard = memo(({ icon, value, label }: { icon: string; value: string; label: string }) => {
    const [count, setCount] = useState(0);
    const cardRef = useRef(null);
    const endValue = useMemo(() => parseInt(value.replace(/k|\+/g, '')) * (value.includes('k') ? 1000 : 1), [value]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                let frame = 0;
                const totalFrames = 120; // Animate over 2 seconds (60fps)
                const counter = setInterval(() => {
                    frame++;
                    const progress = frame / totalFrames;
                    const currentCount = Math.round(endValue * progress);
                    setCount(currentCount);
                    if (frame === totalFrames) {
                        clearInterval(counter);
                        setCount(endValue); // Ensure it ends on the exact value
                    }
                }, 16.67);
                observer.unobserve(cardRef.current);
            }
        }, { threshold: 0.1 });

        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, [endValue]);

    const formatDisplayValue = (num) => {
        if (value.includes('k')) return `${Math.floor(num / 1000)}k+`;
        return `${num}+`;
    };

    return (
        <div ref={cardRef} className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center border border-gray-200/50 shadow-sm" role="region" aria-label={label}>
            <div className="text-3xl mb-2" role="img" aria-hidden="true">{icon}</div>
            <div className="text-2xl font-bold text-primary tabular-nums" aria-live="polite">{formatDisplayValue(count)}</div>
            <p className="text-sm text-gray-600">{label}</p>
        </div>
    );
});
StatCard.displayName = "StatCard";

// --- New Modal Component for Exams ---

const ExamsModal = memo(({ subject, onClose }: { subject: any; onClose: () => void }) => {
    const handleEsc = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [handleEsc]);

    if (!subject) return null;

    const difficultyStyles = {
        "سهل": "bg-green-100 text-green-800",
        "متوسط": "bg-yellow-100 text-yellow-800",
        "صعب": "bg-red-100 text-red-800",
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exams-modal-title"
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 transform transition-all duration-300 scale-95 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 id="exams-modal-title" className="text-2xl font-bold text-primary flex items-center gap-3">
                        <span className="text-4xl" aria-hidden="true">{subject.emoji}</span>
                        <span>امتحانات مادة {subject.name}</span>
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-700 transition-colors text-3xl"
                        aria-label="إغلاق النافذة"
                    >
                        &times;
                    </button>
                </div>
                <div className="space-y-4">
                    {subject.exams.map(exam => (
                        <div key={exam.id} className="bg-gray-50 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-gray-200">
                            <div>
                                <h4 className="font-semibold text-gray-800">{exam.title}</h4>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                    <span>⏳ {exam.duration} دقيقة</span>
                                    <span>❓ {exam.questionCount} سؤال</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${difficultyStyles[exam.difficulty]}`}>{exam.difficulty}</span>
                                </div>
                            </div>
                            <Link 
                                href={`/exams/${exam.id}`}
                                className="bg-primary text-white px-5 py-2 rounded-lg font-medium whitespace-nowrap shadow-md hover:bg-primary/90 transition-all duration-200 w-full sm:w-auto inline-block text-center"
                            >
                                ابدأ الامتحان
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});
ExamsModal.displayName = "ExamsModal";

// --- Main Advanced Component ---

function ExamsSectionComponent() {
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [stats, setStats] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSubject, setSelectedSubject] = useState<any>(null);

    // Simulate fetching structured data from an API
    useEffect(() => {
        const timer = setTimeout(() => {
            setSubjects([
                { emoji: "📚", name: "الرياضيات", exams: [
                    { id: 1, title: "نموذج التفاضل والتكامل 2023", duration: 180, questionCount: 25, difficulty: "صعب" },
                    { id: 2, title: "امتحان الجبر والهندسة الفراغية التجريبي", duration: 180, questionCount: 25, difficulty: "متوسط" },
                    { id: 3, title: "مراجعة نهائية استاتيكا", duration: 120, questionCount: 20, difficulty: "سهل" },
                ]},
                { emoji: "⚗️", name: "الكيمياء", exams: [
                    { id: 4, title: "امتحان الكيمياء العضوية الشامل", duration: 180, questionCount: 45, difficulty: "صعب" },
                    { id: 5, title: "نموذج تجريبي (الباب الأول والثاني)", duration: 90, questionCount: 30, difficulty: "متوسط" },
                ]},
                { emoji: "🔬", name: "الفيزياء", exams: [
                    { id: 6, title: "امتحان الفصل الأول (التيار الكهربي)", duration: 60, questionCount: 20, difficulty: "متوسط" },
                    { id: 7, title: "نموذج شامل على الفيزياء الحديثة", duration: 120, questionCount: 35, difficulty: "صعب" },
                ]},
                { emoji: "🇬🇧", name: "اللغة الإنجليزية", exams: [{ id: 8, title: "Final Revision Test (Units 1-6)", duration: 120, questionCount: 50, difficulty: "متوسط" }]},
                { emoji: "📝", name: "اللغة العربية", exams: [{ id: 9, title: "امتحان شامل على البلاغة والنصوص", duration: 90, questionCount: 40, difficulty: "صعب" }]},
            ]);
            setStats([
                { icon: "📄", value: "150+", label: "نموذج امتحان" },
                { icon: "🎓", value: "10k+", label: "طالب مشارك" },
                { icon: "💡", value: "50k+", label: "سؤال تمت إجابته" }
            ]);
            setLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    const filteredSubjects = useMemo(() =>
        subjects.filter(subject =>
            subject.name.toLowerCase().includes(searchTerm.toLowerCase())
        ), [subjects, searchTerm]
    );

    return (
        <>
            <section className="mt-8 py-10 px-4 bg-gradient-to-b from-blue-50 to-indigo-100 rounded-2xl" aria-labelledby="exams-heading">
                <h2 id="exams-heading" className="text-center text-3xl md:text-4xl font-bold mb-2 text-primary">
                    أهلاً بك يا بطل علمي رياضة! استعد لتحدي جديد.
                </h2>
                <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
                    استعد بثقة من خلال حل أكبر بنك من أسئلة الامتحانات السابقة والنماذج التدريبية في موادك.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                    {loading ? Array(3).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
                             : stats.map((stat) => <StatCard key={stat.label} {...stat} />)
                    }
                </div>

                <div className="group rounded-2xl border bg-white/80 backdrop-blur-lg p-6 shadow-lg transition-shadow duration-300 hover:shadow-2xl">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                        <div>
                            <p className="font-semibold text-xl text-gray-800">ابدأ رحلتك نحو التفوق الآن!</p>
                            <p className="text-muted-foreground text-base">ابحث عن مادة أو اختر من القائمة.</p>
                        </div>
                        <input 
                            type="text"
                            placeholder="🔍 ابحث عن مادة..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition"
                            aria-label="ابحث عن مادة"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {loading ? Array(5).fill(0).map((_, i) => <SubjectCardSkeleton key={i} />)
                                 : filteredSubjects.map((subject) => (
                                     <SubjectCard key={subject.name} {...subject} onClick={() => setSelectedSubject(subject)} />
                                 ))
                        }
                    </div>
                    { !loading && filteredSubjects.length === 0 && (
                        <p className="text-center py-8 text-gray-500">لا توجد مواد تطابق بحثك.</p>
                    )}
                </div>
            </section>
            
            <ExamsModal subject={selectedSubject} onClose={() => setSelectedSubject(null)} />
        </>
    );
}

export const ExamsSection = React.memo(ExamsSectionComponent);
export default ExamsSection;

