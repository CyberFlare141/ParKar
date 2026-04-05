const RENEWAL_STORAGE_KEY = "parkar.studentApplicationRenewals";
const VALIDITY_MONTHS = 6;
const EXPIRY_WARNING_DAYS = 14;

function safeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMonths(value, monthCount) {
  const date = safeDate(value);
  if (!date) {
    return null;
  }

  const nextDate = new Date(date);
  const originalDay = nextDate.getDate();
  nextDate.setMonth(nextDate.getMonth() + monthCount);

  if (nextDate.getDate() < originalDay) {
    nextDate.setDate(0);
  }

  return nextDate;
}

function getStorageKey(userId, applicationId) {
  return `${userId || "guest"}:${applicationId}`;
}

function readRenewalStore() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(RENEWAL_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
  } catch {
    return {};
  }
}

function writeRenewalStore(store) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RENEWAL_STORAGE_KEY, JSON.stringify(store));
}

export function getApplicationReferenceDate(application) {
  return (
    application?.reviewed_at ||
    application?.approved_at ||
    application?.updated_at ||
    application?.created_at ||
    null
  );
}

export function getRenewalRecord(userId, applicationId) {
  const store = readRenewalStore();
  return store[getStorageKey(userId, applicationId)] || null;
}

export function saveRenewalRecord(userId, application, payload) {
  const store = readRenewalStore();
  const storageKey = getStorageKey(userId, application?.id);
  const previousRecord = store[storageKey] || {
    application_id: application?.id,
    user_id: userId,
    renewal_count: 0,
    current: null,
    history: [],
  };

  const submittedAt = new Date().toISOString();
  const expiresAt = addMonths(submittedAt, VALIDITY_MONTHS)?.toISOString() || null;
  const currentRecord = {
    submitted_at: submittedAt,
    expires_at: expiresAt,
    request_status: "pending",
    source_application_id: application?.id,
    document_mode: payload.documentMode,
    changed_documents: payload.changedDocuments || [],
    added_documents: payload.addedDocuments || [],
    kept_document_ids: payload.keptDocumentIds || [],
    acknowledgement: payload.acknowledgement || false,
    review_note: payload.reviewNote || "",
  };

  const nextRecord = {
    ...previousRecord,
    renewal_count: Number(previousRecord.renewal_count || 0) + 1,
    current: currentRecord,
    history: [...(previousRecord.history || []), currentRecord],
  };

  store[storageKey] = nextRecord;
  writeRenewalStore(store);

  return nextRecord;
}

export function getUserRenewalHistoryEntries(userId, applications = []) {
  const store = readRenewalStore();
  const normalizedUserId = String(userId || "");
  const applicationMap = new Map(
    applications.map((application) => [String(application?.id), application]),
  );

  return Object.values(store)
    .filter((record) => String(record?.user_id || "") === normalizedUserId)
    .flatMap((record) => {
      const sourceApplication = applicationMap.get(String(record?.application_id));
      const history = Array.isArray(record?.history) ? record.history : [];

      return history.map((entry, index) => ({
        id: `renewal-${record.application_id}-${index + 1}`,
        status: entry?.request_status || "pending",
        is_renewal: true,
        renewal_sequence: index + 1,
        renewal_source_application_id: record.application_id,
        created_at: entry?.submitted_at || null,
        reviewed_at: null,
        admin_comment:
          entry?.document_mode === "keep"
            ? "Renewal submitted with existing documents."
            : "Renewal submitted with document changes and is awaiting review.",
        semester: sourceApplication?.semester || null,
        vehicle: sourceApplication?.vehicle || null,
        ticket: null,
        documents: sourceApplication?.documents || [],
      }));
    })
    .sort((left, right) => {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return rightTime - leftTime;
    });
}

export function getCombinedStudentApplications(userId, applications = []) {
  const renewalEntries = getUserRenewalHistoryEntries(userId, applications);

  return [...renewalEntries, ...applications].sort((left, right) => {
    const leftTime = new Date(left?.created_at || 0).getTime();
    const rightTime = new Date(right?.created_at || 0).getTime();
    return rightTime - leftTime;
  });
}

export function getRenewalMeta(application, userId, now = new Date()) {
  const normalizedStatus = String(application?.status || "").toLowerCase();
  const eligibleStatuses = new Set(["approved", "active"]);
  const canRenew = eligibleStatuses.has(normalizedStatus);
  const renewalRecord = getRenewalRecord(userId, application?.id);
  const referenceDate =
    renewalRecord?.current?.submitted_at || getApplicationReferenceDate(application);
  const expiresAtDate = addMonths(referenceDate, VALIDITY_MONTHS);
  const expiresAt = expiresAtDate?.toISOString() || null;
  const daysUntilExpiry = expiresAtDate
    ? Math.ceil((expiresAtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpired = canRenew && typeof daysUntilExpiry === "number" && daysUntilExpiry < 0;
  const isExpiringSoon =
    canRenew &&
    typeof daysUntilExpiry === "number" &&
    daysUntilExpiry >= 0 &&
    daysUntilExpiry <= EXPIRY_WARNING_DAYS;
  const changedDocuments = renewalRecord?.current?.changed_documents || [];
  const addedDocuments = renewalRecord?.current?.added_documents || [];

  let lifecycleStatus = application?.status || "Unknown";
  let renewalStatus = "Not Eligible";
  let alertTone = "slate";
  let alertMessage = "Renewal becomes available after approval.";

  if (canRenew) {
    lifecycleStatus = isExpired ? "Renewal Required" : "Active";
    renewalStatus = "Active";
    alertTone = "emerald";
    alertMessage = "Your permit is active and using the latest approved information.";

    if (renewalRecord?.current && (changedDocuments.length || addedDocuments.length)) {
      renewalStatus = "Updated During Renewal";
      alertTone = "amber";
      alertMessage =
        "You renewed with document changes. Keep an eye on your records until the updated files are fully reviewed.";
    }

    if (isExpired) {
      renewalStatus = "Renewal Required";
      alertTone = "rose";
      alertMessage =
        "This application has passed its 6-month validity window and now needs renewal.";
    } else if (isExpiringSoon) {
      renewalStatus = "Expiring Soon";
      alertTone = "amber";
      alertMessage = `This application will expire in ${daysUntilExpiry} day${
        daysUntilExpiry === 1 ? "" : "s"
      }. Renew now to avoid interruption.`;
    }
  }

  return {
    canRenew,
    lifecycleStatus,
    renewalStatus,
    alertTone,
    alertMessage,
    referenceDate,
    expiresAt,
    daysUntilExpiry,
    isExpired,
    isExpiringSoon,
    renewalCount: renewalRecord?.renewal_count || 0,
    lastRenewedAt: renewalRecord?.current?.submitted_at || null,
    changedDocuments,
    addedDocuments,
  };
}

export function getRenewalAlertClass(tone) {
  if (tone === "rose") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }

  if (tone === "amber") {
    return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  }

  if (tone === "emerald") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

export function getRenewalBadgeClass(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "renewal required") {
    return "border border-rose-300/20 bg-rose-400/15 text-rose-200";
  }

  if (normalizedStatus === "expiring soon" || normalizedStatus === "updated during renewal") {
    return "border border-amber-300/20 bg-amber-400/15 text-amber-100";
  }

  if (normalizedStatus === "active") {
    return "border border-emerald-300/20 bg-emerald-400/15 text-emerald-200";
  }

  return "border border-white/10 bg-white/5 text-slate-200";
}
