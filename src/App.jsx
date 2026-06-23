import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ── Hal Higdon Novice 2 — exact official km data ────────────────────────────
// Source: halhigdon.com/training-programs/marathon-training/novice-2-marathon/
// Week structure: Mon rest, Tue run, Wed pace/run, Thu run, Fri rest, Sat long, Sun cross
// Week 9: Sat rest, Sun half marathon race
// Week 18: Sat 3.2km shakeout, Sun marathon

const PLAN_START = new Date("2026-07-27"); // Monday
const RACE_DATE  = new Date("2026-11-29"); // Sunday (Florence Marathon)
const HALF_DATE  = new Date("2026-09-27"); // Robin Hood Half Marathon = W9 Sunday

// [wn, tue, wed, thu, sat_long, total, wed_is_pace, notes]
const HH = [
  [1,  4.8,  8.1,  4.8, 12.9,  30.6,  true,  ""],
  [2,  4.8,  8.1,  4.8, 14.5,  32.2,  false, ""],
  [3,  4.8,  8.1,  4.8,  9.7,  27.4,  true,  "Cutback week"],
  [4,  4.8,  9.7,  4.8, 17.7,  37.0,  true,  ""],
  [5,  4.8,  9.7,  4.8, 19.3,  38.6,  false, ""],
  [6,  4.8,  9.7,  4.8, 14.5,  33.8,  true,  "Cutback week"],
  [7,  6.4, 11.3,  6.4, 22.5,  46.6,  true,  ""],
  [8,  6.4, 11.3,  6.4, 24.1,  48.2,  false, ""],
  [9,  6.4, 11.3,  6.4,  0.0,  24.1,  true,  "Half Marathon Sunday"],
  [10, 6.4, 12.9,  6.4, 27.4,  53.1,  true,  ""],
  [11, 8.1, 12.9,  8.1, 29.0,  58.1,  false, ""],
  [12, 8.1, 12.9,  8.1, 21.0,  50.1,  true,  "Cutback week"],
  [13, 8.1,  8.1,  8.1, 30.6,  54.9,  true,  ""],
  [14, 8.1, 12.9,  8.1, 19.3,  48.4,  false, ""],
  [15, 8.1,  8.1,  8.1, 32.2,  56.5,  true,  "Peak week — 20 miles!"],
  [16, 8.1,  6.4,  8.1, 19.3,  41.9,  true,  "Taper begins"],
  [17, 6.4,  4.8,  6.4, 12.9,  30.5,  false, "Taper"],
  [18, 4.8,  3.2,  0.0,  3.2,  11.2,  false, "Race week — Florence!"],
];

