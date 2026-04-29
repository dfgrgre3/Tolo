import { MessageSquareText, Shield, Book, Skull, Award } from "lucide-react";

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

export const ROYAL_TEMPLATES: MessageTemplate[] = [
  { 
    id: "custom", 
    label: "رسالة مخصصة", 
    title: "", 
    message: "", 
    type: "info",
    icon: MessageSquareText,
    description: "كتابة مخطوطة ملكية فريدة من الصفر"
  },
  { 
    id: "welcome", 
    label: "ترحيب بالمحارب", 
    title: "مرحباً بك في ساحة المعركة ⚔️", 
    message: "الإمبراطورية ترحب بك أيها المحارب. استعد للتدريب وتطوير مهاراتك لتكون الأقوى!", 
    type: "info",
    icon: Shield,
    description: "رسالة ترحيبية للمنضمين الجدد للجيش"
  },
  { 
    id: "warning_absence", 
    label: "تحذير غياب", 
    title: "تحذير من القيادة العُليا ⚠️", 
    message: "لاحظنا غيابك الطويل عن ساحة التدريب مؤخراً. يجب العودة فوراً وإلا ستتعرض لفقدان نقاط القوة (XP) الخاصة بك.", 
    type: "warning",
    icon: Book,
    description: "تنبيه للمحاربين المتكاسلين عن التدريب"
  },
  { 
    id: "reward", 
    label: "مكافأة أسطورية", 
    title: "مكافأة أسطورية في انتظارك 🎁", 
    message: "أثبتت جدارتك في المهام الأخيرة، وبناءً عليه قرر الإمبراطور منحك مكافأة خاصة. تفضل بزيارة خزانة الغنائم للحصول عليها!", 
    type: "success",
    icon: Award,
    description: "إرسال غنائم ومكافآت للمحاربين المميزين"
  },
  { 
    id: "ban_threat", 
    label: "إنذار بالنفي", 
    title: "إنذار أخير قبل النفي 🚫", 
    message: "لقد تم رصد مخالفات جسيمة لقوانين الإمبراطورية. هذا إنذار أخير قبل تجريدك من رتبتك ونفيك نهائياً.", 
    type: "error",
    icon: Skull,
    description: "تنبيه أخير قبل اتخاذ إجراءات عقابية"
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

export interface RoyalMessageFormData {
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
