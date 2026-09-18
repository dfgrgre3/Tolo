import { logger } from "@/lib/logger";
import { toast } from "sonner";
// استيراد مباشر بدل التحميل الكسول: الـ chunks الكسولة لحزم خارج جذر
// Turbopack تتعطل في بيئة التطوير (module factory is not available).
// التكلفة محصورة في صفحات الفواتير فقط (code-split حسب المسار).
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export const generateInvoicePDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    logger.error("Element not found for PDF generation");
    toast.error("تعذر العثور على الفاتورة للتحميل");
    return;
  }

  // Ensure the off-screen template is measurable: temporarily make it visible
  const prevOpacity = element.style.opacity;
  const prevPosition = element.style.position;
  const wasHidden = element.getBoundingClientRect().width === 0;
  if (wasHidden) {
    element.style.opacity = "1";
    element.style.position = "static";
  }

  const toastId = toast.loading("جاري تجهيز الفاتورة PDF...");
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
    } else {
      // Multi-page: slice the canvas vertically
      const pxPerMm = canvas.width / pageWidth;
      const pagePxHeight = Math.floor(pageHeight * pxPerMm);
      let rendered = 0;
      let page = 0;
      while (rendered < canvas.height) {
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.min(pagePxHeight, canvas.height - rendered);
        const ctx = slice.getContext("2d");
        if (!ctx) break;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(
          canvas,
          0, rendered, canvas.width, slice.height,
          0, 0, canvas.width, slice.height
        );
        const sliceImg = slice.toDataURL("image/png");
        const sliceH = (slice.height * pageWidth) / canvas.width;
        if (page > 0) pdf.addPage();
        pdf.addImage(sliceImg, "PNG", 0, 0, pageWidth, sliceH);
        rendered += slice.height;
        page += 1;
      }
    }

    pdf.save(`${filename}.pdf`);
    toast.success("تم تحميل الفاتورة بنجاح", { id: toastId });
  } catch (err) {
    logger.error("Failed to generate PDF dynamically:", err);
    toast.error("فشل توليد الفاتورة — حاول مجدداً", { id: toastId });
  } finally {
    if (wasHidden) {
      element.style.opacity = prevOpacity;
      element.style.position = prevPosition;
    } else {
      toast.dismiss(toastId);
    }
  }
};