const WEEKS = HH.map(([wn, tue, wed, thu, long, total, paceWed, notes]) => {
  const weekStart = new Date(PLAN_START);
  weekStart.setDate(weekStart.getDate() + (wn - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return {
    week: wn, label: `W${wn}`, weekStart, weekEnd,
    dateLabel: weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    planned: parseFloat(total.toFixed(1)),
    long: parseFloat(long.toFixed(1)),
    tue: parseFloat(tue.toFixed(1)),
    wed: parseFloat(wed.toFixed(1)),
    thu: parseFloat(thu.toFixed(1)),
    paceWed, notes,
    isHalfWeek: wn === 9,
    isRaceWeek: wn === 18,
    isPeak:     wn === 15,
    isCutback:  [3, 6, 12].includes(wn),
    isTaper:    wn >= 16 && wn <= 17,
    actual: null, runs: [],
  };
});

const STRAVA_TOKEN_KEY = "strava_access_token_florence";

function getWeekForDate(date) {
  const d = new Date(date);
  for (let i = 0; i < WEEKS.length; i++) {
    const we = new Date(WEEKS[i].weekEnd);
    we.setHours(23, 59, 59);
    if (d >= WEEKS[i].weekStart && d <= we) return i;
  }
  return -1;
}

function formatPace(mps) {
  if (!mps) return "—";
  const spk = 1000 / mps;
  return `${Math.floor(spk / 60)}:${Math.round(spk % 60).toString().padStart(2, "0")}/km`;
}
function formatDur(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const C = {
  bg:         "#0d0f18",
  surface:    "#151824",
  surfaceAlt: "#1c2030",
  border:     "#252a3d",
  accent:     "#e8642a",
  accentDim:  "#e8642a22",
  teal:       "#29c4e0",
  green:      "#3dd68c",
  yellow:     "#f5c842",
  purple:     "#9b7fe8",
  text:       "#eef0f8",
  muted:      "#7a83a0",
  dim:        "#3d4460",
};

function WeekTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: C.muted, marginBottom: 4 }}>{d.label} · {d.dateLabel}</div>
      <div style={{ color: C.teal }}>Planned: <b>{d.planned} km</b></div>
      {d.actual != null && (
        <div style={{ color: d.actual >= d.planned * 0.85 ? C.green : C.accent }}>
          Actual: <b>{d.actual.toFixed(1)} km</b>
          {" "}<span style={{ color: C.muted }}>({d.actual >= d.planned ? "✓ on track" : `${((d.actual / d.planned) * 100).toFixed(0)}% of plan`})</span>
        </div>
      )}
      {d.long > 0    && <div style={{ color: C.muted,   marginTop: 3 }}>Long run: {d.long} km</div>}
      {d.isPeak      && <div style={{ color: C.yellow,  marginTop: 4 }}>⚡ Peak week</div>}
      {d.isCutback   && <div style={{ color: C.teal,    marginTop: 4 }}>↘ Cutback week</div>}
      {d.isTaper     && <div style={{ color: C.teal,    marginTop: 4 }}>↘ Taper</div>}
      {d.isRaceWeek  && <div style={{ color: C.accent,  marginTop: 4 }}>🏁 Race week</div>}
      {d.isHalfWeek  && <div style={{ color: C.purple,  marginTop: 4 }}>🏃 Robin Hood Half</div>}
    </div>
  );
}

