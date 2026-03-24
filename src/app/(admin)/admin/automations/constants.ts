import { Rule } from "./types";

export const triggerOptions = [
  { value: "ABSENCE_DAYS", label: "غاب عن المنصة لمدة" },
  { value: "EXAM_FAILED_STREAK", label: "رسب في اختبار متتالى مرات معدودة" },
  { value: "EXAMS_PASSED", label: "اجتاز اختبارات بنجاح بمقدار" },
  { value: "XP_DROPPED", label: "انخفضت نقاط الـ XP عن" },
];

export const actionOptions = [
  { value: "DEDUCT_XP_NOTIFY", label: "خصم XP وإرسال تبليغ" },
  { value: "ADD_XP_NOTIFY", label: "إضافة XP مكافأة وإرسال تهنئة" },
  { value: "SEND_NOTIFICATION", label: "إرسال إشعار فقط" },
  { value: "MARK_AS_RISK", label: 'تصنيفه كـ "معرض للخطر" للمدير' },
];

export const quantitativeTriggers = new Set([
  "ABSENCE_DAYS",
  "EXAM_FAILED_STREAK",
  "EXAMS_PASSED",
  "XP_DROPPED",
]);

export const messageActionTypes = new Set([
  "DEDUCT_XP_NOTIFY",
  "ADD_XP_NOTIFY",
  "SEND_NOTIFICATION",
]);

export function normalizeRule(rule: Rule): Rule {
  return {
    ...rule,
    conditions:
      typeof rule.conditions === "string"
        ? JSON.parse(rule.conditions)
        : rule.conditions,
    actionData:
      typeof rule.actionData === "string"
        ? JSON.parse(rule.actionData)
        : rule.actionData,
  };
}

export function createNewRule(): Rule {
  return {
    id: `temp_${Date.now()}`,
    name: "قاعدة أتمتة جديدة",
    triggerType: "ABSENCE_DAYS",
    conditions: { value: 3 },
    actionType: "SEND_NOTIFICATION",
    actionData: { message: "رسالة التنبيه هنا..." },
    isActive: true,
    isNew: true,
  };
}
