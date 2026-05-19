import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { logger } from "@/lib/logger";

export const generateInvoicePDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        logger.error("Element not found for PDF generation");
        return;
    }

    // Force high quality
    const canvas = await html2canvas(element, {
        scale: 2, // Retained quality
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${filename}.pdf`);
};