export default function App() {
  const [token,      setToken]      = useState(() => localStorage.getItem(STRAVA_TOKEN_KEY) || "");
  const [tokenInput, setTokenInput] = useState("");
  const [weeks,      setWeeks]      = useState(WEEKS.map(w => ({ ...w })));
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [lastSync,   setLastSync]   = useState(null);
  const [connected,  setConnected]  = useState(false);
  const [tab,        setTab]        = useState("overview");
  const [expandedWk, setExpandedWk] = useState(null);

  const fetchStrava = useCallback(async (tok) => {
    setLoading(true); setError("");
    try {
      const after  = Math.floor(PLAN_START.getTime() / 1000);
      const before = Math.floor(RACE_DATE.getTime()  / 1000) + 86400;
      let page = 1, allRuns = [];
      while (true) {
        const res = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}&after=${after}&before=${before}`,
          { headers: { Authorization: `Bearer ${tok}` } }
        );
        if (res.status === 401) throw new Error("Token expired or invalid — please reconnect.");
        if (!res.ok) throw new Error(`Strava API error ${res.status}`);
        const data = await res.json();
        if (!data.length) break;
        allRuns = [...allRuns, ...data.filter(a => a.type === "Run" || a.sport_type === "Run")];
        if (data.length < 100) break;
        page++;
      }
      const updated = WEEKS.map(w => ({ ...w, actual: 0, runs: [] }));
      for (const run of allRuns) {
        const wi = getWeekForDate(new Date(run.start_date_local));
        if (wi < 0) continue;
        updated[wi].actual = parseFloat(((updated[wi].actual || 0) + run.distance / 1000).toFixed(2));
        updated[wi].runs.push({
          id: run.id,
          name: run.name,
          date: new Date(run.start_date_local).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
          distKm: parseFloat((run.distance / 1000).toFixed(2)),
          pace:   formatPace(run.average_speed),
          dur:    formatDur(run.moving_time),
          hr:     run.average_heartrate ? Math.round(run.average_heartrate) : null,
          elev:   run.total_elevation_gain ? Math.round(run.total_elevation_gain) : null,
        });
      }
      setWeeks(updated);
      setConnected(true);
      setLastSync(new Date());
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConnect = () => {
    const tok = tokenInput.trim();
    if (!tok) return;
    localStorage.setItem(STRAVA_TOKEN_KEY, tok);
    setToken(tok);
    fetchStrava(tok);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(STRAVA_TOKEN_KEY);
    setToken(""); setTokenInput(""); setConnected(false);
    setWeeks(WEEKS.map(w => ({ ...w })));
  };

  useEffect(() => { if (token) fetchStrava(token); }, []);

  const today = new Date();
  const curWkIdx = getWeekForDate(today);
  const pastWeeks = weeks.filter(w => new Date(w.weekEnd) < today && w.actual != null);
  const totalActual = pastWeeks.reduce((s, w) => s + (w.actual || 0), 0);
  const totalPlannedSoFar = pastWeeks.reduce((s, w) => s + w.planned, 0);
  const daysToRace  = Math.max(0, Math.ceil((RACE_DATE - today) / 86400000));
  const weeksToRace = Math.ceil(daysToRace / 7);
  const daysToHalf  = Math.max(0, Math.ceil((HALF_DATE - today) / 86400000));
  const onTrack = pastWeeks.filter(w => w.actual >= w.planned * 0.85).length;
  const short   = pastWeeks.filter(w => w.actual > 0 && w.actual < w.planned * 0.85).length;
  const missed  = pastWeeks.filter(w => w.actual === 0).length;

  let cp = 0, ca = 0;
  const cumData = weeks.map(w => {
    cp += w.planned;
    const done = new Date(w.weekEnd) < today;
    if (done) ca += (w.actual || 0);
    return { label: w.label, cumPlan: parseFloat(cp.toFixed(1)), cumActual: done ? parseFloat(ca.toFixed(1)) : undefined };
  });

  const s = {
    app:   { background: C.bg, minHeight: "100dvh", color: C.text, fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 60 },
    hdr:   { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "env(safe-area-inset-top, 12px) 20px 14px", paddingTop: "max(env(safe-area-inset-top), 12px)" },
    h1:    { fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.4px", display: "flex", alignItems: "center", gap: 8 },
    sub:   { fontSize: 12, color: C.muted, marginTop: 3 },
    stats: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: "14px 14px 0" },
    card:  { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 12px" },
    val:   { fontSize: 22, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" },
    lbl:   { fontSize: 9, color: C.muted, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" },
    chart: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 14px 10px", margin: "12px 14px 0" },
    ctitle:{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 },
    tabs:  { display: "flex", padding: "0 14px", borderBottom: `1px solid ${C.border}`, marginTop: 12 },
    tab: a => ({ padding: "10px 14px", fontSize: 13, fontWeight: a ? 600 : 400, color: a ? C.accent : C.muted,
                 cursor: "pointer", background: "none", border: "none",
                 borderBottom: `2px solid ${a ? C.accent : "transparent"}`, marginBottom: -1 }),
    input: { background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
             fontSize: 12, padding: "10px 14px", width: "100%", fontFamily: "monospace", outline: "none" },
    btn:   { background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "11px 20px",
             fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 10, width: "100%" },
    btnSm: { background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6,
             padding: "4px 10px", fontSize: 11, cursor: "pointer" },
    pill: (col, bg) => ({ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, color: col, background: bg }),
    code:  { background: C.surfaceAlt, borderRadius: 6, padding: "8px 10px", marginTop: 6,
             fontFamily: "monospace", fontSize: 11, color: C.text, wordBreak: "break-all", lineHeight: 1.6, whiteSpace: "pre-wrap" },
    err:   { background: "#2d1515", border: "1px solid #6b2222", borderRadius: 8, padding: "10px 14px",
             margin: "10px 14px 0", fontSize: 12, color: "#ff8080" },
  };

  const TokenSetup = () => (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, margin: "14px 14px 0" }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Connect Strava</div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
        One-time setup to pull your runs automatically.
      </div>
      {[
        ["1 · Create a Strava API app",
         "Go to strava.com/settings/api\nCreate an app (any name).\nSet callback domain to: localhost\nCopy your Client ID and Client Secret."],
        ["2 · Get an auth code",
         "Open in browser — replace CLIENT_ID:\nhttps://www.strava.com/oauth/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http://localhost&scope=activity:read_all\n\nAuthorise it. Copy the code= value from the redirect URL."],
        ["3 · Exchange for a token",
         "Run this in a terminal (replace values):\ncurl -X POST https://www.strava.com/oauth/token \\\n  -d client_id=CLIENT_ID \\\n  -d client_secret=CLIENT_SECRET \\\n  -d code=YOUR_CODE \\\n  -d grant_type=authorization_code\n\nCopy the access_token from the response."],
      ].map(([title, body]) => (
        <div key={title} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 2 }}>{title}</div>
          <div style={s.code}>{body}</div>
        </div>
      ))}
      <input
        style={s.input}
        placeholder="Paste access_token here…"
        value={tokenInput}
        onChange={e => setTokenInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleConnect()}
      />
      <button style={s.btn} onClick={handleConnect} disabled={loading}>
        {loading ? "Connecting…" : "Connect Strava →"}
      </button>
      {error && <div style={{ ...s.err, margin: "10px 0 0" }}>{error}</div>}
    </div>
  );

  const Overview = () => (
    <>
      <div style={s.stats}>
        {[
          [daysToRace,  C.accent,  "To Florence"],
          [weeksToRace, C.teal,    "Weeks left"],
          [`${totalActual.toFixed(0)}k`, C.green,  "Logged"],
          [totalPlannedSoFar > 0 ? `${((totalActual / totalPlannedSoFar) * 100).toFixed(0)}%` : "—",
           totalActual >= totalPlannedSoFar * 0.85 ? C.green : C.yellow, "Compliance"],
        ].map(([v, col, lbl]) => (
          <div key={lbl} style={s.card}>
            <div style={{ ...s.val, color: col }}>{v}</div>
            <div style={s.lbl}>{lbl}</div>
          </div>
        ))}
      </div>

      {pastWeeks.length > 0 && (
        <div style={{ display: "flex", gap: 6, padding: "10px 14px 0", flexWrap: "wrap" }}>
          {onTrack > 0 && <span style={s.pill("#fff", C.green  + "88")}>{onTrack} on track</span>}
          {short   > 0 && <span style={s.pill("#fff", C.yellow + "88")}>{short} short</span>}
          {missed  > 0 && <span style={s.pill("#fff", C.accent + "88")}>{missed} missed</span>}
        </div>
      )}

      <div style={s.chart}>
        <div style={s.ctitle}>Weekly km — planned vs actual</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={weeks.map(w => ({ ...w, actual: w.actual ?? undefined }))} barGap={2} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 8, fill: C.dim }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8, fill: C.dim }} axisLine={false} tickLine={false} unit="k" />
            <Tooltip content={<WeekTooltip />} />
            <Bar dataKey="planned" name="Planned" fill={C.teal}   opacity={0.3} radius={[2,2,0,0]} />
            <Bar dataKey="actual"  name="Actual"  fill={C.accent}               radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10, color: C.muted }}>
          <span><span style={{ display:"inline-block", width:8, height:8, background:C.teal, opacity:0.5, borderRadius:1, marginRight:4 }}/>Planned</span>
          <span><span style={{ display:"inline-block", width:8, height:8, background:C.accent, borderRadius:1, marginRight:4 }}/>Actual</span>
        </div>
      </div>

      <div style={s.chart}>
        <div style={s.ctitle}>Cumulative km — keeping pace?</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={cumData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 8, fill: C.dim }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8, fill: C.dim }} axisLine={false} tickLine={false} unit="k" />
            <Tooltip contentStyle={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, fontSize:11 }} labelStyle={{ color:C.muted }} />
            <Line type="monotone" dataKey="cumPlan"   name="Plan"   stroke={C.teal}   strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
            <Line type="monotone" dataKey="cumActual" name="Actual" stroke={C.accent} strokeWidth={2.5} dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display:"flex", gap:12, marginTop:6, fontSize:10, color:C.muted }}>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}>
            <svg width="16" height="2"><line x1="0" y1="1" x2="16" y2="1" stroke={C.teal} strokeWidth="1.5" strokeDasharray="5 3"/></svg> Plan
          </span>
          <span><span style={{ display:"inline-block", width:16, height:2, background:C.accent, marginRight:4, verticalAlign:"middle" }}/>Actual</span>
        </div>
      </div>
    </>
  );

  const AllWeeks = () => (
    <div style={{ margin: "12px 14px 0", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {weeks.map((w, i) => {
        const isPast    = new Date(w.weekEnd) < today;
        const isCurrent = i === curWkIdx;
        const pct       = w.actual != null ? (w.actual / w.planned) * 100 : 0;
        const col = w.actual == null ? C.dim
                  : w.actual >= w.planned * 0.85 ? C.green
                  : w.actual > 0 ? C.yellow : C.accent;
        const statusTxt = w.actual == null
          ? (isCurrent ? "now" : isPast ? "—" : "")
          : w.actual >= w.planned * 0.85 ? "✓"
          : w.actual > 0 ? `${pct.toFixed(0)}%` : "missed";
        const isOpen = expandedWk === w.week;

        return (
          <div key={w.week} style={{
            borderBottom: i < weeks.length - 1 ? `1px solid ${C.border}` : "none",
            borderLeft: `3px solid ${isCurrent ? C.accent : w.isPeak ? C.yellow : w.isHalfWeek ? C.purple : "transparent"}`,
            background: isCurrent ? C.accentDim : w.isPeak ? `${C.yellow}08` : w.isHalfWeek ? `${C.purple}08` : "transparent",
          }}>
            <div style={{ padding: "10px 12px", cursor: "pointer" }} onClick={() => setExpandedWk(isOpen ? null : w.week)}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, color: isCurrent ? C.accent : C.dim, minWidth:26 }}>W{w.week}</span>
                  <span style={{ fontSize:11, color:C.muted }}>{w.dateLabel}</span>
                  {w.isPeak     && <span style={{ fontSize:9, color:C.yellow, fontWeight:700 }}>⚡</span>}
                  {w.isCutback  && <span style={{ fontSize:9, color:C.teal,   fontWeight:700 }}>↘</span>}
                  {w.isTaper    && <span style={{ fontSize:9, color:C.teal,   fontWeight:700 }}>↘</span>}
                  {w.isRaceWeek && <span style={{ fontSize:9, color:C.accent, fontWeight:700 }}>🏁</span>}
                  {w.isHalfWeek && <span style={{ fontSize:9, color:C.purple, fontWeight:700 }}>🏃</span>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:11, color:col, fontWeight:600 }}>{statusTxt}</span>
                  <span style={{ fontSize:9, color:C.dim }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ flex:1, height:5, background:C.surfaceAlt, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:3, background:col, width:`${Math.min(100,pct)}%`, transition:"width 0.3s" }} />
                </div>
                <span style={{ fontSize:10, color:C.muted, minWidth:84, textAlign:"right" }}>
                  {w.actual != null ? w.actual.toFixed(1) : "—"} / {w.planned} km
                </span>
              </div>
            </div>

            {isOpen && (
              <div style={{ padding:"0 12px 12px", borderTop:`1px solid ${C.border}` }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:5, marginTop:10 }}>
                  {[
                    ["Mon","Rest",null],
                    ["Tue",`${w.tue}k`,"run"],
                    ["Wed",`${w.wed}k`, w.paceWed ? "pace" : "run"],
                    ["Thu",`${w.thu}k`,"run"],
                    ["Fri","Rest",null],
                  ].map(([day,val,type]) => (
                    <div key={day} style={{ background:C.surfaceAlt, borderRadius:6, padding:"6px 4px", textAlign:"center" }}>
                      <div style={{ fontSize:8, color:C.dim, textTransform:"uppercase", letterSpacing:"0.05em" }}>{day}</div>
                      <div style={{ fontSize:10, color: type==="pace" ? C.yellow : type ? C.text : C.dim, fontWeight: type ? 600 : 400, marginTop:2 }}>{val}</div>
                      {type && <div style={{ fontSize:7, color: type==="pace" ? C.yellow : C.muted, marginTop:1 }}>{type}</div>}
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5, marginTop:5 }}>
                  <div style={{ background:C.surfaceAlt, borderRadius:6, padding:"6px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:8, color:C.dim, textTransform:"uppercase", letterSpacing:"0.05em" }}>Sat</div>
                    <div style={{ fontSize:10, color: w.long>0 ? C.accent : C.dim, fontWeight: w.long>0 ? 600 : 400, marginTop:2 }}>
                      {w.isRaceWeek ? "3.2 km" : w.isHalfWeek ? "Rest" : `${w.long} km`}
                    </div>
                    {w.long>0 && !w.isRaceWeek && <div style={{ fontSize:7, color:C.accent, marginTop:1 }}>long run</div>}
                  </div>
                  <div style={{ background:C.surfaceAlt, borderRadius:6, padding:"6px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:8, color:C.dim, textTransform:"uppercase", letterSpacing:"0.05em" }}>Sun</div>
                    <div style={{ fontSize:10, color: w.isRaceWeek ? C.accent : w.isHalfWeek ? C.purple : C.muted, fontWeight:600, marginTop:2 }}>
                      {w.isRaceWeek ? "🏁 FLORENCE" : w.isHalfWeek ? "🏃 HALF" : "Cross"}
                    </div>
                  </div>
                </div>

                {w.runs?.length > 0 && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontSize:9, color:C.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Your runs</div>
                    {w.runs.map(r => (
                      <div key={r.id} style={{ background:C.surfaceAlt, borderRadius:6, padding:"7px 10px", marginBottom:5,
                                               display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontSize:12, fontWeight:600 }}>{r.distKm} km</div>
                          <div style={{ fontSize:10, color:C.muted }}>{r.date} · {r.dur}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:11, color:C.teal }}>{r.pace}</div>
                          {r.hr   && <div style={{ fontSize:10, color:C.muted }}>{r.hr} bpm</div>}
                          {r.elev && <div style={{ fontSize:10, color:C.muted }}>+{r.elev}m</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {w.runs?.length === 0 && isPast && (
                  <div style={{ marginTop:10, fontSize:11, color:C.dim, fontStyle:"italic" }}>
                    {connected ? "No runs in Strava for this week." : "Connect Strava to see runs."}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={s.app}>
      <div style={s.hdr}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <h1 style={s.h1}><span style={{ color:C.accent }}>◈</span> Florence Marathon</h1>
            <div style={s.sub}>Hal Higdon Novice 2 · 27 Jul – 29 Nov 2026</div>
          </div>
          {connected && (
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:C.green, fontWeight:600 }}>● Strava</div>
              {lastSync && (
                <div style={{ fontSize:10, color:C.dim, marginTop:2, display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                  {lastSync.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" })}
                  <button style={s.btnSm} onClick={() => fetchStrava(token)}>↻</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ background:`${C.purple}18`, borderBottom:`1px solid ${C.purple}33`,
                    padding:"7px 18px", fontSize:11, color:C.purple, display:"flex", alignItems:"center", gap:6 }}>
        🏃 <strong>Robin Hood Half</strong> — 27 Sep 2026
        <span style={{ marginLeft:6, color:C.dim }}>{daysToHalf} days</span>
      </div>

      {loading && (
        <div style={{ padding:"40px 20px", textAlign:"center", color:C.muted }}>
          <div style={{ fontSize:28, marginBottom:8 }}>⟳</div>
          Fetching from Strava…
        </div>
      )}

      {!connected && !loading && <TokenSetup />}

      {error && connected && !loading && (
        <div style={s.err}>{error} <button style={{ ...s.btnSm, marginLeft:8 }} onClick={handleDisconnect}>Disconnect</button></div>
      )}

      {!loading && (
        <>
          <div style={s.tabs}>
            {["overview","weeks"].map(t => (
              <button key={t} style={s.tab(tab===t)} onClick={() => setTab(t)}>
                {t === "overview" ? "Overview" : "All Weeks"}
              </button>
            ))}
            {connected && (
              <button style={{ ...s.btnSm, marginLeft:"auto", alignSelf:"center" }} onClick={handleDisconnect}>Disconnect</button>
            )}
          </div>
          {tab === "overview" && <Overview />}
          {tab === "weeks"    && <AllWeeks />}
        </>
      )}
    </div>
  );
}
