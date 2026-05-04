"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { defaultAdminShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcutCategories = [
  {
    name: "الملاحة العامة",
    shortcuts: [
      { key: "Ctrl/Cmd + K", description: "فتح البحث السريع" },
      { key: "Ctrl/Cmd + /", description: "فتح لوحة الأوامر" },
      { key: "Ctrl/Cmd + H", description: "الذهاب للرئيسية" },
      { key: "Ctrl/Cmd + B", description: "تبديل الشريط الجانبي" },
      { key: "Alt + 1-9", description: "الانتقال للقسم (1-9)" },
      { key: "Esc", description: "إغلاق القائمة/الحوار المفتوح" },
    ],
  },
  {
    name: "البحث والفلترة",
    shortcuts: [
      { key: "Ctrl/Cmd + Shift + F", description: "البحث المتقدم" },
      { key: "/", description: "البحث في الجدول" },
      { key: "Ctrl/Cmd + Enter", description: "تطبيق الفلتر" },
      { key: "Ctrl/Cmd + R", description: "تحديث البيانات" },
    ],
  },
  {
    name: "التنقل",
    shortcuts: [
      { key: "↑ / ↓", description: "التنقل بين العناصر" },
      { key: "Enter", description: "فتح/اختيار العنصر" },
      { key: "Tab", description: "الانتقال للحقل التالي" },
      { key: "Shift + Tab", description: "الانتقال للحقل السابق" },
    ],
  },
  {
    name: "الإجراءات",
    shortcuts: [
      { key: "Ctrl/Cmd + N", description: "إنشاء جديد" },
      { key: "Ctrl/Cmd + S", description: "حفظ" },
      { key: "Ctrl/Cmd + D", description: "حذف" },
      { key: "Ctrl/Cmd + E", description: "تعديل" },
      { key: "Ctrl/Cmd + P", description: "طباعة" },
    ],
  },
  {
    name: "الإعدادات",
    shortcuts: [
      { key: "Ctrl/Cmd + Shift + L", description: "تبديل الوضع الليلي" },
      { key: "Ctrl/Cmd + Shift + ?", description: "عرض الاختصارات" },
      { key: "Alt + M", description: "تبديل القائمة المتنقلة" },
    ],
  },
];

export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
}: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            اختصارات لوحة المفاتيح
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {shortcutCategories.map((category) => (
              <div key={category.name}>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                  {category.name}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.key.split(" + ").map((k) => (
                          <Badge
                            key={k}
                            variant="secondary"
                            className="font-mono text-xs"
                          >
                            {k}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="mt-4" />
              </div>
            ))}

            <div className="text-center text-sm text-muted-foreground pt-4">
              يمكنك تخصيص هذه الاختصارات من الإعدادات
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Hook to show keyboard shortcuts dialog
export function useKeyboardShortcutsDialog() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleShowShortcuts = () => setOpen(true);
    window.addEventListener("show-keyboard-shortcuts", handleShowShortcuts);
    return () =>
      window.removeEventListener("show-keyboard-shortcuts", handleShowShortcuts);
  }, []);

  return { open, setOpen };
}
