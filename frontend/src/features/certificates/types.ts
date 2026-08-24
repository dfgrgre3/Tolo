// Real certificate shape returned by the backend's user-facing
// GET /api/certificates and GET /api/certificates/:courseId endpoints
// (internal/infrastructure/api/handlers/protected/course_handler_certificates.go).
// courseTitle is enriched server-side so the frontend never needs a second
// request per certificate.
export type Certificate = {
  id: string;
  courseId: string;
  courseTitle: string;
  userId: string;
  certificateNo: string;
  qrCodeUrl?: string | null;
  pdfUrl: string;
  issuedAt: string;
  createdAt: string;
};
