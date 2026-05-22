import * as React from "react";
import { useState } from "react";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { CreateExperimentData } from "@/types/ab-testing";

interface CreateExperimentDialogProps {
  children?: React.ReactNode;
  onCreate: (experiment: CreateExperimentData) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CreateExperimentDialog: React.FC<CreateExperimentDialogProps> = ({
  children,
  onCreate,
  open: externalOpen,
  onOpenChange: setExternalOpen
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;

  const handleOpenChange = (open: boolean) => {
    if (setExternalOpen) {
      setExternalOpen(open);
    } else {
      setInternalOpen(open);
    }
  };
  const [newExperiment, setNewExperiment] = useState<CreateExperimentData>({
    title: "",
    description: "",
    variantAName: "",
    variantBName: "",
    targetAudience: "all"
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newExperiment.title || !newExperiment.variantAName || !newExperiment.variantBName) {
      alert("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    setIsCreating(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    onCreate(newExperiment);

    setNewExperiment({
      title: "",
      description: "",
      variantAName: "",
      variantBName: "",
      targetAudience: "all"
    });
    handleOpenChange(false);
    setIsCreating(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إنشاء تجربة A/B جديدة</DialogTitle>
          <DialogDescription>
            قم بتحديد تفاصيل التجربة التي ترغب في إنشائها لمقارنة نسختين من المحتوى التعليمي
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="title">عنوان التجربة *</Label>
              <Input
                id="title"
                value={newExperiment.title}
                onChange={(e) => setNewExperiment({ ...newExperiment, title: e.target.value })}
                placeholder="مثلاً: تجربة تأثير شكل الأسئلة على أداء الطلاب" />
              
            </div>
            
            <div>
              <Label htmlFor="description">وصف التجربة</Label>
              <Textarea
                id="description"
                value={newExperiment.description}
                onChange={(e) => setNewExperiment({ ...newExperiment, description: e.target.value })}
                placeholder="اشرح تفاصيل التجربة وأهدافها..."
                rows={3} />
              
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="variantA">النسخة (أ) *</Label>
                <Input
                  id="variantA"
                  value={newExperiment.variantAName}
                  onChange={(e) => setNewExperiment({ ...newExperiment, variantAName: e.target.value })}
                  placeholder="اسم النسخة الأولى" />
                
              </div>
              
              <div>
                <Label htmlFor="variantB">النسخة (ب) *</Label>
                <Input
                  id="variantB"
                  value={newExperiment.variantBName}
                  onChange={(e) => setNewExperiment({ ...newExperiment, variantBName: e.target.value })}
                  placeholder="اسم النسخة الثانية" />
                
              </div>
            </div>
            
            <div>
              <Label htmlFor="audience">الفئة المستهدفة</Label>
              <Select
                value={newExperiment.targetAudience}
                onValueChange={(value) => setNewExperiment({ ...newExperiment, targetAudience: value })}>
                
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة المستهدفة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستخدمين</SelectItem>
                  <SelectItem value="new_users">المستخدمون الجدد فقط</SelectItem>
                  <SelectItem value="premium">المشتركين المميزين</SelectItem>
                  <SelectItem value="math">طلاب مادة الرياضيات</SelectItem>
                  <SelectItem value="physics">طلاب مادة الفيزياء</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <AdminButton
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="gap-2">
            
            <X className="w-4 h-4" /> إلغاء
          </AdminButton>
          <AdminButton
            className="gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
            onClick={handleCreate}
            disabled={isCreating}>
            
            <Plus className="w-4 h-4" /> {isCreating ? "جاري الإنشاء..." : "إنشاء التجربة"}
          </AdminButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

};