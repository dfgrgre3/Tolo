import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/shared/badge';
import { 
  Home, 
  BookOpen, 
  Calendar, 
  BarChart3, 
  Trophy, 
  Brain, 
  MessageSquare, 
  FileText, 
  Settings, 
  ChevronRight, 
  ChevronDown,
  Menu,
  X,
  User,
  Bell,
  Search,
  HelpCircle,
  LogOut,
  Star
} from 'lucide-react';
import { useAuth } from '@/components/auth/UserProvider';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  subItems?: { title: string; href: string }[];
}

const SidebarNavigation = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  // التأكد من أن القائمة الجانبية مغلقة على الموبايل عند تغيير المسار
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleSubmenu = (title: string) => {
    if (activeSubmenu === title) {
      setActiveSubmenu(null);
    } else {
      setActiveSubmenu(title);
    }
  };

  const navigationItems: NavItem[] = [
    {
      title: 'الرئيسية',
      href: '/',
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: 'المسارات التعليمية',
      href: '/courses',
      icon: <BookOpen className="h-5 w-5" />,
      badge: 'جديد',
      subItems: [
        { title: 'الرياضيات', href: '/courses/math' },
        { title: 'العلوم', href: '/courses/science' },
        { title: 'اللغة العربية', href: '/courses/arabic' },
        { title: 'اللغة الإنجليزية', href: '/courses/english' },
      ],
    },
    {
      title: 'الجدول الدراسي',
      href: '/schedule',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: 'التحليلات والإحصائيات',
      href: '/analytics',
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      title: 'الإنجازات',
      href: '/achievements',
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      title: 'المساعد الذكي',
      href: '/ai',
      icon: <Brain className="h-5 w-5" />,
      badge: 'مميز',
    },
    {
      title: 'المنتدى',
      href: '/forum',
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      title: 'الامتحانات',
      href: '/exams',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: 'الإعدادات',
      href: '/settings',
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  const isActive = (href: string) => pathname === href;

  // نسخة مصغرة للقائمة الجانبية للشاشات الصغيرة
  const MobileMenu = () => (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <motion.div
            className="fixed top-0 right-0 h-full w-64 bg-white shadow-xl z-50 md:hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">القائمة</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              {user && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{user.name || 'المستخدم'}</p>
                    <p className="text-sm text-muted-foreground">{user.email || 'user@example.com'}</p>
                  </div>
                </div>
              )}
              <div className="space-y-1">
                {navigationItems.map((item) => (
                  <div key={item.title}>
                    <Link href={item.href}>
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                          isActive(item.href)
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span>{item.title}</span>
                        </div>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </Link>
                    {item.subItems && (
                      <div className="mr-6 mt-1 space-y-1">
                        {item.subItems.map((subItem) => (
                          <Link key={subItem.href} href={subItem.href}>
                            <div
                              className={`p-2 rounded text-sm transition-colors ${
                                isActive(subItem.href)
                                  ? 'bg-blue-50 text-blue-600 font-medium'
                                  : 'hover:bg-gray-100 text-muted-foreground'
                              }`}
                            >
                              {subItem.title}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t space-y-1">
                <Link href="/help">
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100">
                    <HelpCircle className="h-5 w-5" />
                    <span>المساعدة والدعم</span>
                  </div>
                </Link>
                <Link href="/logout">
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-red-600">
                    <LogOut className="h-5 w-5" />
                    <span>تسجيل الخروج</span>
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* زر القائمة للموبايل */}
      <div className="md:hidden fixed top-4 right-4 z-30">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(true)}
          className="bg-white shadow-md"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* القائمة الجانبية للشاشات الكبيرة */}
      <div className="hidden md:block">
        <motion.div
          className={`fixed right-0 top-0 h-full bg-white shadow-xl z-20 border-l ${
            isExpanded ? 'w-64' : 'w-16'
          } transition-all duration-300 ease-in-out`}
          layout
        >
          {/* رأس القائمة الجانبية */}
          <div className="flex items-center justify-between p-4 border-b">
            {isExpanded && (
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xl font-bold"
              >
                لوحة التحكم
              </motion.h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleExpand}
              className="ml-auto"
            >
              {isExpanded ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5 rotate-270" />
              )}
            </Button>
          </div>

          {/* معلومات المستخدم */}
          {isExpanded && user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-b"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{user.name || 'المستخدم'}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email || 'user@example.com'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* عناصر التنقل */}
          <div className="p-4 overflow-y-auto h-[calc(100vh-200px)]">
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <div key={item.title}>
                  <Link href={item.href}>
                    <div
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.icon}
                        {isExpanded && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="truncate"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </div>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                          {item.subItems && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0"
                              onClick={(e) => {
                                e.preventDefault();
                                toggleSubmenu(item.title);
                              }}
                            >
                              {activeSubmenu === item.title ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </Link>
                  {isExpanded && item.subItems && activeSubmenu === item.title && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mr-6 mt-1 space-y-1"
                    >
                      {item.subItems.map((subItem) => (
                        <Link key={subItem.href} href={subItem.href}>
                          <div
                            className={`p-2 rounded text-sm transition-colors ${
                              isActive(subItem.href)
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'hover:bg-gray-100 text-muted-foreground'
                            }`}
                          >
                            {subItem.title}
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* تذييل القائمة الجانبية */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white"
            >
              <div className="space-y-1">
                <Link href="/help">
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100">
                    <HelpCircle className="h-5 w-5" />
                    <span>المساعدة والدعم</span>
                  </div>
                </Link>
                <Link href="/logout">
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-red-600">
                    <LogOut className="h-5 w-5" />
                    <span>تسجيل الخروج</span>
                  </div>
                </Link>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* القائمة للموبايل */}
      <MobileMenu />
    </>
  );
};

export default SidebarNavigation;
