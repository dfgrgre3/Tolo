"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/shared/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/shared/progress";
import { Badge } from "@/shared/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, Award, BookOpen, MessageSquare, FileText, Target, TrendingUp, Settings, User, Bell, Shield, Globe, MapPin, Phone, Mail, Edit, Save, X, Camera, Star, Trophy, Zap } from "lucide-react";
import { AdvancedNavbar } from "@/components/ui/advanced-navbar";

import { ensureUser } from "@/lib/user-utils";

type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  grade?: string;
  school?: string;
  phone?: string;
  location?: string;
  interests?: string[];
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  createdAt: string;
  lastLogin?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  profileVisibility?: "public" | "friends" | "private";
};

type UserStats = {
  completedTasks: number;
  totalStudyTime: number; // in minutes
  coursesEnrolled: number;
  coursesCompleted: number;
  examsTaken: number;
  examAverage: number;
  forumPosts: number;
  blogPosts: number;
  achievementsCount: number;
  studyStreak: number;
  rank?: number;
  level?: number;
  experiencePoints?: number;
  nextLevelPoints?: number;
};

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  dateEarned: string;
  progress?: number;
  maxProgress?: number;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  data?: any;
};

type Course = {
  id: string;
  title: string;
  description: string;
  progress: number;
  thumbnail?: string;
  category: string;
  instructor: string;
  enrolledAt: string;
  lastAccessed?: string;
  rating?: number;
};

type Goal = {
  id: string;
  title: string;
  description: string;
  category: string;
  targetDate: string;
  progress: number;
  completed: boolean;
};

