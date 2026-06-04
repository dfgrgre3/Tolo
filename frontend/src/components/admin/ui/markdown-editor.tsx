"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Underline, List, ListOrdered, Quote, Code, Heading1, Heading2, Heading3,
  Link, Image, Table, Eye, Edit3, Undo, Redo, Strikethrough
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  onImageUpload?: (file: File) => Promise<string>;
}

const insertText = (
  textarea: HTMLTextAreaElement | null,
  value: string,
  prefix: string,
  suffix: string = prefix,
  placeholder: string = "نص"
): string => {
  if (!textarea) return value;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = value.substring(start, end);

  const before = value.substring(0, start);
  const after = value.substring(end);

  const newText = selectedText
    ? `${before}${prefix}${selectedText}${suffix}${after}`
    : `${before}${prefix}${placeholder}${suffix}${after}`;

  setTimeout(() => {
    textarea.focus();
    if (selectedText) {
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    } else {
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length);
    }
  }, 0);

  return newText;
};

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "اكتب المحتوى هنا...",
  className,
  minHeight = 300,
  onImageUpload,
}: MarkdownEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">("write");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleInsert = (prefix: string, suffix: string = prefix, placeholder: string = "نص") => {
    onChange(insertText(textareaRef.current, value, prefix, suffix, placeholder));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;

    try {
      const url = await onImageUpload(file);
      handleInsert(`![${file.name}](`, `)`, url);
    } catch {
      // Error handled by caller
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toolbarGroups = [
    [
      { icon: Bold, action: () => handleInsert("**", "**", "نص عريض"), tooltip: "عريض" },
      { icon: Italic, action: () => handleInsert("*", "*", "نص مائل"), tooltip: "مائل" },
      { icon: Strikethrough, action: () => handleInsert("~~", "~~", "نص مشطوب"), tooltip: "مشطوب" },
    ],
    [
      { icon: Heading1, action: () => handleInsert("# ", "", "عنوان رئيسي"), tooltip: "عنوان 1" },
      { icon: Heading2, action: () => handleInsert("## ", "", "عنوان فرعي"), tooltip: "عنوان 2" },
      { icon: Heading3, action: () => handleInsert("### ", "", "عنوان صغير"), tooltip: "عنوان 3" },
    ],
    [
      { icon: List, action: () => handleInsert("- ", "", "عنصر قائمة"), tooltip: "قائمة نقطية" },
      { icon: ListOrdered, action: () => handleInsert("1. ", "", "عنصر مرقم"), tooltip: "قائمة مرقمة" },
      { icon: Quote, action: () => handleInsert("> ", "", "اقتباس"), tooltip: "اقتباس" },
    ],
    [
      { icon: Code, action: () => handleInsert("`", "`", "كود"), tooltip: "كود" },
      { icon: Link, action: () => handleInsert("[", "](الرابط)", "نص الرابط"), tooltip: "رابط" },
      { icon: Image, action: () => fileInputRef.current?.click(), tooltip: "صورة" },
    ],
  ];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-1 flex-wrap">
          {toolbarGroups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {group.map((item, itemIndex) => (
                <Button
                  key={itemIndex}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={item.action}
                  title={item.tooltip}
                  className="h-8 w-8 p-0"
                >
                  <item.icon className="h-4 w-4" />
                </Button>
              ))}
              {groupIndex < toolbarGroups.length - 1 && (
                <div className="w-px h-6 bg-border mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "write" | "preview")} className="w-auto">
          <TabsList className="h-8">
            <TabsTrigger value="write" className="h-6 px-2 text-xs gap-1">
              <Edit3 className="h-3 w-3" />
              كتابة
            </TabsTrigger>
            <TabsTrigger value="preview" className="h-6 px-2 text-xs gap-1">
              <Eye className="h-3 w-3" />
              معاينة
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "write" | "preview")}>
        <TabsContent value="write" className="mt-0">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            dir="rtl"
            className={cn(
              "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
              "font-mono leading-relaxed resize-y"
            )}
            style={{ minHeight }}
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-0">
          <div
            className={cn(
              "w-full rounded-lg border border-border bg-background px-4 py-3",
              "prose prose-sm max-w-none dark:prose-invert"
            )}
            style={{ minHeight }}
          >
            {value ? (
              <ReactMarkdown>{value}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground text-sm">لا توجد معاينة بعد</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
