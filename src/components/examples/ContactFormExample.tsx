'use client';

import { useState } from 'react';
import { useFormPersistence as useSessionPersistence } from '@/hooks/use-form-persistence';

import { logger } from '@/lib/logger';

interface ContactFormData {
  name: string;
  email: string;
  message: string;
  newsletter: boolean;
}

export default function ContactPage() {
  // استخدام الـ hook الشامل لحفظ حالة الجلسة
  const {
    saveFormData: _saveFormData,
    restoreFormData,
    clearFormData,
    saveField,
    restoreField: _restoreField
  } = useSessionPersistence<ContactFormData>(
    'contact-form', // معرف النموذج
    {
      name: '',
      email: '',
      message: '',
      newsletter: false
    },
    {
      debounceMs: 300, // حفظ كل 300ms
      excludeFields: [], // لا نستبعد أي حقول
      autoSave: true
    }
  );

  // استعادة البيانات عند التحميل الأولي
  const [formData, setFormData] = useState<ContactFormData>(() => restoreFormData());

  // تحديث حقل معين
  const updateField = (field: keyof ContactFormData, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    saveField(field, value); // حفظ الحقل فوراً
  };

  // إرسال النموذج
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logger.info('إرسال البيانات:', formData);

    // مسح البيانات بعد الإرسال الناجح
    clearFormData();
    setFormData({
      name: '',
      email: '',
      message: '',
      newsletter: false
    });

    alert('تم إرسال النموذج بنجاح!');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">اتصل بنا</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            الاسم
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="أدخل اسمك" />
          
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="أدخل بريدك الإلكتروني" />
          
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-1">
            الرسالة
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e) => updateField('message', e.target.value)}
            rows={4}
            className="w-full p-2 border rounded-md"
            placeholder="اكتب رسالتك هنا" />
          
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="newsletter"
            checked={formData.newsletter}
            onChange={(e) => updateField('newsletter', e.target.checked)}
            className="mr-2" />
          
          <label htmlFor="newsletter" className="text-sm">
            اشترك في النشرة الإخبارية
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600">
            
            إرسال
          </button>
          <button
            type="button"
            onClick={() => {
              clearFormData();
              setFormData({
                name: '',
                email: '',
                message: '',
                newsletter: false
              });
            }}
            className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600">
            
            مسح البيانات
          </button>
        </div>
      </form>

      <div className="mt-8 p-4 bg-gray-100 rounded-md">
        <h2 className="text-lg font-semibold mb-2">حالة البيانات المحفوظة:</h2>
        <pre className="text-sm">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </div>
    </div>);

}