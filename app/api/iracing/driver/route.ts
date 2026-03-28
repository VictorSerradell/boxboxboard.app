// /app/api/iracing/driver/route.ts
// Endpoints: search drivers by name, get driver profile

import { NextRequest, NextResponse } from "next/server";

const BASE = "https://members-ng.iracing.com/data";

async function iracingFetch(path: string, token: string) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
  });
  if (!res.ok) throw new Error(`iRacing ${res.status}: ${path}`);
  const raw = await res.json();
  if (raw?.link) return fetch(raw.link).then((r) => r.json());
  return raw;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("iracing_access_token")?.value;
  if (!token)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action"); // 'search' | 'profile' | 'races' | 'summary'
  const query = searchParams.get("q");
  const custId = searchParams.get("cust_id");

  try {
    // ── Search by name ───────────────────────────────────────
    if (action === "search" && query) {
      const data = await iracingFetch(
        `lookup/drivers?search_term=${encodeURIComponent(query)}&lowerbound=1&upperbound=10`,
        token,
      );
      const drivers = Array.isArray(data) ? data : (data?.drivers ?? []);
      return NextResponse.json({
        drivers: drivers.slice(0, 10).map((d: any) => ({
          cust_id: d.cust_id,
          display_name: d.display_name,
          club_name: d.club_name ?? "",
          helmet: d.helmet ?? null,
        })),
      });
    }

    // ── Full profile ─────────────────────────────────────────
    if (action === "profile" && custId) {
      const [memberData, summaryData] = await Promise.all([
        iracingFetch(
          `member/get?cust_ids=${custId}&include_licenses=true`,
          token,
        ),
        iracingFetch(`stats/member_summary?cust_id=${custId}`, token).catch(
          () => null,
        ),
      ]);

      const member = Array.isArray(memberData?.members)
        ? memberData.members[0]
        : (memberData?.member ?? memberData);

      console.log("[driver/profile] member keys:", Object.keys(member ?? {}));
      console.log(
        "[driver/profile] raw licenses:",
        JSON.stringify(member?.licenses).slice(0, 300),
      );
      console.log(
        "[driver/profile] summaryData:",
        JSON.stringify(summaryData).slice(0, 300),
      );

      // iRacing category_id → key mapping (from member/info response we know the real IDs)
      // oval=1, sports_car=5, formula_car=6, dirt_oval=3, dirt_road=4
      const CATEGORY_BY_ID: Record<number, string> = {
        1: "oval",
        2: "road",
        3: "dirt_oval",
        4: "dirt_road",
        5: "sports_car",
        6: "formula_car",
      };
      const VALID_CATS = new Set([
        "oval",
        "sports_car",
        "formula_car",
        "dirt_oval",
        "dirt_road",
      ]);

      const rawLicenses = member?.licenses ?? {};
      const licenses: Record<string, any> = {};

      if (Array.isArray(rawLicenses)) {
        for (const l of rawLicenses) {
          const key = VALID_CATS.has(l.category)
            ? l.category
            : (CATEGORY_BY_ID[l.category_id] ?? String(l.category_id));
          licenses[key] = l;
        }
      } else {
        // Object format — keys may be category names or numeric strings
        for (const [key, lic] of Object.entries(rawLicenses)) {
          const l = lic as any;
          const numKey = Number(key);
          let catKey: string;
          if (VALID_CATS.has(key)) {
            catKey = key;
          } else if (VALID_CATS.has(l?.category)) {
            catKey = l.category;
          } else if (!isNaN(numKey)) {
            catKey =
              CATEGORY_BY_ID[numKey] ?? CATEGORY_BY_ID[l?.category_id] ?? key;
          } else {
            catKey = CATEGORY_BY_ID[l?.category_id] ?? key;
          }
          licenses[catKey] = l;
        }
      }

      console.log("[driver/profile] mapped licenses:", Object.keys(licenses));

      const helmet = member?.helmet ?? null;

      // member_summary nests stats inside 'this_year'
      const rawSummary =
        summaryData?.this_year ??
        summaryData?.stats ??
        summaryData?.member_summary ??
        summaryData;

      console.log(
        "[driver/profile] rawSummary keys:",
        Object.keys(rawSummary ?? {}),
      );
      console.log(
        "[driver/profile] rawSummary sample:",
        JSON.stringify(rawSummary).slice(0, 300),
      );

      const summary =
        rawSummary && Object.keys(rawSummary).length > 2
          ? {
              total_starts:
                rawSummary.num_official_sessions ?? rawSummary.starts ?? 0,
              total_wins: rawSummary.num_official_wins ?? rawSummary.wins ?? 0,
              total_top5: rawSummary.num_official_top5 ?? rawSummary.top5 ?? 0,
              win_pct:
                rawSummary.num_official_sessions > 0
                  ? (
                      (rawSummary.num_official_wins /
                        rawSummary.num_official_sessions) *
                      100
                    ).toFixed(1)
                  : "0.0",
            }
          : null;

      return NextResponse.json({
        cust_id: member?.cust_id,
        display_name: member?.display_name,
        club_name: member?.club_name ?? member?.flair_name ?? "",
        member_since: member?.member_since,
        helmet,
        licenses,
        summary,
      });
    }

    // ── Recent races ─────────────────────────────────────────
    if (action === "races" && custId) {
      const data = await iracingFetch(
        `stats/member_recent_races?cust_id=${custId}`,
        token,
      );
      const races = data?.races ?? data ?? [];
      return NextResponse.json({
        races: races.slice(0, 15).map((r: any) => ({
          subsession_id: r.subsession_id,
          series_name: r.series_name,
          season_year: r.season_year,
          season_quarter: r.season_quarter,
          race_week_num: r.race_week_num,
          track_name: r.track?.track_name ?? r.track_name ?? "",
          car_name: r.car_name ?? "",
          start_position: r.start_position,
          finish_position: r.finish_position,
          incidents: r.incidents,
          irating_change: r.newi_rating - r.oldi_rating,
          sof: r.event_strength_of_field ?? 0,
          event_type: r.event_type_name ?? "Race",
          session_start_time: r.session_start_time,
        })),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    console.error("[driver API]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
