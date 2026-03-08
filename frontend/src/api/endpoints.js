export const ENDPOINTS = {
  HEALTH: "/health",
  REGISTER: "/auth/register",
  LOGIN: "/auth/login",
  VERIFY_OTP: "/auth/verify-otp",
  RESEND_OTP: "/auth/resend-otp",
  ME: "/auth/me",
  PROFILE: "/auth/me",
  LOGOUT: "/auth/logout",
  CONTACT: "/contact",
  ITEMS: "/items",
  ADMIN_PARKING_APPLICATIONS: "/admin/parking-applications",
  ADMIN_APPLICATION_DOCUMENTS: (applicationId) =>
    `/admin/parking-applications/${applicationId}/documents`,
  ADMIN_VIEW_DOCUMENT: (documentId) => `/admin/documents/${documentId}/view`,
  ADMIN_DOWNLOAD_DOCUMENT: (documentId) => `/admin/documents/${documentId}/download`,
  STUDENT_SEMESTERS: "/student/semesters",
  STUDENT_PARKING_APPLICATIONS: "/student/parking-applications",
};
