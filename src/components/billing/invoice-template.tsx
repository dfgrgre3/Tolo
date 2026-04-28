"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";

import QRCode from "qrcode";

interface InvoiceData {
  paymentId: string;
  orderId?: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  discountAmount?: number; // Total discount
  promoDiscount?: number;
  prorationDiscount?: number;
  balanceUsed?: number;
  finalAmount: number;
  date: string;
  paymentMethod: string;
}

export const InvoiceTemplate = ({ data }: {data: InvoiceData;}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    // Verification URL (mock)
    const verificationUrl = `https://thanawy.online/verify/${data.paymentId}`;
    QRCode.toDataURL(verificationUrl, { margin: 1, width: 100 }, (err, url) => {
      if (!err) setQrCodeUrl(url);
    });
  }, [data.paymentId]);

  return (
    <div id={`invoice-${data.paymentId}`} className="bg-white text-black p-12 max-w-[800px] mx-auto font-sans border shadow-sm relative" dir="rtl">
      {/* Top Banner (Optional Branded Touch) */}
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-blue-600" />

      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-100 pb-8 mb-10">
        <div className="flex gap-6">
            {qrCodeUrl &&
          <div className="border p-1 rounded-lg">
                    <img src={qrCodeUrl} alt="QR Verification" className="w-20 h-20" />
                </div>
          }
            <div>
                <h1 className="text-3xl font-extrabold text-blue-600 mb-1">منصة ثانوية أونلاين</h1>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Thanawy Online Educational Platform</p>
                <div className="mt-3 flex gap-4 text-[10px] text-gray-500 font-bold">
                    <span>الرقم الضريبي: ٣١٢-٤٥٦-٧٨٩</span>
                    <span>سجل تجاري: ١٢٣٤٥٦٧٨٩٠</span>
                </div>
            </div>
        </div>
        <div className="text-left" dir="ltr">
          <div className="text-3xl font-black text-gray-200 mb-1 tracking-tighter">INVOICE</div>
          <p className="text-blue-600 font-bold text-sm">#{data.paymentId.slice(-8).toUpperCase()}</p>
          <div className="mt-2 text-[10px] text-gray-400">
               <p>Simplified Tax Invoice</p>
               <p>فاتورة ضريبية مبسطة</p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div>
          <h3 className="text-blue-600/50 text-[10px] font-black mb-3 border-b pb-1 uppercase tracking-widest">مظڈقدمة إلى (Billed To):</h3>
          <div className="space-y-1">
            <p className="font-bold text-lg text-gray-800">{data.customerName}</p>
            <p className="text-gray-500 text-sm">{data.customerEmail}</p>
          </div>
        </div>
        <div className="text-left" dir="ltr">
          <h3 className="text-blue-600/50 text-[10px] font-black mb-3 border-b pb-1 uppercase tracking-widest">TRANSACTION INFO:</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-400 font-medium">Date:</span> <span className="text-gray-700 font-bold">{format(new Date(data.date), 'dd/MM/yyyy')}</span></p>
            <p><span className="text-gray-400 font-medium">Method:</span> <span className="text-gray-700 font-bold">{data.paymentMethod}</span></p>
            {data.orderId && <p><span className="text-gray-400 font-medium">Order ID:</span> <span className="text-gray-700 font-bold">#{data.orderId}</span></p>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mb-12">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-blue-50/50 text-blue-600">
                <th className="p-4 border-b text-[11px] font-black uppercase tracking-wider">البند (Item Description)</th>
                <th className="p-4 border-b text-center text-[11px] font-black uppercase tracking-wider">الكمية</th>
                <th className="p-4 border-b text-left text-[11px] font-black uppercase tracking-wider">السعر</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            <tr>
                <td className="p-4">
                    <p className="font-bold text-gray-800">{data.planName}</p>
                    <p className="text-[10px] text-gray-400 mt-1">وصول كامل لجميع المحاضرات والملخصات والاختبارات</p>
                </td>
                <td className="p-4 text-center text-gray-600 font-bold">1</td>
                <td className="p-4 text-left font-mono font-bold text-gray-800">{data.amount} ج.م</td>
            </tr>
            {data.promoDiscount && data.promoDiscount > 0 &&
            <tr className="text-green-600 italic">
                    <td className="p-4">خصم كود الترويجي (Promo Code)</td>
                    <td className="p-4 text-center">---</td>
                    <td className="p-4 text-left font-mono font-bold">-{data.promoDiscount} ج.م</td>
                </tr>
            }
            {data.prorationDiscount && data.prorationDiscount > 0 &&
            <tr className="text-blue-500 italic">
                    <td className="p-4">خصم الترقية التناسبي (Proration Discount)</td>
                    <td className="p-4 text-center">---</td>
                    <td className="p-4 text-left font-mono font-bold">-{data.prorationDiscount} ج.m</td>
                </tr>
            }
            {data.balanceUsed && data.balanceUsed > 0 &&
            <tr className="text-purple-600 italic">
                    <td className="p-4">رصيد المحفظة المستخدم (Wallet Balance)</td>
                    <td className="p-4 text-center">---</td>
                    <td className="p-4 text-left font-mono font-bold">-{data.balanceUsed} ج.م</td>
                </tr>
            }
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-between items-end">
        <div className="text-[10px] text-gray-400 max-w-[300px]" dir="rtl">
            <p className="font-bold mb-1">شروط عامة:</p>
            <p>هذا الاشتراك صالح لمدة محددة حسب الباقة المختارة من تاريخ الدفع. لا يتم استرداد المبالغ بعد تفعيل الخدمة.</p>
        </div>
        <div className="w-72 space-y-3 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
            <div className="flex justify-between text-gray-400 text-sm">
                <span>سعر الباقة الأصلي</span>
                <span>{data.amount} ج.م</span>
            </div>
            {data.discountAmount !== undefined && data.discountAmount > 0 &&
          <div className="flex justify-between text-green-600 font-bold text-sm">
                    <span>إحصالي الخصومات</span>
                    <span>-{data.discountAmount} ج.م</span>
                </div>
          }
            <div className="flex justify-between text-2xl font-black border-t-2 border-dashed border-gray-200 pt-4 text-blue-600">
                <span>الإجمالي</span>
                <span className="font-mono">{data.finalAmount} ج.م</span>
            </div>
        </div>
      </div>

      {/* Footer / Legal info */}
      <div className="mt-20 pt-8 border-t border-gray-100 text-center">
          <div className="flex justify-center gap-12 mb-6 text-[10px] text-gray-500 font-bold grayscale opacity-50">
               <img src="/pci-logo.png" alt="PCI DSS" className="h-4" />
               <img src="/paymob-logo.png" alt="Paymob Secured" className="h-4" />
               <p>SECURE TRANSACTION</p>
          </div>
          <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
               هذه الفاتورة تم توليدها آلياً بواسطة نظام &quot;ثانوية أونلاين&quot;. 
               <br />
               تم رصد ضريبة القيمة المضافة طبقاً لأحكام القانون المصري.
          </p>
          <div className="text-blue-600 text-[10px] font-black tracking-widest mt-4">
              THANAWY.ONLINE ⬢ CAIRO, EGYPT
          </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        div { font-family: 'Cairo', sans-serif; }
      `}</style>
    </div>);

};