'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/shared/button";
import { HelpCircle, Keyboard } from 'lucide-react';
import { Badge } from "@/shared/badge";

export default function KeyboardShortcutsHelp() {
  const shortcuts = [
    { keys: ['Ctrl/Cmd', '1-6'], description: 'التبديل بين علامات التبويب' },
    { keys: ['Ctrl/Cmd', 'T'], description: 'بدء/إيقاف المؤقت' },
    { keys: ['Ctrl/Cmd', 'R'], description: 'تحديث البيانات' },
    { keys: ['Ctrl/Cmd', 'N'], description: 'مهمة جديدة' },
    { keys: ['Ctrl/Cmd', 'Shift', 'N'], description: 'تذكير جديد' },
    { keys: ['Esc'], description: 'إغلاق النوافذ المنبثقة' },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          اختصارات لوحة المفاتيح
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            اختصارات لوحة المفاتيح
          </DialogTitle>
          <DialogDescription>
            استخدم هذه الاختصارات للتنقل السريع في لوحة إدارة الوقت
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <span className="text-sm font-medium">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <div key={keyIndex} className="flex items-center gap-1">
                    {keyIndex > 0 && <span className="text-muted-foreground">+</span>}
                    <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                      {key}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50">
          <p className="text-xs text-muted-foreground">
            💡 ملاحظة: الاختصارات تعمل فقط عندما لا تكون في حقل إدخال نص
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

