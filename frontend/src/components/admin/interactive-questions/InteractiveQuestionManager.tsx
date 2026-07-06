"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit, Check, X } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";

interface InteractiveQuestionManagerProps {
  lessonId: string;
  lessonTitle?: string;
}

interface InteractiveQuestion {
  id: string;
  lessonId: string;
  timePosition: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string | null;
  isActive: boolean;
}

export function InteractiveQuestionManager({ lessonId, lessonTitle }: InteractiveQuestionManagerProps) {
  const [questions, setQuestions] = useState<InteractiveQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<InteractiveQuestion | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [question, setQuestion] = useState("");
  const [timePosition, setTimePosition] = useState(0);
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (lessonId) {
      loadQuestions();
    }
  }, [lessonId]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<InteractiveQuestion[]>(`/admin/courses/lessons/${lessonId}/interactive-questions`);
      setQuestions(data || []);
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("فشل تحميل الأسئلة");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuestion("");
    setTimePosition(0);
    setOptions(["", "", "", ""]);
    setCorrectOptionIndex(0);
    setExplanation("");
    setIsActive(true);
    setEditingQuestion(null);
  };

  const handleAddQuestion = async () => {
    if (!question.trim() || options.some(opt => !opt.trim())) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      const data = await apiClient.post<InteractiveQuestion>(`/admin/courses/lessons/${lessonId}/interactive-questions`, {
        lessonId,
        timePosition,
        question,
        options: options.filter(opt => opt.trim()),
        correctOptionIndex,
        explanation: explanation || null,
        isActive,
      });

      setQuestions(prev => [...prev, data]);
      resetForm();
      setShowAddForm(false);
      toast.success("تم إضافة السؤال بنجاح");
    } catch (error) {
      console.error("Error adding question:", error);
      toast.error("فشل إضافة السؤال");
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;

    try {
      await apiClient.patch(`/admin/interactive-questions`, {
        id: editingQuestion.id,
        timePosition,
        question,
        options: options.filter(opt => opt.trim()),
        correctOptionIndex,
        explanation: explanation || null,
        isActive,
      });

      setQuestions(prev => 
        prev.map(q => q.id === editingQuestion.id 
          ? { ...q, timePosition, question, options: options.filter(opt => opt.trim()), correctOptionIndex, explanation, isActive }
          : q
        )
      );
      resetForm();
      setShowAddForm(false);
      toast.success("تم تحديث السؤال بنجاح");
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("فشل تحديث السؤال");
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟")) return;

    try {
      await apiClient.delete(`/admin/interactive-questions/${id}`);
      setQuestions(prev => prev.filter(q => q.id !== id));
      toast.success("تم حذف السؤال بنجاح");
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("فشل حذف السؤال");
    }
  };

  const startEdit = (q: InteractiveQuestion) => {
    setEditingQuestion(q);
    setQuestion(q.question);
    setTimePosition(q.timePosition);
    setOptions([...q.options, ...Array(4 - q.options.length).fill("")]);
    setCorrectOptionIndex(q.correctOptionIndex);
    setExplanation(q.explanation || "");
    setIsActive(q.isActive);
    setShowAddForm(true);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
    if (correctOptionIndex === index) {
      setCorrectOptionIndex(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>الأسئلة التفاعلية للدرس</span>
          {lessonTitle && <span className="text-sm font-normal text-muted-foreground">{lessonTitle}</span>}
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            إضافة سؤال
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showAddForm && (
          <div className="border rounded-lg p-4 mb-4 space-y-4">
            <h3 className="font-semibold">
              {editingQuestion ? "تعديل سؤال" : "إضافة سؤال جديد"}
            </h3>
            
            <div>
              <Label htmlFor="timePosition">وقت ظهور السؤال (بالثواني)</Label>
              <Input
                id="timePosition"
                type="number"
                value={timePosition}
                onChange={(e) => setTimePosition(Number(e.target.value))}
                placeholder="مثال: 45 لعرض السؤال عند الدقيقة 0:45"
              />
            </div>

            <div>
              <Label htmlFor="question">نص السؤال</Label>
              <Textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="اكتب السؤال هنا..."
                rows={3}
              />
            </div>

            <div>
              <Label>الخيارات</Label>
              <div className="space-y-2 mt-2">
                {options.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...options];
                        newOptions[index] = e.target.value;
                        setOptions(newOptions);
                      }}
                      placeholder={`الخيار ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant={correctOptionIndex === index ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCorrectOptionIndex(index)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="h-3 w-3 mr-1" />
                  إضافة خيار
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="explanation">التفسير (اختياري)</Label>
              <Textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="شرح الإجابة الصحيحة..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="isActive">السؤال مفعل</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}>
                إلغاء
              </Button>
              <Button onClick={editingQuestion ? handleUpdateQuestion : handleAddQuestion}>
                {editingQuestion ? "تحديث" : "إضافة"}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <p className="text-center py-4">جاري التحميل...</p>
          ) : questions.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              لا توجد أسئلة تفاعلية لهذا الدرس
            </p>
          ) : (
            questions.map((q) => (
              <Card key={q.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm bg-muted px-2 py-1 rounded">
                      عند الثانية {q.timePosition}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(q)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteQuestion(q.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="font-medium mb-2">{q.question}</p>
                  <div className="space-y-1 mb-2">
                    {q.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`text-sm p-2 rounded ${
                          idx === q.correctOptionIndex 
                            ? "bg-green-500/10 text-green-600 font-medium" 
                            : "bg-muted"
                        }`}
                      >
                        {idx + 1}. {opt}
                        {idx === q.correctOptionIndex && " ✓"}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      <span className="font-medium">التفسير:</span> {q.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}