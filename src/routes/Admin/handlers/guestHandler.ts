import { Env } from "../../../index";
import { json, jsonError, normalisePhone } from "./utils";
import * as XLSX from "xlsx";
import {
  createGuest,
  editGuest,
  deleteGuest,
  getGuestsPaginated,
  getGuestByPhone,
} from "../../../services/guestService";
import { JWTPayload } from "../../../utils/jwt";
import { writeAuditLog } from "../../../services/auditService";

export async function handleGuests(
  req: Request,
  url: URL,
  env: Env,
  user: JWTPayload,
  method: string,
  pathname: string,
) {
  if (pathname === "/api/admin/guests") {
    if (method === "GET") {
      try {
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const search = url.searchParams.get("search") || "";
        const show_deleted = url.searchParams.get("show_deleted") === "true";
        const filter_category = url.searchParams.get("category") || "";
        const filter_priority = url.searchParams.get("priority") || "";
        const filter_importance = url.searchParams.get("importance") || "";
        const filter_guest_group_id =
          url.searchParams.get("guest_group_id") || "";
        const filter_invitation_type =
          url.searchParams.get("invitation_type") || "";
        const filter_invite_status =
          url.searchParams.get("invite_status") || "";
        return json(
          await getGuestsPaginated(env, page, limit, search, show_deleted, {
            category: filter_category,
            priority: filter_priority,
            importance: filter_importance,
            guest_group_id: filter_guest_group_id,
            invitation_type: filter_invitation_type,
            invite_status: filter_invite_status,
            created_by: url.searchParams.get("created_by") || undefined,
          }),
        );
      } catch {
        return jsonError("Failed to fetch guests", 500);
      }
    }
    if (method === "POST") {
      try {
        const body = (await req.json()) as any;
        const {
          first_name,
          last_name,
          phone_number,
          category,
          pax_allowed,
          priority,
          importance,
          notes,
          guest_group_id,
          invitation_type,
          event_access_override,
          display_name,
          enable_display_name,
          is_verified,
        } = body ?? {};
        if (!first_name || !last_name || !phone_number)
          return jsonError(
            "first_name, last_name and phone_number are required",
            400,
          );
        const validInviteTypes = ["digital", "physical", "both"];
        const validAccess = ["both", "hm_only", "resepsi_only"];
        const result = await createGuest(env, {
            first_name,
            last_name,
            phone_number: normalisePhone(phone_number),
            category: category || "friend",
            pax_allowed: parseInt(pax_allowed) || 1,
            priority: priority || "medium",
            importance: importance || "normal",
            notes: notes || null,
            guest_group_id: guest_group_id || null,
            invitation_type: validInviteTypes.includes(invitation_type)
              ? invitation_type
              : "digital",
            event_access_override: validAccess.includes(event_access_override)
              ? event_access_override
              : null,
            created_by: user.user_id,
            updated_by: user.user_id,
            display_name: display_name,
            enable_display_name: !!enable_display_name,
            is_verified: !!is_verified,
          });
        writeAuditLog(env, user, "guest.create", "guests", {
          resource_id: (result as any).id,
          detail: `${first_name} ${last_name}`,
          request: req,
        });
        return json(result, 201);
      } catch {
        return jsonError("Invalid JSON body", 400);
      }
    }
  }

  if (pathname === "/api/admin/guests/export" && method === "GET") {
    try {
      const { results } = await env.DB.prepare(
        `SELECT g.*, gg.name as guest_group_name
         FROM guests g
         LEFT JOIN guest_groups gg ON gg.id = g.guest_group_id
         WHERE g.deleted_at IS NULL
         ORDER BY g.created_at DESC`
      ).all<any>();

      const headers = [
        "first_name", "last_name", "display_name", "phone_number",
        "category", "pax_allowed", "priority", "importance",
        "invitation_type", "invite_status", "guest_group_name", "notes",
      ];

      const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const rows = results.map((g) => headers.map((h) => escape(g[h])).join(","));
      const csv = [headers.join(","), ...rows].join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="guests-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    } catch {
      return jsonError("Failed to export guests", 500);
    }
  }

  if (pathname === "/api/admin/guests/import" && method === "POST") {
    if (!["admin", "partner", "parents"].includes(user.role)) {
      return jsonError("Forbidden", 403);
    }
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) return jsonError("No file uploaded", 400);

      const fileName = file.name?.toLowerCase() || "";
      const isXlsx = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

      let rows: Record<string, string>[] = [];

      if (isXlsx) {
        // Parse XLSX — ambil sheet pertama saja
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: "",
          raw: false,
        });

        if (jsonData.length === 0)
          return jsonError("Sheet pertama kosong atau tidak ada data", 400);

        rows = jsonData
          .map((row) => {
            const normalized: Record<string, string> = {};
            for (const key of Object.keys(row)) {
              normalized[key.toLowerCase().trim()] = String(row[key] ?? "").trim();
            }
            return normalized;
          })
          // Skip baris yang first_name kosong (bisa jadi baris contoh atau kosong)
          .filter((r) => r.first_name?.trim());

      } else {
        // Parse CSV
        const text = await file.text();
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2)
          return jsonError("CSV must have header and at least one row", 400);

        const rawHeader = lines[0]
          .split(",")
          .map((h) => h.replace(/"/g, "").trim().toLowerCase());

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          // Skip comment lines (referensi master data)
          if (line.startsWith('"#') || line.startsWith("#")) continue;

          const values: string[] = [];
          let current = "";
          let inQuotes = false;
          for (const char of line) {
            if (char === '"') { inQuotes = !inQuotes; continue; }
            if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
            current += char;
          }
          values.push(current.trim());

          const row: Record<string, string> = {};
          rawHeader.forEach((h, idx) => { row[h] = values[idx] || ""; });
          if (row.first_name?.trim()) {
            rows.push(row);
          }
        }

        if (rows.length === 0)
          return jsonError("Tidak ada data valid di file", 400);
      }

      // Validate required columns dari sample row pertama
      const sampleRow = rows[0];
      const required = ["first_name", "last_name"];
      for (const r of required) {
        if (!(r in sampleRow))
          return jsonError(`Missing required column: ${r}`, 400);
      }

      const importResults = { success: 0, failed: 0, errors: [] as string[] };

      // Load all guest groups once for name → id resolution
      const { results: groupResults } = await env.DB.prepare(
        "SELECT id, name FROM guest_groups WHERE deleted_at IS NULL"
      ).all<{ id: string; name: string }>();

      const groupMap = new Map<string, string>();
      for (const g of groupResults) {
        groupMap.set(g.name.toLowerCase().trim(), g.id);
      }

      for (const [i, row] of rows.entries()) {
        try {

          if (!row.first_name || !row.last_name) {
            importResults.failed++;
            importResults.errors.push(`Row ${i + 1}: first_name and last_name are required`);
            continue;
          }

          // Check duplicate by phone only if provided
          if (row.phone_number?.trim()) {
            const normalised = normalisePhone(row.phone_number);
            const existing = await getGuestByPhone(env, normalised);
            if (existing) {
              importResults.failed++;
              importResults.errors.push(`Row ${i + 1}: phone ${normalised} already exists (skipped)`);
              continue;
            }
          }

          // Resolve guest_group_name to guest_group_id
          let resolvedGroupId: string | null = null;
          if (row.guest_group_name?.trim()) {
            resolvedGroupId = groupMap.get(row.guest_group_name.toLowerCase().trim()) || null;
          }

          const validInviteTypes = ["digital", "physical", "both"];
          await createGuest(env, {
            first_name: row.first_name,
            last_name: row.last_name,
            phone_number: row.phone_number?.trim()
              ? normalisePhone(row.phone_number)
              : "",
            display_name: row.display_name || undefined,
            pax_allowed: parseInt(row.pax_allowed) || 1,
            category: ["friend", "colleague", "family"].includes(row.category)
              ? row.category : "friend",
            priority: ["low", "medium", "high"].includes(row.priority)
              ? row.priority : "medium",
            importance: ["normal", "vip", "vvip"].includes(row.importance)
              ? row.importance : "normal",
            invitation_type: validInviteTypes.includes(row.invitation_type)
              ? row.invitation_type : "digital",
            guest_group_id: resolvedGroupId,
            notes: row.notes?.trim() || null,
            created_by: user.user_id,
            updated_by: user.user_id,
            enable_display_name: !!row.display_name,
          });
          importResults.success++;
        } catch (e: any) {
          importResults.failed++;
          importResults.errors.push(`Row ${i + 1}: ${e.message}`);
        }
      }

      writeAuditLog(env, user, "guest.create", "guests", {
        detail: `CSV import: ${importResults.success} success, ${importResults.failed} failed`,
        request: req,
      });
      return json(importResults, importResults.success > 0 ? 200 : 400);
    } catch (e: any) {
      console.error("Import CSV error:", e?.message);
      return jsonError("Failed to process CSV", 500);
    }
  }

  if (pathname === "/api/admin/guests/bulk-delete" && method === "POST") {
    try {
      const { ids } = (await req.json()) as any;
      if (!Array.isArray(ids) || !ids.length)
        return jsonError("ids required", 400);
      const results = await Promise.allSettled(
        ids.map((id) => deleteGuest(env, id, user.user_id)),
      );
      const deleted = results.filter(
        (r) => r.status === "fulfilled" && (r as any).value,
      ).length;
      writeAuditLog(env, user, "guest.bulk_delete", "guests", {
        detail: `${deleted} guests deleted`,
        request: req,
      });
      return json({ deleted, total: ids.length });
    } catch {
      return jsonError("Failed to bulk delete guests", 500);
    }
  }

  // GET /api/admin/guests/names — lightweight endpoint for duplicate detection
  if (pathname === "/api/admin/guests/names" && method === "GET") {
    try {
      const { results } = await env.DB.prepare(
        `SELECT id, first_name, last_name, display_name, created_by
         FROM guests
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC`
      ).all<any>();
      return json({ names: results });
    } catch {
      return jsonError("Failed to fetch guest names", 500);
    }
  }

  if (
    pathname.startsWith("/api/admin/guests/") &&
    pathname !== "/api/admin/guests/bulk-delete" &&
    pathname !== "/api/admin/guests/export" &&
    pathname !== "/api/admin/guests/import" &&
    pathname !== "/api/admin/guests/names"
  ) {
    const id = pathname.split("/").pop();
    if (!id) return jsonError("Invalid ID", 400);
    if (method === "PUT") {
      try {
        const body = (await req.json()) as any;
        if (body.pax_allowed !== undefined)
          body.pax_allowed = parseInt(body.pax_allowed) || 1;
        if (body.notes !== undefined) body.notes = body.notes?.trim() || null;
        if (body.phone_number !== undefined)
          body.phone_number = normalisePhone(body.phone_number);
        if (body.guest_group_id !== undefined)
          body.guest_group_id = body.guest_group_id || null;
        if (
          body.invitation_type !== undefined &&
          !["digital", "physical", "both"].includes(body.invitation_type)
        )
          body.invitation_type = "digital";
        if (
          body.priority !== undefined &&
          !["low", "medium", "high"].includes(body.priority)
        )
          body.priority = "medium";
        if (
          body.importance !== undefined &&
          !["normal", "vip", "vvip"].includes(body.importance)
        )
          body.importance = "normal";
        if (body.event_access_override !== undefined) {
          const validAccess = ["both", "hm_only", "resepsi_only"];
          body.event_access_override = validAccess.includes(
            body.event_access_override,
          )
            ? body.event_access_override
            : null; // null = reset to inherit from group
        }
        if (body.enable_display_name !== undefined) {
          body.enable_display_name = !!body.enable_display_name;
        }
        if (body.is_verified !== undefined) {
          body.is_verified = !!body.is_verified;
        }
        body.updated_by = user.user_id;
        const updated = await editGuest(env, id, body);
        if (!updated) return jsonError("Guest not found", 404);
        writeAuditLog(env, user, "guest.update", "guests", { resource_id: id, request: req });
        return json(updated);
      } catch {
        return jsonError("Failed to update guest", 500);
      }
    }
    if (method === "PATCH" && pathname.endsWith("/mark-invited")) {
      // Re-parse ID: extract UUID from path, not the last segment
      const segments = pathname.split("/");
      const markInvitedIndex = segments.indexOf("mark-invited");
      const guestId = markInvitedIndex > 0 ? segments[markInvitedIndex - 1] : id;

      try {
        const body = (await req.json()) as any;
        const status = body?.status;
        const validStatuses = ["sent", "pending"];
        if (!status || !validStatuses.includes(status)) {
          return jsonError("status must be 'sent' or 'pending'", 400);
        }
        const updated = await editGuest(env, guestId, {
          invite_status: status,
          updated_by: user.user_id,
        });
        if (!updated) return jsonError("Guest not found", 404);
        writeAuditLog(env, user, "guest.mark_invited", "guests", {
          resource_id: guestId,
          detail: `invite_status → ${status}`,
          request: req,
        });
        return json({ id: guestId, invite_status: status });
      } catch {
        return jsonError("Failed to update invite status", 500);
      }
    }
    if (method === "DELETE") {
      try {
        if (!(await deleteGuest(env, id, user.user_id)))
          return jsonError("Guest not found", 404);
        writeAuditLog(env, user, "guest.delete", "guests", { resource_id: id, request: req });
        return new Response(null, { status: 204 });
      } catch {
        return jsonError("Failed to delete guest", 500);
      }
    }
  }

  return jsonError("Not Found", 404);
}
