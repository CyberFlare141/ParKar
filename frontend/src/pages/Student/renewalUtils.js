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

export function getApplicationReferenceDate(application) {
  return (
    application?.reviewed_at ||
    application?.approved_at ||
    application?.updated_at ||
    application?.created_at ||
    null
  );
}

export function getRenewalRecord(_userId, application) {
  if (!application) {
    return null;
  }

  return {
    renewal_count: Number(application?.renewal_count || 0),
    current:
      application?.renewal_count || application?.is_renewal
        ? {
            submitted_at:
              application?.last_renewed_at ||
              (application?.is_renewal ? application?.created_at : null),
            request_status: application?.status || "pending",
            source_application_id:
              application?.renewal_source_application_id || application?.id || null,
          }
        : null,
    history: [],
  };
}

export function saveRenewalRecord() {
  return null;
}

export function getUserRenewalHistoryEntries(_userId, applications = []) {
  return applications
    .filter((application) => Boolean(application?.is_renewal))
    .sort((left, right) => {
      const leftTime = new Date(left?.created_at || 0).getTime();
      const rightTime = new Date(right?.created_at || 0).getTime();
      return rightTime - leftTime;
    });
}

export function getCombinedStudentApplications(_userId, applications = []) {
  return [...applications].sort((left, right) => {
    const leftTime = new Date(left?.created_at || 0).getTime();
    const rightTime = new Date(right?.created_at || 0).getTime();
    return rightTime - leftTime;
  });
}

export function getRenewalMeta(application, _userId, now = new Date()) {
  const normalizedStatus = String(application?.status || "").toLowerCase();
  const eligibleStatuses = new Set(["approved", "active"]);
  const canRenew = eligibleStatuses.has(normalizedStatus);
  const renewalRecord = getRenewalRecord(null, application);
  const referenceDate =
    application?.last_renewed_at || getApplicationReferenceDate(application);
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

  let lifecycleStatus = application?.status || "Unknown";
  let renewalStatus = "Not Eligible";
  let alertTone = "slate";
  let alertMessage = "Renewal becomes available after approval.";

  if (canRenew) {
    lifecycleStatus = isExpired ? "Renewal Required" : "Active";
    renewalStatus = "Active";
    alertTone = "emerald";
    alertMessage = "Your permit is active and using the latest approved information.";

    if (Number(application?.renewal_count || 0) > 0) {
      renewalStatus = "Updated During Renewal";
      alertTone = "amber";
      alertMessage =
        "A renewal has already been submitted or approved for this permit. Review the latest status before starting another one.";
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
    changedDocuments: [],
    addedDocuments: [],
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
