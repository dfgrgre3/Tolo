import React, { memo, useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { 
  Trophy, 
  Star, 
  Award, 
  Target, 
  CheckCircle2, 
  BookOpen, 
  Calendar,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Loader2
} from "lucide-react";

// Firebase imports (Mandatory for real-world apps)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc } from 'firebase/firestore';


// --- Internal UI Component Definitions (Memoized) ---
// Note: Memoization helps prevent unnecessary re-renders, reducing CPU load.

const Card = memo(({ className, children }) => (
  <div className={`rounded-xl border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
));

const CardContent = memo(({ className, children }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
));

const Badge = memo(({ className, children }) => (
  <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
    {children}
  </div>
));

const Button = memo(({ className, children, variant = 'default', ...props }) => {
  let baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
  
  if (variant === 'secondary') {
    baseClasses = "bg-white text-yellow-600 hover:bg-yellow-50 px-6 py-3 text-lg border-0 shadow-lg"; 
  } else {
    baseClasses = "bg-primary text-primary-foreground hover:bg-primary/90";
  }

  return (
    <button className={`${baseClasses} ${className}`} {...props}>
      {children}
    </button>
  );
});

const Link = memo(({ href, children }) => (
  <a href={href} className="text-current no-underline">{children}</a>
));

// Mock static data structure 
const ACHIEVEMENTS_STRUCTURE = [
  { id: 'study_hero', icon: <Trophy className="h-8 w-8 text-yellow-500" />, title: "بطل الدراسة", description: "أكمل 10 أيام متتالية من المذاكرة", progress: 70, color: "bg-gradient-to-r from-yellow-400 to-amber-500" },
  { id: 'star_student', icon: <Star className="h-8 w-8 text-blue-500" />, title: "نجم المواد", description: "احصل على معدل 90% في 3 مواد مختلفة", progress: 45, color: "bg-gradient-to-r from-blue-400 to-indigo-500" },
  { id: 'excel_analyst', icon: <Award className="h-8 w-8 text-purple-500" />, title: "محلل ممتاز", description: "استخدم أدوات التحليل 5 أيام متتالية", progress: 80, color: "bg-gradient-to-r from-purple-400 to-pink-500" },
  { id: 'goal_maker', icon: <Target className="h-8 w-8 text-green-500" />, title: "صانع الأهداف", description: "حقق 80% من أهدافك الأسبوعية", progress: 60, color: "bg-gradient-to-r from-green-400 to-emerald-500" },
  { id: 'active_reader', icon: <BookOpen className="h-8 w-8 text-red-500" />, title: "قارئ نشط", description: "اقرأ 5 كتب من المكتبة التعليمية", progress: 30, color: "bg-gradient-to-r from-red-400 to-rose-500" },
  { id: 'time_manager', icon: <Calendar className="h-8 w-8 text-cyan-500" />, title: "منظم الوقت", description: "التزم بجدولك الدراسي لمدة أسبوع", progress: 90, color: "bg-gradient-to-r from-cyan-400 to-blue-500" }
];

const STATS_STRUCTURE = [
    { id: 'completed', icon: <CheckCircle2 className="h-6 w-6" />, value: "0", label: "إنجاز مكتمل", color: "text-green-600" },
    { id: 'points', icon: <Star className="h-6 w-6" />, value: "0", label: "نقطة مكافأة", color: "text-yellow-500" },
    { id: 'rank', icon: <Trophy className="h-6 w-6" />, value: "N/A", label: "مرتبة عالمية", color: "text-purple-600" },
    { id: 'progress', icon: <TrendingUp className="h-6 w-6" />, value: "0%", label: "معدل التقدم", color: "text-blue-600" }
];

const AchievementsLoader = () => (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-['Inter']" dir="rtl">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <div className="h-8 w-40 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
                <div className="h-6 w-64 bg-gray-300 rounded mx-auto mb-4 animate-pulse"></div>
                <div className="h-4 w-96 bg-gray-200 rounded mx-auto animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-white/80 rounded-xl shadow-lg animate-pulse"></div>
                ))}
            </div>
            <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-12">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-40 bg-white rounded-2xl border shadow-lg animate-pulse"></div>
                ))}
            </div>
        </div>
    </div>
);

export function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userAchievements, setUserAchievements] = useState(ACHIEVEMENTS_STRUCTURE);
  const [userStats, setUserStats] = useState(STATS_STRUCTURE);

  // Define environment variables once
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  // Initialize Firebase and Auth State
  useEffect(() => {
    if (!firebaseConfig) {
      console.error("Firebase config is missing. Cannot initialize Firebase.");
      setLoading(false);
      return;
    }

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    // Auth State Listener and Sign-in Logic
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        let currentUserId;
        if (user) {
            currentUserId = user.uid;
        } else {
            // Attempt sign in if token is provided, otherwise sign in anonymously
            try {
                if (initialAuthToken) {
                    const credentials = await signInWithCustomToken(auth, initialAuthToken);
                    currentUserId = credentials.user.uid;
                } else {
                    const credentials = await signInAnonymously(auth);
                    currentUserId = credentials.user.uid;
                }
            } catch (error) {
                console.error("Firebase Auth Error: Failed to sign in.", error);
                // Fallback to anonymous or random ID if sign-in fails
                currentUserId = auth.currentUser?.uid || crypto.randomUUID();
            }
        }
        
        setUserId(currentUserId);
        setIsAuthReady(true);
    });

    // CRITICAL for memory consumption: Clean up Auth listener on unmount
    return () => unsubscribeAuth();
  }, [firebaseConfig, initialAuthToken]); // Dependencies are static config values

  // Fetch Firestore Data Listeners
  useEffect(() => {
    // Return early if not ready
    if (!isAuthReady || !userId || !firebaseConfig) return;

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const achievementRef = collection(db, 'artifacts', appId, 'users', userId, 'userAchievements');
    const statsDocRef = doc(db, 'artifacts', appId, 'users', userId, 'userStats', 'summary');

    // 1. Achievements Listener
    const unsubscribeAchievements = onSnapshot(achievementRef, (snapshot) => {
      let liveAchievements = snapshot.docs.map(d => ({
        ...ACHIEVEMENTS_STRUCTURE.find(a => a.id === d.id), // Merge static info (icon, color)
        ...d.data(), // Override with live data (progress, title/desc if customized)
        id: d.id,
      })).filter(a => a.id); 
      
      if (liveAchievements.length === 0) {
        // Initialize if collection is empty
        ACHIEVEMENTS_STRUCTURE.forEach(async (ach) => {
          await setDoc(doc(achievementRef, ach.id), { progress: ach.progress, title: ach.title, description: ach.description });
        });
      } else {
        // IMPROVEMENT: Sort data on client-side for stable UI and better UX
        liveAchievements.sort((a, b) => b.progress - a.progress); 
        setUserAchievements(liveAchievements);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching achievements:", error);
      setLoading(false);
    });

    // 2. Stats Listener
    const unsubscribeStats = onSnapshot(statsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const updatedStats = STATS_STRUCTURE.map(stat => {
                const liveValue = data[stat.id];
                if (liveValue !== undefined) {
                    // Convert to string and append '%' only for progress
                    return { ...stat, value: liveValue.toString() + (stat.id === 'progress' ? '%' : '') };
                }
                return stat;
            });
            // State update only if data is successfully fetched
            setUserStats(updatedStats);
        } else {
            // Initialize stats document if it doesn't exist
            const initialData = STATS_STRUCTURE.reduce((acc, stat) => {
                acc[stat.id] = (stat.id === 'rank' || stat.id === 'progress') ? '0' : 0;
                return acc;
            }, {});
            setDoc(statsDocRef, initialData, { merge: true });
        }
    }, (error) => {
      console.error("Error fetching stats:", error);
    });

    // CRITICAL for memory consumption: Clean up Firestore listeners on unmount
    return () => {
        unsubscribeAchievements();
        unsubscribeStats();
        // 
    };
  }, [isAuthReady, userId]); // Runs only after auth is confirmed and userId is set

  if (loading) {
    return <AchievementsLoader />;
  }
  
  // The use of React.memo on sub-components (Card, Button, etc.) already contributes significantly 
  // to memory efficiency by preventing unnecessary VDOM diff calculations during re-renders.

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-['Inter']" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white border-0 px-4 py-2">
            <Sparkles className="h-4 w-4 mr-2" />
            إنجازاتك
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            تتبع إنجازاتك وتفوقك
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg">
            احصل على تقدير على جهودك وتحفيز لمواصلة التقدم من خلال نظام الإنجازات المتكامل (معرّف المستخدم: {userId})
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {userStats.map((stat, index) => (
            <Card key={stat.id} className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all rounded-xl">
              <CardContent className="p-6 text-center pt-6">
                <div className={`w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 ${stat.color}`}>
                  {stat.icon}
                </div>
                <p className="text-3xl font-extrabold mb-1 text-gray-900">{stat.value}</p>
                <p className="text-gray-500 text-sm">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Achievements Grid */}
        <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-12">
          {userAchievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -5, scale: 1.01, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}
              className="h-full bg-white rounded-2xl border shadow-lg transition-all duration-300 flex flex-col overflow-hidden"
            >
              <div className={`p-1 ${achievement.color}`}>
                <div className="bg-white p-6 rounded-xl h-full flex flex-col">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-14 h-14 rounded-full ${achievement.color} flex items-center justify-center flex-shrink-0`}>
                      {achievement.icon}
                    </div>
                    <div className='flex flex-col flex-grow'>
                      <h3 className="text-xl font-bold text-gray-900">{achievement.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{achievement.description}</p>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">التقدم</span>
                      <span className="font-bold text-gray-900">{achievement.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-700 ease-out ${achievement.color}`} 
                        style={{ width: `${achievement.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <Card className="border-0 bg-gradient-to-r from-yellow-500 to-amber-600 shadow-xl overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 text-white">
                <div className="flex items-center gap-4 text-right">
                  <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm flex-shrink-0">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-2xl">هل أنت مستعد لتحقيق المزيد من الإنجازات؟</h3>
                    <p className="text-yellow-100 text-lg mt-1">تابع تقدمك واحصل على المزيد من المكافآت</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Link href="/achievements">
                    <Button variant="secondary" className="bg-white text-amber-600 hover:bg-yellow-50 px-6 py-3 text-lg border-0 shadow-xl font-bold rounded-lg">
                      عرض جميع الإنجازات
                      <ArrowRight className="h-5 w-5 mr-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default App;