type Skill = {
  id: string;
  name: string;
  category: string;
  level: number;
  progress: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    bio: "",
    grade: "",
    school: "",
    phone: "",
    location: "",
    interests: "",
    website: "",
    twitter: "",
    linkedin: "",
    github: "",
    emailNotifications: true,
    pushNotifications: true,
    profileVisibility: "public" as "public" | "friends" | "private"
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      ensureUser().then(setUserId);
    }
  }, []);

  useEffect(() => {
    // Prevent running on server or when userId is empty
    if (typeof window === "undefined" || !userId) return;

    const fetchUserData = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setEditForm({
            name: userData.name,
            email: userData.email,
            bio: userData.bio || "",
            grade: userData.grade || "",
            school: userData.school || "",
            phone: userData.phone || "",
            location: userData.location || "",
            interests: userData.interests ? userData.interests.join(", ") : "",
            website: userData.website || "",
            twitter: userData.socialLinks?.twitter || "",
            linkedin: userData.socialLinks?.linkedin || "",
            github: userData.socialLinks?.github || "",
            emailNotifications: userData.emailNotifications !== false,
            pushNotifications: userData.pushNotifications !== false,
            profileVisibility: userData.profileVisibility || "public"
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchUserStats = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/stats`);
        if (res.ok) {
          const statsData = await res.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
      }
    };

    const fetchUserAchievements = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/achievements`);
        if (res.ok) {
          const achievementsData = await res.json();
          setAchievements(achievementsData);
        }
      } catch (error) {
        console.error("Error fetching user achievements:", error);
      }
    };

    const fetchUserActivities = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/activities`);
        if (res.ok) {
          const activitiesData = await res.json();
          setActivities(activitiesData);
        }
      } catch (error) {
        console.error("Error fetching user activities:", error);
      }
    };

    const fetchUserCourses = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/courses`);
        if (res.ok) {
          const coursesData = await res.json();
          setCourses(coursesData);
        }
      } catch (error) {
        console.error("Error fetching user courses:", error);
      }
    };

    const fetchUserGoals = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/goals`);
        if (res.ok) {
          const goalsData = await res.json();
          setGoals(goalsData);
        }
      } catch (error) {
        console.error("Error fetching user goals:", error);
      }
    };

    const fetchUserSkills = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/skills`);
        if (res.ok) {
          const skillsData = await res.json();
          setSkills(skillsData);
        }
      } catch (error) {
        console.error("Error fetching user skills:", error);
      }
    };

    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserData(),
        fetchUserStats(),
        fetchUserAchievements(),
        fetchUserActivities(),
        fetchUserCourses(),
        fetchUserGoals(),
        fetchUserSkills()
      ]);
      setLoading(false);
    };

    loadData();
  }, [userId]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      const formData = {
        ...editForm,
        interests: editForm.interests.split(",").map(i => i.trim()).filter(i => i),
        socialLinks: {
          twitter: editForm.twitter,
          linkedin: editForm.linkedin,
          github: editForm.github
        }
      };

      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        setIsEditing(false);
      } else {
        alert("حدث خطأ أثناء تحديث الملف الشخصي");
      }
    } catch (error) {
      console.error("Error updating user profile:", error);
      alert("حدث خطأ أثناء تحديث الملف الشخصي");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setEditForm(prev => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !userId) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch(`/api/users/${userId}/avatar`, {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
      } else {
        alert("حدث خطأ أثناء رفع الصورة");
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("حدث خطأ أثناء رفع الصورة");
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "bg-gray-100 text-gray-800";
      case "rare": return "bg-blue-100 text-blue-800";
      case "epic": return "bg-purple-100 text-purple-800";
      case "legendary": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "course": return <BookOpen className="h-4 w-4 text-blue-600" />;
      case "exam": return <FileText className="h-4 w-4 text-green-600" />;
      case "task": return <Target className="h-4 w-4 text-purple-600" />;
      case "forum": return <MessageSquare className="h-4 w-4 text-yellow-600" />;
      case "achievement": return <Award className="h-4 w-4 text-red-600" />;
      case "blog": return <FileText className="h-4 w-4 text-indigo-600" />;
      default: return <Zap className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSkillIcon = (category: string) => {
    switch (category) {
      case "technical": return <Settings className="h-4 w-4" />;
      case "academic": return <BookOpen className="h-4 w-4" />;
      case "language": return <Globe className="h-4 w-4" />;
      case "soft": return <User className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg font-medium">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // إنشاء مستخدم افتراضي إذا لم يكن موجوداً
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg font-medium">جاري إنشاء حسابك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdvancedNavbar user={user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        notifications: 3 // يمكن استبدالها بعدد الإشعارات الفعلي
      } : undefined} />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">الملف الشخصي</h1>
        <p className="text-muted-foreground">إدارة معلوماتك الشخصية ومتابعة تقدمك الأكاديمي</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
            <CardContent className="p-6 pt-0">
              <div className="flex flex-col items-center -mt-16">
                <div className="relative mb-4">
                  <Avatar className="w-24 h-24 border-4 border-white">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer shadow-md">
                    <Camera className="h-4 w-4" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                </div>

                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-muted-foreground text-sm mb-4">{user.email}</p>

                {stats && (
                  <div className="w-full mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">المستوى {stats.level || 1}</span>
                      <span className="text-xs text-muted-foreground">
                        {stats.experiencePoints || 0}/{stats.nextLevelPoints || 100} نقطة
                      </span>
                    </div>
                    <Progress 
                      value={stats.experiencePoints ? (stats.experiencePoints / (stats.nextLevelPoints || 100)) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                )}

                <div className="w-full space-y-2 text-center">
                  {user.grade && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الصف:</span>
                      <span className="font-medium">{user.grade}</span>
                    </div>
                  )}
                  {user.school && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المدرسة:</span>
                      <span className="font-medium">{user.school}</span>
                    </div>
                  )}
                  {user.location && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الموقع:</span>
                      <span className="font-medium">{user.location}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">انضم في:</span>
                    <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                  {user.lastLogin && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">آخر دخول:</span>
                      <span className="font-medium">{new Date(user.lastLogin).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <Button
                  className="mt-6 w-full"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? (
                    <>
                      <X className="ml-2 h-4 w-4" />
                      إلغاء
                    </>
                  ) : (
                    <>
                      <Edit className="ml-2 h-4 w-4" />
                      تعديل الملف الشخصي
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          {stats && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="ml-2 h-5 w-5" />
                  إحصائيات النشاط
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold">{stats.completedTasks}</div>
                    <div className="text-xs text-muted-foreground">مهام مكتملة</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold">{Math.floor(stats.totalStudyTime / 60)}س</div>
                    <div className="text-xs text-muted-foreground">وقت الدراسة</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold">{stats.coursesEnrolled}</div>
                    <div className="text-xs text-muted-foreground">دورات مسجلة</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold">{stats.coursesCompleted || 0}</div>
                    <div className="text-xs text-muted-foreground">دورات مكتملة</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold">{stats.examsTaken}</div>
                    <div className="text-xs text-muted-foreground">امتحانات</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold">{stats.examAverage || 0}%</div>
                    <div className="text-xs text-muted-foreground">متوسط الدرجات</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold">{stats.studyStreak}</div>
                    <div className="text-xs text-muted-foreground">أيام متتالية</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold">{stats.achievementsCount}</div>
                    <div className="text-xs text-muted-foreground">إنجازات</div>
                  </div>
                </div>

                {stats.rank && (
                  <div className="mt-4 text-center">
                    <Badge variant="outline" className="px-3 py-1">
                      <Trophy className="ml-1 h-4 w-4 text-yellow-500" />
                      الترتيب #{stats.rank}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Profile Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="courses">دوراتي</TabsTrigger>
              <TabsTrigger value="achievements">إنجازاتي</TabsTrigger>
              <TabsTrigger value="goals">أهدافي</TabsTrigger>
              <TabsTrigger value="settings">الإعدادات</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {isEditing ? (
                <Card>
                  <CardHeader>
                    <CardTitle>تعديل المعلومات الشخصية</CardTitle>
                    <CardDescription>
                      قم بتحديث معلوماتك الشخصية أدناه
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">الاسم</Label>
                          <Input
                            id="name"
                            name="name"
                            value={editForm.name}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">البريد الإلكتروني</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={editForm.email}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="grade">الصف الدراسي</Label>
                          <Input
                            id="grade"
                            name="grade"
                            value={editForm.grade}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div>
                          <Label htmlFor="school">المدرسة</Label>
                          <Input
                            id="school"
                            name="school"
                            value={editForm.school}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">رقم الهاتف</Label>
                          <Input
                            id="phone"
                            name="phone"
                            value={editForm.phone}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div>
                          <Label htmlFor="location">الموقع</Label>
                          <Input
                            id="location"
                            name="location"
                            value={editForm.location}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div>
                          <Label htmlFor="website">الموقع الإلكتروني</Label>
                          <Input
                            id="website"
                            name="website"
                            value={editForm.website}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div>
                          <Label htmlFor="interests">الاهتمامات (افصل بينها بفواصل)</Label>
                          <Input
                            id="interests"
                            name="interests"
                            value={editForm.interests}
                            onChange={handleInputChange}
                            placeholder="مثال: الرياضيات, العلوم, البرمجة"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="bio">نبذة شخصية</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          rows={4}
                          value={editForm.bio}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium">روابط التواصل الاجتماعي</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="twitter">تويتر</Label>
                            <Input
                              id="twitter"
                              name="twitter"
                              value={editForm.twitter}
                              onChange={handleInputChange}
                              placeholder="@username"
                            />
                          </div>
                          <div>
                            <Label htmlFor="linkedin">لينكدإن</Label>
                            <Input
                              id="linkedin"
                              name="linkedin"
                              value={editForm.linkedin}
                              onChange={handleInputChange}
                              placeholder="username"
                            />
                          </div>
                          <div>
                            <Label htmlFor="github">جيتهاب</Label>
                            <Input
                              id="github"
                              name="github"
                              value={editForm.github}
                              onChange={handleInputChange}
                              placeholder="username"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          إلغاء
                        </Button>
                        <Button type="submit">
                          <Save className="ml-2 h-4 w-4" />
                          حفظ التغييرات
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Bio Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>نبذة شخصية</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {user.bio ? (
                        <p className="text-muted-foreground">{user.bio}</p>
                      ) : (
                        <p className="text-muted-foreground">لا توجد نبذة شخصية مضافة</p>
                      )}

                      {user.interests && user.interests.length > 0 && (
                        <>
                          <Separator className="my-4" />
                          <div>
                            <h4 className="font-medium mb-2">الاهتمامات</h4>
                            <div className="flex flex-wrap gap-2">
                              {user.interests.map((interest, index) => (
                                <Badge key={index} variant="secondary">
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {(user.website || user.socialLinks) && (
                        <>
                          <Separator className="my-4" />
                          <div>
                            <h4 className="font-medium mb-2">روابط التواصل</h4>
                            <div className="flex flex-wrap gap-3">
                              {user.website && (
                                <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  <Globe className="h-4 w-4 inline ml-1" />
                                  الموقع الإلكتروني
                                </a>
                              )}
                              {user.socialLinks?.twitter && (
                                <a href={`https://twitter.com/${user.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  تويتر
                                </a>
                              )}
                              {user.socialLinks?.linkedin && (
                                <a href={`https://linkedin.com/in/${user.socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  لينكدإن
                                </a>
                              )}
                              {user.socialLinks?.github && (
                                <a href={`https://github.com/${user.socialLinks.github}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  جيتهاب
                                </a>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Skills Section */}
                  {skills.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>المهارات</CardTitle>
                        <CardDescription>
                          المهارات التي قمت بتطويرها
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {skills.map((skill) => (
                            <div key={skill.id} className="p-3 rounded-lg border">
                              <div className="flex items-center gap-2 mb-2">
                                {getSkillIcon(skill.category)}
                                <h4 className="font-medium">{skill.name}</h4>
                                <Badge variant="outline" className="text-xs">
                          المستوى {skill.level}
                        </Badge>
                              </div>
                              <div className="mt-1">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>التقدم</span>
                                  <span>{skill.progress}%</span>
                                </div>
                                <Progress value={skill.progress} className="h-2" />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4 text-center">
                          <Button variant="outline" asChild>
                            <Link href="/skills">عرض جميع المهارات</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Courses */}
                  {courses.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>دوراتي الأخيرة</CardTitle>
                        <CardDescription>
                          الدورات التي كنت تدرسها مؤخراً
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {courses.slice(0, 3).map((course) => (
                            <div key={course.id} className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                                {course.thumbnail ? (
                                  <img
                                    src={course.thumbnail}
                                    alt={course.title}
                                    className="w-full h-full rounded-lg object-cover"
                                  />
                                ) : (
                                  <span className="text-lg font-bold">{course.title.charAt(0)}</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{course.title}</h4>
                                <p className="text-sm text-muted-foreground line-clamp-1">{course.description}</p>
                                <div className="mt-1">
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>التقدم</span>
                                    <span>{course.progress}%</span>
                                  </div>
                                  <Progress value={course.progress} className="h-2" />
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 text-center">
                            <Button variant="outline" asChild>
                              <Link href="/courses">عرض جميع الدورات</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Achievements */}
                  {achievements.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>إنجازاتي الأخيرة</CardTitle>
                        <CardDescription>
                          الإنجازات التي حصلت عليها مؤخراً
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {achievements.slice(0, 4).map((achievement) => (
                            <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-lg border">
                              <div className="text-2xl">{achievement.icon}</div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-medium">{achievement.title}</h4>
                                  <Badge className={`text-xs ${getRarityColor(achievement.rarity)}`}>
                                    {achievement.rarity === "common" && "عادي"}
                                    {achievement.rarity === "rare" && "نادر"}
                                    {achievement.rarity === "epic" && "أسطوري"}
                                    {achievement.rarity === "legendary" && "مميز"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(achievement.dateEarned).toLocaleDateString()}
                                </p>
                                {achievement.progress !== undefined && achievement.maxProgress && (
                                  <div className="mt-2">
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                      <span>التقدم</span>
                                      <span>{achievement.progress}/{achievement.maxProgress}</span>
                                    </div>
                                    <Progress value={(achievement.progress / achievement.maxProgress) * 100} className="h-1.5" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4 text-center">
                          <Button variant="outline" asChild>
                            <Link href="/achievements">عرض جميع الإنجازات</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>النشاط الأخير</CardTitle>
                          <CardDescription>
                            آخر الأنشطة التي قمت بها في المنصة
                          </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/activity">عرض الكل</Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {activities.length > 0 ? (
                        <div className="space-y-4">
                          {activities.slice(0, 5).map((activity) => (
                            <div key={activity.id} className="flex gap-3 p-3 rounded-lg border">
                              <div className="mt-1">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  {getActivityIcon(activity.type)}
                                </div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{activity.title}</h4>
                                <p className="text-sm text-muted-foreground">{activity.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">لا يوجد نشاط مؤخر</p>
                          <Button className="mt-4" asChild>
                            <Link href="/courses">ابدأ التعلم الآن</Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="courses" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>دوراتي</CardTitle>
                  <CardDescription>
                    جميع الدورات التي قمت بالتسجيل فيها
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {courses.length > 0 ? (
                    <div className="space-y-4">
                      {courses.map((course) => (
                        <div key={course.id} className="flex items-center gap-4 p-4 rounded-lg border">
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                            {course.thumbnail ? (
                              <img
                                src={course.thumbnail}
                                alt={course.title}
                                className="w-full h-full rounded-lg object-cover"
                              />
                            ) : (
                              <span className="text-lg font-bold">{course.title.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h4 className="font-medium">{course.title}</h4>
                              {course.rating && (
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                  <span className="text-sm ml-1">{course.rating}</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">{course.description}</p>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>المدرس: {course.instructor}</span>
                              <span>التصنيف: {course.category}</span>
                            </div>
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>التقدم</span>
                                <span>{course.progress}%</span>
                              </div>
                              <Progress value={course.progress} className="h-2" />
                            </div>
                          </div>
                          <Button variant="outline" asChild>
                            <Link href={`/courses/${course.id}`}>عرض</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">لم تقم بالتسجيل في أي دورة بعد</p>
                      <Button className="mt-4" asChild>
                        <Link href="/courses">استكشف الدورات</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>إنجازاتي</CardTitle>
                  <CardDescription>
                    جميع الإنجازات التي حصلت عليها
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {achievements.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {achievements.map((achievement) => (
                        <div key={achievement.id} className="flex items-start gap-3 p-4 rounded-lg border">
                          <div className="text-3xl">{achievement.icon}</div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium">{achievement.title}</h4>
                              <Badge className={`text-xs ${getRarityColor(achievement.rarity)}`}>
                                {achievement.rarity === "common" && "عادي"}
                                {achievement.rarity === "rare" && "نادر"}
                                {achievement.rarity === "epic" && "أسطوري"}
                                {achievement.rarity === "legendary" && "مميز"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              حصلت عليها في {new Date(achievement.dateEarned).toLocaleDateString()}
                            </p>
                            {achievement.progress !== undefined && achievement.maxProgress && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>التقدم</span>
                                  <span>{achievement.progress}/{achievement.maxProgress}</span>
                                </div>
                                <Progress value={(achievement.progress / achievement.maxProgress) * 100} className="h-1.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">لم تحصل على أي إنجازات بعد</p>
                      <Button className="mt-4" asChild>
                        <Link href="/courses">ابدأ التعلم الآن</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="goals" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>أهدافي</CardTitle>
                      <CardDescription>
                        الأهداف التعليمية التي وضعتها لنفسك
                      </CardDescription>
                    </div>
                    <Button asChild>
                      <Link href="/goals/new">إضافة هدف جديد</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {goals.length > 0 ? (
                    <div className="space-y-4">
                      {goals.map((goal) => (
                        <div key={goal.id} className="p-4 rounded-lg border">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{goal.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{goal.category}</Badge>
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <CalendarDays className="h-3 w-3 ml-1" />
                                  {new Date(goal.targetDate).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            {goal.completed ? (
                              <Badge className="bg-green-100 text-green-800">مكتمل</Badge>
                            ) : (
                              <Badge variant="outline">قيد التقدم</Badge>
                            )}
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>التقدم</span>
                              <span>{goal.progress}%</span>
                            </div>
                            <Progress value={goal.progress} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">لم تقم بتعيين أي أهداف بعد</p>
                      <Button className="mt-4" asChild>
                        <Link href="/goals/new">إضافة هدف جديد</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>الإعدادات</CardTitle>
                  <CardDescription>
                    إدارة إعدادات حسابك وخصوصيتك
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">الإشعارات</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Mail className="h-5 w-5 ml-2 text-muted-foreground" />
                          <div>
                            <Label htmlFor="email-notifications">الإشعارات عبر البريد الإلكتروني</Label>
                            <p className="text-sm text-muted-foreground">استقبال الإشعارات عبر البريد الإلكتروني</p>
                          </div>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={editForm.emailNotifications}
                          onCheckedChange={(checked) => handleSwitchChange("emailNotifications", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Bell className="h-5 w-5 ml-2 text-muted-foreground" />
                          <div>
                            <Label htmlFor="push-notifications">الإشعارات الفورية</Label>
                            <p className="text-sm text-muted-foreground">استقبال الإشعارات الفورية على المتصفح</p>
                          </div>
                        </div>
                        <Switch
                          id="push-notifications"
                          checked={editForm.pushNotifications}
                          onCheckedChange={(checked) => handleSwitchChange("pushNotifications", checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium mb-4">الخصوصية</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Shield className="h-5 w-5 ml-2 text-muted-foreground" />
                          <div>
                            <Label htmlFor="profile-visibility">رؤية الملف الشخصي</Label>
                            <p className="text-sm text-muted-foreground">من يمكنه رؤية ملفك الشخصي</p>
                          </div>
                        </div>
                        <Select
                          value={editForm.profileVisibility}
                          onValueChange={(value) => handleSelectChange("profileVisibility", value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">عام</SelectItem>
                            <SelectItem value="friends">الأصدقاء فقط</SelectItem>
                            <SelectItem value="private">خاص</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Reset form to current user values
                        setEditForm({
                          name: user.name,
                          email: user.email,
                          bio: user.bio || "",
                          grade: user.grade || "",
                          school: user.school || "",
                          phone: user.phone || "",
                          location: user.location || "",
                          interests: user.interests ? user.interests.join(", ") : "",
                          website: user.website || "",
                          twitter: user.socialLinks?.twitter || "",
                          linkedin: user.socialLinks?.linkedin || "",
                          github: user.socialLinks?.github || "",
                          emailNotifications: user.emailNotifications !== false,
                          pushNotifications: user.pushNotifications !== false,
                          profileVisibility: user.profileVisibility || "public"
                        });
                      }}
                    >
                      إعادة تعيين
                    </Button>
                    <Button onClick={handleEditSubmit}>
                      حفظ التغييرات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>
    </div>
  );
}
