import { Env } from "../../../index";
import { json, jsonError } from "./utils";

export async function handleDashboard(env: Env) {
  try {
    const [
      guestStats,
      rsvpStats,
      wishesCount,
      recentWishes,
      giftStats,
      recentGifts,
      settingsRows,
    ] = await Promise.all([
      // Guest totals + breakdowns
      env.DB.batch([
        env.DB.prepare("SELECT COUNT(*) as total FROM guests WHERE deleted_at IS NULL"),
        env.DB.prepare("SELECT COALESCE(SUM(pax_allowed),0) as total_pax FROM guests WHERE deleted_at IS NULL"),
        env.DB.prepare("SELECT category, COUNT(*) as count FROM guests WHERE deleted_at IS NULL GROUP BY category"),
        env.DB.prepare("SELECT importance, COUNT(*) as count FROM guests WHERE deleted_at IS NULL GROUP BY importance"),
        env.DB.prepare("SELECT priority, COUNT(*) as count FROM guests WHERE deleted_at IS NULL GROUP BY priority"),
        env.DB.prepare("SELECT COUNT(*) as invite_sent FROM guests WHERE invite_status='sent' AND deleted_at IS NULL"),
        env.DB.prepare("SELECT COUNT(*) as not_sent FROM guests WHERE (invite_status IS NULL OR invite_status != 'sent') AND deleted_at IS NULL"),
        env.DB.prepare("SELECT COUNT(*) as visited_count FROM guests WHERE visited_at IS NOT NULL AND deleted_at IS NULL"),
      ]),

      // RSVP breakdown
      env.DB.batch([
        env.DB.prepare("SELECT COUNT(*) as total FROM rsvps"),
        env.DB.prepare("SELECT COUNT(*) as attending FROM rsvps WHERE attendance='yes'"),
        env.DB.prepare("SELECT COUNT(*) as not_attending FROM rsvps WHERE attendance='no'"),
        env.DB.prepare("SELECT COUNT(*) as maybe FROM rsvps WHERE attendance='maybe'"),
        env.DB.prepare("SELECT COALESCE(SUM(pax),0) as total_pax FROM rsvps WHERE attendance='yes'"),
        env.DB.prepare("SELECT COUNT(*) as hm_only FROM rsvps WHERE event_attendance='hm_only' AND attendance != 'no'"),
        env.DB.prepare("SELECT COUNT(*) as resepsi_only FROM rsvps WHERE event_attendance='resepsi_only' AND attendance != 'no'"),
        env.DB.prepare("SELECT COUNT(*) as both_events FROM rsvps WHERE event_attendance='both' AND attendance != 'no'"),
      ]),

      // Wishes count
      env.DB.prepare("SELECT COUNT(*) as count FROM wishes").first(),

      // Recent 5 wishes
      env.DB.prepare("SELECT * FROM wishes ORDER BY created_at DESC LIMIT 5").all(),

      // Gift summary
      env.DB.batch([
        env.DB.prepare("SELECT COALESCE(SUM(amount),0) as total_amount, COUNT(*) as transfer_count FROM gifts WHERE type='bank_transfer' AND deleted_at IS NULL"),
        env.DB.prepare("SELECT COUNT(*) as physical_count, SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as physical_confirmed FROM gifts WHERE type='physical' AND deleted_at IS NULL"),
        env.DB.prepare("SELECT SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending_count, SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as confirmed_count FROM gifts WHERE deleted_at IS NULL"),
      ]),

      // Recent 5 gifts
      env.DB.prepare("SELECT id, type, sender_name, amount, bank_name, product_name, status, created_at FROM gifts WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5").all(),

      // Settings
      env.DB.prepare("SELECT key, value FROM settings").all(),
    ]);

    // Parse guest stats
    const [totalRow, paxRow, byCatRows, byImpRows, byPriRows, inviteSentRow, notSentRow, visitedRow] = guestStats;
    const by_category: Record<string, number> = {};
    for (const r of byCatRows.results as any[]) by_category[r.category || 'unknown'] = r.count;
    const by_importance: Record<string, number> = {};
    for (const r of byImpRows.results as any[]) by_importance[r.importance || 'normal'] = r.count;
    const by_priority: Record<string, number> = {};
    for (const r of byPriRows.results as any[]) by_priority[r.priority || 'medium'] = r.count;

    // Parse RSVP stats
    const [rsvpTotal, rsvpAttend, rsvpNot, rsvpMaybe, rsvpPax, rsvpHM, rsvpResepsi, rsvpBoth] = rsvpStats;

    // Parse gift stats
    const [giftTransfer, giftPhysical, giftStatus] = giftStats;

    // Parse settings into key-value map
    const settings: Record<string, any> = {};
    for (const row of settingsRows.results as any[]) {
      try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
    }

    return json({
      guests: {
        total:        (totalRow.results[0] as any)?.total || 0,
        total_pax:    (paxRow.results[0] as any)?.total_pax || 0,
        by_category,
        by_importance,
        by_priority,
        invite_sent:  (inviteSentRow.results[0] as any)?.invite_sent || 0,
        not_sent:     (notSentRow.results[0] as any)?.not_sent || 0,
        visited_count: (visitedRow.results[0] as any)?.visited_count || 0,
      },
      rsvp: {
        total:          (rsvpTotal.results[0] as any)?.total || 0,
        attending:      (rsvpAttend.results[0] as any)?.attending || 0,
        not_attending:  (rsvpNot.results[0] as any)?.not_attending || 0,
        maybe:          (rsvpMaybe.results[0] as any)?.maybe || 0,
        total_pax:      (rsvpPax.results[0] as any)?.total_pax || 0,
        hm_only:        (rsvpHM.results[0] as any)?.hm_only || 0,
        resepsi_only:   (rsvpResepsi.results[0] as any)?.resepsi_only || 0,
        both_events:    (rsvpBoth.results[0] as any)?.both_events || 0,
      },
      wishes_count:  (wishesCount as any)?.count || 0,
      recent_wishes: recentWishes.results,
      gifts: {
        ...(giftTransfer.results[0] as any),
        ...(giftPhysical.results[0] as any),
        ...(giftStatus.results[0] as any),
      },
      recent_gifts: recentGifts.results,
      settings,
    });
  } catch (e) {
    console.error('Dashboard error:', e);
    return jsonError("Failed to load dashboard", 500);
  }
}
