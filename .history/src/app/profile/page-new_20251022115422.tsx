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

const LOCAL_USER_KEY = "tw_user_id";
async function ensureUser(): Promise<string> {
  let id = localStorage.getItem(LOCAL_USER_KEY);
  if (!id) {
    const res = await fetch("/api/users/guest", { method: "POST" });
    const data = await res.json();
    id = data.id;
    localStorage.setItem(LOCAL_USER_KEY, id!);
  }
  return id!;
}

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
  createdAt: string;
};

type UserStats = {
  completedTasks: number;
  totalStudyTime: number; // in minutes
  coursesEnrolled: number;
  examsTaken: number;
  forumPosts: number;
  blogPosts: number;
  achievementsCount: number;
  studyStreak: number;
};

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  dateEarned: string;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
};

type Course = {
  id: string;
  title: string;
  description: string;
  progress: number;
  thumbnail?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    bio: "",
    grade: "",
    school: "",
    phone: "",
    location: "",
    interests: ""
  });

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    if (!userId) return;

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
            interests: userData.interests ? userData.interests.join(", ") : ""
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

    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserData(), 
        fetchUserStats(), 
        fetchUserAchievements(),
        fetchUserActivities(),
        fetchUserCourses()
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
        interests: editForm.interests.split(",").map(i => i.trim()).filter(i => i)
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
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">المستخدم غير موجود</h1>
          <Button className="mt-4" onClick={() => router.push("/")}>
            العودة للصفحة الرئيسية
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">الملف الشخصي</h1>
        <p className="text-muted-foreground">إدارة معلوماتك الشخصية ومتابعة تقدمك الأكاديمي</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
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
                </div>

                <Button 
                  className="mt-6 w-full" 
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "إلغاء" : "تعديل الملف الشخصي"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          {stats && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>إحصائيات النشاط</CardTitle>
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
                    <div className="text-2xl font-bold">{stats.examsTaken}</div>
                    <div className="text-xs text-muted-foreground">امتحانات</div>
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* Profile Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="courses">دوراتي</TabsTrigger>
              <TabsTrigger value="achievements">إنجازاتي</TabsTrigger>
              <TabsTrigger value="activity">النشاط</TabsTrigger>
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
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          إلغاء
                        </Button>
                        <Button type="submit">
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
                    </CardContent>
                  </Card>

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
                              <div>
                                <h4 className="font-medium">{achievement.title}</h4>
                                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(achievement.dateEarned).toLocaleDateString()}
                                </p>
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
                            <h4 className="font-medium">{course.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-1">{course.description}</p>
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
                          <div>
                            <h4 className="font-medium">{achievement.title}</h4>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              حصلت عليها في {new Date(achievement.dateEarned).toLocaleDateString()}
                            </p>
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

            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>النشاط الأخير</CardTitle>
                  <CardDescription>
                    آخر الأنشطة التي قمت بها في المنصة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3 p-3 rounded-lg border">
                          <div className="mt-1">
                            {activity.type === "course" && (
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                </svg>
                              </div>
                            )}
                            {activity.type === "exam" && (
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            {activity.type === "task" && (
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            {activity.type === "forum" && (
                              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            {activity.type === "achievement" && (
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{activity.title}</h4>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString()}
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
