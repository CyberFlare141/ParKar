import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCombinedStudentApplications,
  getRenewalMeta,
  saveRenewalRecord,
} from "./renewalUtils";

describe("renewal utilities", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("marks an approved application as expiring soon inside the warning window", () => {
    const application = {
      id: 10,
      status: "approved",
      reviewed_at: "2026-01-01T00:00:00.000Z",
    };

    const meta = getRenewalMeta(application, 3, new Date("2026-06-20T00:00:00.000Z"));

    expect(meta.canRenew).toBe(true);
    expect(meta.renewalStatus).toBe("Expiring Soon");
    expect(meta.isExpiringSoon).toBe(true);
    expect(meta.daysUntilExpiry).toBe(11);
  });

  it("saves renewal history and combines it ahead of older applications", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T00:00:00.000Z"));

    const application = {
      id: 25,
      status: "approved",
      created_at: "2026-01-01T00:00:00.000Z",
      semester: { id: 1, name: "Spring 2026" },
      vehicle: { id: 2, plate_number: "DHAKA-123" },
      documents: [{ id: 3, document_type: "license" }],
    };

    const record = saveRenewalRecord(7, application, {
      documentMode: "keep",
      keptDocumentIds: [3],
      acknowledgement: true,
    });

    const combined = getCombinedStudentApplications(7, [application]);

    expect(record.renewal_count).toBe(1);
    expect(record.current.request_status).toBe("pending");
    expect(combined[0]).toMatchObject({
      is_renewal: true,
      renewal_source_application_id: 25,
      status: "pending",
    });
    expect(combined[1]).toBe(application);
  });
});
