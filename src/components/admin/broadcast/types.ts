import { MessageSquareText, Shield, Book, Award, AlertCircle } from "lucide-react";

export type MessageType = "info" | "success" | "warning" | "error";

export interface MessageTemplate {
  id: string;
  label: string;
  title: string;
  message: string;
  type: MessageType;
  icon: any;
  description: string;
}

export const BROADCAST_TEMPLATES: MessageTemplate[] = [
  { 
    id: "custom", 
    label: "رسالة مخصصة", 
    title: "", 
    message: "", 
    type: "info",
    icon: MessageSquareText,
    description: "كتابة رسالة جديدة من الصفر"
  },
  { 
    id: "welcome", 
    label: "رسالة ترحيب", 
    title: "مرحباً بك في منصتنا التعليمية 👋", 
    message: "يسعدنا انضمامك إلينا. استعد لبدء رحلتك التعليمية وتطوير مهاراتك مع أفضل الخبراء!", 
    type: "info",
    icon: Shield,
    description: "رسالة ترحيبية للمستخدمين الجدد"
  },
  { 
    id: "warning_absence", 
    label: "تنبيه غياب", 
    title: "تنبيه: لقد افتقدناك مؤخراً ⚠️", 
    message: "لاحظنا عدم نشاطك على المنصة خلال الفترة الماضية. ندعوك للعودة ومواصلة دروسك لتحقيق أهدافك التعليمية.", 
    type: "warning",
    icon: Book,
    description: "تنبيه للمستخدمين غير النشطين"
  },
  { 
    id: "reward", 
    label: "إرسال مكافأة", 
    title: "مكافأة خاصة تقديراً لجهودك 🎁", 
    message: "تقديراً لتميزك في الدروس الأخيرة، تم إضافة مكافأة خاصة لحسابك. يمكنك الاطلاع عليها في صفحة المكافآت.", 
    type: "success",
    icon: Award,
    description: "إرسال حوافز ومكافآت للمتميزين"
  },
  { 
    id: "ban_threat", 
    label: "تحذير نهائي", 
    title: "تحذير نهائي بخصوص شروط الاستخدام 🚫", 
    message: "تم رصد نشاط يخالف سياسات الاستخدام الخاصة بالمنصة. يرجى الالتزام بالقواعد لتجنب إيقاف الحساب نهائياً.", 
    type: "error",
    icon: AlertCircle,
    description: "تنبيه رسمي بخصوص مخالفة السياسات"
  },
];

export interface UserModel {
  id: string;
  email: string;
  name: string | null;
  phone?: string | null;
  avatar?: string | null;
  level?: number;
}

export interface BroadcastFormData {
  title: string;
  message: string;
  type: MessageType;
  actionUrl: string;
  channels: {
    app: boolean;
    email: boolean;
    sms: boolean;
  };
}
