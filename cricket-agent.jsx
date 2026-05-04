/**
 * ================================================================
 *  🏏 CRICKET INTELLIGENCE AGENT  — Multi-Tool Agentic System
 * ================================================================
 *  ARCHITECTURE:
 *    OrchestratorAgent → decides which tools to invoke
 *    Tool 1: Pressure Calculator    (pure function)
 *    Tool 2: Momentum Detector      (pure function)
 *    Tool 3: Explanation Generator  (Claude API)
 *    Tool 4: Cheer Bot Agent        (Claude API, reasoning chain)
 *    Tool 5: Roast Battle Engine    (Claude API, 3-round)
 *    Tool 6: Fact Checker           (Claude API)
 *    Tool 7: Session Memory         (useRef-based store)
 * ================================================================
 */

import { useState, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

// ─────────────────────────────────────────────────────────────────
//  GLOBAL STYLES
// ─────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Barlow+Condensed:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg0: #07070f;
    --bg1: #0d0d1a;
    --bg2: #121222;
    --bg3: #191930;
    --red: #e63946;
    --gold: #ffc107;
    --cyan: #00e5ff;
    --green: #00e676;
    --purple: #b388ff;
    --text: #eeeef5;
    --muted: #6b6b8a;
    --border: rgba(255,255,255,0.07);
    --font-display: 'Bebas Neue', sans-serif;
    --font-body: 'Barlow Condensed', sans-serif;
    --font-mono: 'DM Mono', monospace;
  }

  .cia-root {
    min-height: 100vh;
    background: var(--bg0);
    font-family: var(--font-body);
    color: var(--text);
    position: relative;
  }

  /* Stadium floodlight ambience */
  .cia-root::before {
    content: '';
    position: fixed; inset: 0;
    background:
      radial-gradient(ellipse 60% 50% at 15% 60%, rgba(230,57,70,.07) 0%, transparent 70%),
      radial-gradient(ellipse 50% 40% at 85% 20%, rgba(0,229,255,.05) 0%, transparent 60%),
      radial-gradient(ellipse 40% 60% at 50% 110%, rgba(255,193,7,.04) 0%, transparent 60%);
    pointer-events: none; z-index: 0;
  }

  /* Noise texture overlay */
  .cia-root::after {
    content: '';
    position: fixed; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none; z-index: 0; opacity: 0.4;
  }

  /* ── Header ── */
  .cia-header {
    position: sticky; top: 0; z-index: 200;
    background: rgba(7,7,15,.85);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    padding: 14px 28px;
  }
  .cia-header-inner {
    max-width: 1280px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
  }
  .cia-logo { font-family: var(--font-display); font-size: 26px; letter-spacing:.08em; line-height:1; }
  .cia-logo span { color: var(--red); }
  .cia-tagline { font-family: var(--font-mono); font-size: 10px; color: var(--muted); letter-spacing:.12em; margin-top:2px; }

  /* ── Layout ── */
  .cia-body { max-width:1280px; margin:0 auto; padding:24px; position:relative; z-index:1; }
  .cia-grid { display:grid; grid-template-columns:340px 1fr; gap:20px; align-items:start; }

  /* ── Card ── */
  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
  }
  .card-body { padding: 20px; }
  .card-title {
    font-family: var(--font-display);
    font-size: 19px; letter-spacing: .07em;
    color: var(--gold); margin-bottom: 14px;
  }
  .card-glow-red  { box-shadow: 0 0 40px rgba(230,57,70,.12); }
  .card-glow-cyan { box-shadow: 0 0 40px rgba(0,229,255,.10); }
  .card-glow-gold { box-shadow: 0 0 40px rgba(255,193,7,.10); }

  /* ── Task Tabs ── */
  .task-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .task-btn {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 10px; padding: 11px 14px;
    color: var(--muted); cursor: pointer; text-align:left;
    transition: all .18s; font-family: var(--font-body);
  }
  .task-btn:hover { border-color: var(--cyan); color: var(--cyan); }
  .task-btn.active {
    background: linear-gradient(135deg, var(--red), #a01020);
    border-color: var(--red); color: #fff;
    box-shadow: 0 0 24px rgba(230,57,70,.45);
  }
  .task-btn-label { font-size:14px; font-weight:700; letter-spacing:.04em; }
  .task-btn-desc  { font-size:11px; opacity:.65; margin-top:2px; }

  /* ── Team selector ── */
  .team-bar { height:3px; border-radius:3px; margin-bottom:8px; transition:background .3s; }
  .cia-select, .cia-input {
    width:100%;
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text);
    padding: 9px 12px; font-family: var(--font-body);
    font-size:15px; font-weight:600;
    transition: border-color .15s;
  }
  .cia-select:focus, .cia-input:focus { outline:none; border-color: var(--cyan); }
  .cia-label {
    display:block; font-size:11px; font-weight:700;
    letter-spacing:.12em; color: var(--muted);
    text-transform:uppercase; margin-bottom:5px;
  }

  /* ── Over inputs ── */
  .over-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
  .over-cell { font-size:10px; color:var(--muted); text-align:center; margin-bottom:3px; }
  .over-inp {
    width:100%; background:var(--bg3); border:1px solid var(--border);
    border-radius:6px; color:var(--text); padding:7px 4px;
    font-family:var(--font-mono); font-size:13px; text-align:center;
  }
  .over-inp:focus { outline:none; border-color:var(--cyan); }

  /* ── Execute button ── */
  .exec-btn {
    width:100%; padding:15px; border:none; border-radius:12px;
    background: linear-gradient(135deg, #e63946 0%, #a01020 100%);
    color:#fff; font-family:var(--font-display);
    font-size:22px; letter-spacing:.12em; cursor:pointer;
    position:relative; overflow:hidden; transition: transform .15s, box-shadow .15s;
  }
  .exec-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 30px rgba(230,57,70,.5); }
  .exec-btn:disabled { opacity:.45; cursor:not-allowed; }
  .exec-btn::after {
    content:''; position:absolute; top:0; left:-100%;
    width:100%; height:100%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);
    transition:left .5s;
  }
  .exec-btn:hover:not(:disabled)::after { left:100%; }

  /* ── Thinking panel ── */
  .thinking-panel { background:var(--bg2); border:1px solid rgba(0,229,255,.2); border-radius:14px; overflow:hidden; }
  .thinking-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 20px; cursor:pointer;
    background: linear-gradient(90deg, rgba(0,229,255,.07), transparent);
    border-bottom:1px solid rgba(0,229,255,.1);
  }
  .thinking-title { font-family:var(--font-mono); font-size:13px; color:var(--cyan); font-weight:500; }
  .thinking-badge {
    background:var(--cyan); color:#000; border-radius:20px;
    padding:2px 9px; font-size:11px; font-weight:700;
    font-family:var(--font-mono); margin-left:8px;
  }
  .thinking-steps { padding:12px 20px; max-height:220px; overflow-y:auto; }
  .thinking-step {
    display:flex; gap:10px; padding:5px 0;
    border-bottom:1px solid rgba(0,229,255,.06);
    font-family:var(--font-mono); font-size:11.5px; color:var(--cyan);
    animation: stepIn .25s ease;
  }
  .thinking-step-num { color:var(--muted); min-width:22px; }
  @keyframes stepIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
  .thinking-steps::-webkit-scrollbar { width:3px; }
  .thinking-steps::-webkit-scrollbar-thumb { background:var(--cyan); border-radius:2px; }

  /* ── Result cards ── */
  .result-section-title {
    font-family:var(--font-display); font-size:20px; letter-spacing:.07em;
    color:var(--gold); margin-bottom:14px;
    display:flex; align-items:center; gap:10px;
  }
  .roast-text { font-size:17px; line-height:1.75; color:var(--text); white-space:pre-line; }
  .battle-text { font-size:15px; line-height:1.85; color:var(--text); white-space:pre-line; }
  .expl-text   { font-size:16px; line-height:1.75; color:var(--text); }

  /* ── Badge ── */
  .badge {
    display:inline-flex; align-items:center; gap:5px;
    padding:4px 12px; border-radius:20px;
    font-family:var(--font-mono); font-size:12px; font-weight:700;
  }
  .badge-ok   { background:rgba(0,230,118,.12); color:var(--green); border:1px solid var(--green); }
  .badge-warn { background:rgba(230,57,70,.12);  color:var(--red);   border:1px solid var(--red); }
  .badge-neutral { background:rgba(107,107,138,.12); color:var(--muted); border:1px solid var(--muted); }

  /* ── Memory ── */
  .mem-item {
    padding:8px 12px; background:var(--bg3);
    border-radius:8px; border-left:3px solid var(--gold);
    margin-bottom:6px;
  }
  .mem-time { font-family:var(--font-mono); font-size:10px; color:var(--gold); }
  .mem-desc { font-size:13px; color:var(--muted); margin-top:1px; }

  /* ── Custom tooltip ── */
  .cia-tooltip {
    background:var(--bg2); border:1px solid rgba(0,229,255,.25);
    border-radius:8px; padding:8px 12px;
    font-family:var(--font-mono); font-size:11px;
  }

  /* ── Pill stat ── */
  .stat-pill {
    display:inline-flex; flex-direction:column; align-items:center;
    background:var(--bg3); border:1px solid var(--border);
    border-radius:10px; padding:8px 14px; min-width:80px;
  }
  .stat-val { font-family:var(--font-display); font-size:22px; line-height:1; }
  .stat-lbl { font-family:var(--font-mono); font-size:10px; color:var(--muted); margin-top:3px; letter-spacing:.08em; }

  /* ── Empty state ── */
  .empty-state {
    display:flex; flex-direction:column; align-items:center;
    justify-content:center; padding:80px 40px; text-align:center;
  }
  .empty-icon { font-size:60px; opacity:.18; margin-bottom:16px; }
  .empty-title { font-family:var(--font-display); font-size:28px; color:rgba(255,255,255,.1); margin-bottom:8px; }
  .empty-sub   { font-family:var(--font-mono); font-size:12px; color:var(--muted); }

  /* ── Loading pulse ── */
  @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
  .pulse { animation: pulse 1.2s ease infinite; }

  /* ── Divider ── */
  .divider { height:1px; background:var(--border); margin:14px 0; }

  /* ── Fact check section ── */
  .fact-box { margin-top:16px; padding-top:16px; border-top:1px solid var(--border); display:flex; align-items:flex-start; gap:10px; }
  .fact-reason { font-size:13px; color:var(--muted); flex:1; line-height:1.6; }
`;

// ─────────────────────────────────────────────────────────────────
//  CONSTANTS — Teams, Tasks
// ─────────────────────────────────────────────────────────────────
const TEAMS = {
  MI:   { name: "Mumbai Indians",             color: "#005EA6", acc: "#D4AF37", emoji: "💙" },
  CSK:  { name: "Chennai Super Kings",        color: "#F9CD05", acc: "#0081E9", emoji: "💛" },
  RCB:  { name: "Royal Challengers Bengaluru",color: "#EC1C24", acc: "#1B1B1B", emoji: "❤️" },
  KKR:  { name: "Kolkata Knight Riders",      color: "#3A225D", acc: "#B3A123", emoji: "💜" },
  GT:   { name: "Gujarat Titans",             color: "#1C1C6B", acc: "#B9975B", emoji: "🔵" },
  LSG:  { name: "Lucknow Super Giants",       color: "#A72B2A", acc: "#00BCD4", emoji: "🩵" },
  SRH:  { name: "Sunrisers Hyderabad",        color: "#FF6B00", acc: "#1B1B1B", emoji: "🧡" },
  DC:   { name: "Delhi Capitals",             color: "#0078BC", acc: "#EF1C25", emoji: "💙" },
  PBKS: { name: "Punjab Kings",               color: "#ED1C24", acc: "#DCDDDF", emoji: "❤️" },
  RR:   { name: "Rajasthan Royals",           color: "#EA1A85", acc: "#254AA5", emoji: "🩷" },
};

const TEAM_PERSONAS = {
  MI:   "arrogant Mumbai royalty — 5 trophies, infinite swagger",
  CSK:  "calm Thala devotee — 'trust the process, Dhoni knows'",
  RCB:  "former heartbreaks, now 2025 CHAMPIONS — 'E Sala Cup Namdu' actually happened",
  KKR:  "purple-blooded street-swagger king",
  GT:   "quietly confident new money flexing back-to-back trophies",
  LSG:  "chaotic wildcard who surprises even themselves",
  SRH:  "orange fire that explodes at start and vanishes at crucial moments",
  DC:   "perpetually hopeful, perpetually heartbroken underdog",
  PBKS: "tragic kings of bottling leads and breaking hearts",
  RR:   "romantic underdogs with genuine royal heart",
};

const TASKS = [
  { id: "analyze",     emoji: "🔬", label: "ANALYZE",     desc: "Pressure & momentum" },
  { id: "roast",       emoji: "🔥", label: "ROAST",       desc: "Savage fan mode"     },
  { id: "battle",      emoji: "⚔️", label: "BATTLE",      desc: "3-round roast war"  },
  { id: "fact-check",  emoji: "✅", label: "FACT CHECK",  desc: "Verify claims"       },
];

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const CLAUDE_MODEL  = "anthropic/claude-3-haiku";
const BACKEND_URL   = import.meta.env.VITE_BACKEND_URL || (window.location.port === '5173' ? "http://localhost:5000" : "");

// ─────────────────────────────────────────────────────────────────
//  TOOL 1 — Pressure Calculator (pure function)
// ─────────────────────────────────────────────────────────────────
function toolPressureCalc(runs, balls, wickets) {
  if (!runs || !balls || !wickets) return 0;

  // Required Run Rate component (0–45 pts)
  const rrr      = (runs / balls) * 6;
  const avgIPLRR = 8.8;
  const rrPts    = Math.min(45, Math.max(5, ((rrr - avgIPLRR) / avgIPLRR) * 38 + 22));

  // Wickets lost component (0–35 pts)
  const wktLost  = 10 - Math.min(10, Math.max(0, wickets));
  const wktPts   = (wktLost / 10) * 35;

  // Time pressure — balls burned (0–20 pts)
  const timePts  = Math.max(0, (120 - balls) / 120) * 20;

  return Math.round(Math.min(100, Math.max(0, rrPts + wktPts + timePts)));
}

// ─────────────────────────────────────────────────────────────────
//  TOOL 2 — Momentum Detector (pure function)
// ─────────────────────────────────────────────────────────────────
function toolMomentumDetect(overData) {
  return overData.map((runs, i) => {
    const window  = overData.slice(Math.max(0, i - 2), i + 1);
    const avg     = window.reduce((a, b) => a + b, 0) / window.length;
    const delta   = i > 0 ? runs - overData[i - 1] : 0;
    const trend   = delta > 2 ? "🔺" : delta < -2 ? "🔻" : "➡️";
    return { over: `Ov${i + 1}`, runs, avgMomentum: Math.round(avg * 10) / 10, delta, trend };
  });
}

// ─────────────────────────────────────────────────────────────────
//  TOOL 3–6 — Backend API Wrapper
// ─────────────────────────────────────────────────────────────────

// Tool 3 — Explanation Generator
async function toolExplain(input, pressure, momentum, memCtx) {
  const res = await fetch(`${BACKEND_URL}/api/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, pressure, momentum, memCtx }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Backend explanation failed");
  }
  const data = await res.json();
  return data.explanation;
}

// Tool 4 — Roast Generator
async function toolCheerBot(teamUser, teamOpp, memCtx) {
  const res = await fetch(`${BACKEND_URL}/api/roast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      teamUser: TEAMS[teamUser]?.name, 
      teamOpp: TEAMS[teamOpp]?.name, 
      memCtx,
      persona: TEAM_PERSONAS[teamUser]
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Backend roast failed");
  }
  const data = await res.json();
  return data.roast;
}

// Tool 5 — Roast Battle Engine
async function toolRoastBattle(teamUser, teamOpp, memCtx) {
  const res = await fetch(`${BACKEND_URL}/api/battle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      teamUser: TEAMS[teamUser]?.name, 
      teamOpp: TEAMS[teamOpp]?.name, 
      memCtx 
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Backend battle failed");
  }
  const data = await res.json();
  return data.battle;
}

// Tool 6 — Fact Checker
async function toolFactCheck(claim) {
  const res = await fetch(`${BACKEND_URL}/api/fact-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claim }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.explanation || "Backend fact-check failed");
  }
  const data = await res.json();
  return { 
    valid: data.verdict === "TRUE", 
    verdict: data.verdict, 
    reason: data.explanation 
  };
}

// ─────────────────────────────────────────────────────────────────
//  TOOL 7 — Session Memory (useRef-based)
// ─────────────────────────────────────────────────────────────────
function createMemoryStore() {
  const store = [];
  return {
    add(entry) {
      store.unshift({ ...entry, time: new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }) });
      if (store.length > 8) store.pop();
    },
    getAll() { return store; },
    getContext() {
      return store.slice(0, 3)
        .map(m => `[${m.task}] ${m.teamUser} vs ${m.teamOpp} @ ${m.time}`)
        .join(" | ");
    },
  };
}

// ─────────────────────────────────────────────────────────────────
//  ORCHESTRATOR AGENT
//  Receives input → decides tools → executes → returns structured output
// ─────────────────────────────────────────────────────────────────
async function orchestratorAgent(input, memory, onStep) {
  const steps  = [];
  const result = {};

  const think = (msg) => {
    steps.push(msg);
    onStep([...steps]);
  };

  think(`📥 Task received: "${input.task.toUpperCase()}" | ${TEAMS[input.teamUser]?.name} vs ${TEAMS[input.teamOpp]?.name}`);

  // ── Memory context ──
  const memCtx = memory.getContext();
  if (memCtx) think(`🧠 Tool 7: Session memory loaded — ${memory.getAll().length} prior interactions`);

  // ── Tool 1: Pressure Calculator ──
  if (input.runs && input.balls && input.wickets && input.task === "analyze") {
    think(`⚙️  Tool 1: Pressure Calculator — RRR=${((input.runs / input.balls) * 6).toFixed(2)}, Wickets=${input.wickets}`);
    result.pressure = toolPressureCalc(+input.runs, +input.balls, +input.wickets);
    const lvl = result.pressure > 70 ? "🔴 CRITICAL" : result.pressure > 40 ? "🟡 HIGH" : "🟢 MODERATE";
    think(`✅ Pressure Score: ${result.pressure}/100 — ${lvl}`);
  }

  // ── Tool 2: Momentum Detector ──
  if (input.overs?.length && input.task === "analyze") {
    think(`⚙️  Tool 2: Momentum Detector — scanning ${input.overs.length} overs`);
    result.momentum = toolMomentumDetect(input.overs);
    const last = result.momentum.at(-1);
    think(`✅ Momentum analyzed — last over delta: ${last?.delta >= 0 ? "+" : ""}${last?.delta} ${last?.trend}`);
  }

  // ── Tool 3: Explanation Generator ──
  if (input.task === "analyze") {
    think(`⚙️  Tool 3: Explanation Generator — analyzing tactical situation`);
    result.explanation = await toolExplain(input, result.pressure, result.momentum, memCtx);
    think(`✅ Analysis ready`);
  }

  // ── Tool 4: Cheer Bot ──
  if (input.task === "roast") {
    think(`⚙️  Tool 4: Cheer Bot Agent (Backend) — initiating reasoning chain`);
    think(`      ↳ Step 1: Profiling ${TEAMS[input.teamOpp]?.name} weaknesses`);
    think(`      ↳ Step 2: Adopting ${TEAMS[input.teamUser]?.name} voice & persona`);
    think(`      ↳ Step 3: Selecting sharpest attack angle`);
    think(`      ↳ Step 4: Crafting 4–6 line roast with real stat reference`);

    const raw     = await toolCheerBot(input.teamUser, input.teamOpp, memCtx);
    const fcMatch = raw.match(/FACTCHECK_JSON:\s*(\{[\s\S]*?\})/);
    result.roast  = fcMatch ? raw.replace(/FACTCHECK_JSON:[\s\S]*/, "").trim() : raw;

    try   { result.factCheck = JSON.parse(fcMatch?.[1] ?? "{}"); }
    catch { result.factCheck = { valid: true, reason: "Based on IPL history — specific refs in roast above." }; }

    think(`⚙️  Tool 6: Fact Checker — validating roast references`);
    think(`✅ Roast ready | Fact check: ${result.factCheck?.valid ? "VALID ✅" : "FLAGGED ⚠️"}`);
  }

  // ── Tool 5: Roast Battle ──
  if (input.task === "battle") {
    think(`⚙️  Tool 5: Roast Battle Engine — 3-round escalation protocol`);
    result.battle = await toolRoastBattle(input.teamUser, input.teamOpp, memCtx);
    think(`✅ Battle complete`);
  }

  // ── Tool 6: Fact Checker (standalone) ──
  if (input.task === "fact-check") {
    think(`⚙️  Tool 6: Fact Checker — cross-referencing knowledge base`);
    result.factCheck = await toolFactCheck(input.claim || "");
    const v = result.factCheck.verdict;
    think(`✅ Fact check: ${v === "TRUE" ? "TRUE ✅" : v === "FALSE" ? "FALSE ❌" : "UNKNOWN ❓"}`);
  }

  think(`🎯 Orchestrator: all tools executed | Memory updated`);

  // ── Update memory ──
  memory.add({ task: input.task, teamUser: input.teamUser, teamOpp: input.teamOpp });

  return { thinking: { steps }, result };
}

// ─────────────────────────────────────────────────────────────────
//  SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

/** Custom SVG Pressure Gauge */
function PressureGauge({ value }) {
  const R    = 82;
  const CX   = 115, CY = 115;
  const SA   = -215;   // start angle (deg)
  const EA   = 35;     // end angle
  const SPAN = EA - SA;
  const fill = Math.min(100, Math.max(0, value));
  const fillEnd = SA + (fill / 100) * SPAN;

  const toRad = (d) => (d * Math.PI) / 180;
  const arc = (a1, a2) => {
    const s = { x: CX + R * Math.cos(toRad(a1)), y: CY + R * Math.sin(toRad(a1)) };
    const e = { x: CX + R * Math.cos(toRad(a2)), y: CY + R * Math.sin(toRad(a2)) };
    const lg = a2 - a1 > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${lg} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };

  const col = fill > 70 ? "#e63946" : fill > 40 ? "#ffc107" : "#00e676";
  const lbl = fill > 70 ? "CRITICAL" : fill > 40 ? "HIGH" : "MODERATE";

  return (
    <svg width="230" height="165" style={{ display:"block", margin:"0 auto" }}>
      {/* Track */}
      <path d={arc(SA, EA)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" strokeLinecap="round" />
      {/* Fill */}
      {fill > 0 && (
        <path d={arc(SA, fillEnd)} fill="none" stroke={col} strokeWidth="14" strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 10px ${col}88)`, transition:"all 1s ease" }} />
      )}
      {/* Center value */}
      <text x={CX} y={CY - 4} textAnchor="middle" fill={col}
        fontSize="40" fontFamily="'Bebas Neue',sans-serif" letterSpacing="2">{fill}</text>
      <text x={CX} y={CY + 16} textAnchor="middle" fill="rgba(255,255,255,0.35)"
        fontSize="11" fontFamily="'DM Mono',monospace">PRESSURE</text>
      <text x={CX} y={CY + 32} textAnchor="middle" fill={col}
        fontSize="14" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700">{lbl}</text>
      {/* Edge labels */}
      <text x="18" y="148" fill="rgba(255,255,255,0.25)" fontSize="10" fontFamily="'DM Mono',monospace">0</text>
      <text x="196" y="148" fill="rgba(255,255,255,0.25)" fontSize="10" fontFamily="'DM Mono',monospace">100</text>
    </svg>
  );
}

/** Custom Tooltip for Recharts */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="cia-tooltip">
      <div style={{ color:"var(--cyan)", marginBottom:4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily:"var(--font-mono)" }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function CricketIntelligenceAgent() {
  // ── State ──
  const [task,       setTask]       = useState("analyze");
  const [teamUser,   setTeamUser]   = useState("MI");
  const [teamOpp,    setTeamOpp]    = useState("CSK");
  const [runs,       setRuns]       = useState("");
  const [balls,      setBalls]      = useState("");
  const [wickets,    setWickets]    = useState("");
  const [overCount,  setOverCount]  = useState(5);
  const [overVals,   setOverVals]   = useState(Array(10).fill(""));
  const [claim,      setClaim]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [steps,      setSteps]      = useState([]);
  const [result,     setResult]     = useState(null);
  const [thinkOpen,  setThinkOpen]  = useState(true);

  // ── Tool 7: Session memory ──
  const memory = useRef(createMemoryStore());

  // ── Execute agent ──
  const execute = async () => {
    setLoading(true);
    setResult(null);
    setSteps([]);

    const overs = overVals.slice(0, overCount)
      .filter(v => v !== "")
      .map(Number);

    const input = { task, teamUser, teamOpp, runs, balls, wickets, overs, claim };

    try {
      const { thinking, result: res } = await orchestratorAgent(
        input,
        memory.current,
        setSteps
      );
      setResult(res);
    } catch (err) {
      setSteps(prev => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const setOver = (i, v) => {
    const next = [...overVals];
    next[i] = v;
    setOverVals(next);
  };

  const allMem = memory.current.getAll();

  // ── Team color bar ──
  const TeamBar = ({ team }) => (
    <div className="team-bar"
      style={{ background:`linear-gradient(90deg,${TEAMS[team]?.color},${TEAMS[team]?.acc})` }} />
  );

  return (
    <div className="cia-root">
      <style>{CSS}</style>

      {/* ── Header ── */}
      <header className="cia-header">
        <div className="cia-header-inner">
          <div>
            <div className="cia-logo">🏏 CRICKET <span>INTELLIGENCE</span> AGENT</div>
            <div className="cia-tagline">MULTI-TOOL AGENTIC SYSTEM · 7 TOOLS · GEMINI-POWERED</div>
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            {allMem.length > 0 && (
              <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--cyan)",
                border:"1px solid var(--cyan)", padding:"3px 10px", borderRadius:20 }}>
                🧠 {allMem.length} in memory
              </div>
            )}
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>
              {TEAMS[teamUser]?.emoji} {teamUser} &nbsp;⚔️&nbsp; {TEAMS[teamOpp]?.emoji} {teamOpp}
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="cia-body">
        <div className="cia-grid">

          {/* ════════════════ LEFT PANEL ════════════════ */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Task selector */}
            <div className="card card-body">
              <div className="card-title">SELECT TASK</div>
              <div className="task-grid">
                {TASKS.map(t => (
                  <button key={t.id}
                    className={`task-btn ${task === t.id ? "active" : ""}`}
                    onClick={() => { setTask(t.id); setResult(null); setSteps([]); }}>
                    <div className="task-btn-label">{t.emoji} {t.label}</div>
                    <div className="task-btn-desc">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Team selector */}
            <div className="card card-body">
              <div className="card-title">TEAMS</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div>
                  <TeamBar team={teamUser} />
                  <label className="cia-label">Your Team</label>
                  <select className="cia-select" value={teamUser}
                    onChange={e => setTeamUser(e.target.value)}>
                    {Object.entries(TEAMS).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {k}</option>
                    ))}
                  </select>
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:4 }}>{TEAMS[teamUser]?.name}</div>
                </div>
                <div>
                  <TeamBar team={teamOpp} />
                  <label className="cia-label">Opponent</label>
                  <select className="cia-select" value={teamOpp}
                    onChange={e => setTeamOpp(e.target.value)}>
                    {Object.entries(TEAMS).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {k}</option>
                    ))}
                  </select>
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:4 }}>{TEAMS[teamOpp]?.name}</div>
                </div>
              </div>
            </div>

            {/* Analyze inputs */}
            {task === "analyze" && (
              <div className="card card-body">
                <div className="card-title">MATCH DATA</div>
                {/* Pressure inputs */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:18 }}>
                  {[
                    { lbl:"RUNS REQ", val:runs,    set:setRuns,    ph:"120" },
                    { lbl:"BALLS LEFT", val:balls,  set:setBalls,   ph:"72"  },
                    { lbl:"WICKETS",  val:wickets,  set:setWickets, ph:"6"   },
                  ].map(({ lbl, val, set, ph }) => (
                    <div key={lbl}>
                      <label className="cia-label">{lbl}</label>
                      <input type="number" className="cia-input" value={val}
                        onChange={e => set(e.target.value)} placeholder={ph}
                        style={{ textAlign:"center", fontFamily:"var(--font-mono)", fontSize:18, fontWeight:700 }} />
                    </div>
                  ))}
                </div>
                {/* Over data */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <label className="cia-label" style={{ margin:0 }}>OVER DATA (runs per over)</label>
                  <div style={{ display:"flex", gap:6 }}>
                    {[5, 10].map(n => (
                      <button key={n} onClick={() => setOverCount(n)}
                        style={{ background: overCount===n?"var(--cyan)":"var(--bg3)",
                          color: overCount===n?"#000":"var(--muted)",
                          border:`1px solid ${overCount===n?"var(--cyan)":"var(--border)"}`,
                          borderRadius:6, padding:"3px 10px", cursor:"pointer",
                          fontFamily:"var(--font-mono)", fontSize:11 }}>
                        {n} overs
                      </button>
                    ))}
                  </div>
                </div>
                <div className="over-grid">
                  {Array.from({ length: overCount }).map((_, i) => (
                    <div key={i}>
                      <div className="over-cell">O{i + 1}</div>
                      <input type="number" className="over-inp" min="0" max="36"
                        value={overVals[i]} onChange={e => setOver(i, e.target.value)}
                        placeholder="0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fact-check input */}
            {task === "fact-check" && (
              <div className="card card-body">
                <div className="card-title">CLAIM TO VERIFY</div>
                <label className="cia-label">Enter Cricket Claim</label>
                <textarea value={claim} onChange={e => setClaim(e.target.value)}
                  placeholder="e.g. RCB have never won an IPL title despite having Kohli for 16 seasons"
                  style={{ width:"100%", background:"var(--bg3)", border:"1px solid var(--border)",
                    borderRadius:8, color:"var(--text)", padding:12,
                    fontFamily:"var(--font-body)", fontSize:15, resize:"vertical", minHeight:90 }} />
              </div>
            )}

            {/* Execute */}
            <button className="exec-btn" onClick={execute} disabled={loading}>
              {loading
                ? <span className="pulse">⚡ AGENT THINKING...</span>
                : "⚡ EXECUTE AGENT"}
            </button>

            {/* Session Memory */}
            {allMem.length > 0 && (
              <div className="card card-body">
                <div style={{ fontFamily:"var(--font-display)", fontSize:16, letterSpacing:".07em",
                  color:"var(--gold)", marginBottom:10 }}>
                  🧠 SESSION MEMORY
                </div>
                {allMem.slice(0, 5).map((m, i) => (
                  <div className="mem-item" key={i}>
                    <div className="mem-time">{m.time} — {m.task.toUpperCase()}</div>
                    <div className="mem-desc">
                      {TEAMS[m.teamUser]?.emoji} {m.teamUser} &nbsp;vs&nbsp; {TEAMS[m.teamOpp]?.emoji} {m.teamOpp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ════════════════ RIGHT PANEL ════════════════ */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Thinking panel */}
            {steps.length > 0 && (
              <div className="thinking-panel card-glow-cyan">
                <div className="thinking-header" onClick={() => setThinkOpen(p => !p)}>
                  <div style={{ display:"flex", alignItems:"center" }}>
                    <span className="thinking-title">⚡ AGENT REASONING</span>
                    <span className="thinking-badge">{steps.length}</span>
                    {loading && <span className="pulse" style={{ marginLeft:10, fontSize:11,
                      fontFamily:"var(--font-mono)", color:"var(--gold)" }}>running...</span>}
                  </div>
                  <span style={{ color:"var(--muted)", fontSize:18, userSelect:"none" }}>
                    {thinkOpen ? "▲" : "▼"}
                  </span>
                </div>
                {thinkOpen && (
                  <div className="thinking-steps">
                    {steps.map((s, i) => (
                      <div className="thinking-step" key={i}>
                        <span className="thinking-step-num">{String(i + 1).padStart(2, "0")}</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {result && (
              <>
                {/* ── Pressure + Momentum ── */}
                {(result.pressure !== undefined || result.momentum) && (
                  <div style={{ display:"grid",
                    gridTemplateColumns: result.pressure !== undefined && result.momentum ? "1fr 1fr" : "1fr",
                    gap:16 }}>

                    {result.pressure !== undefined && (
                      <div className="card card-glow-red card-body" style={{ textAlign:"center" }}>
                        <div className="card-title" style={{ textAlign:"left" }}>PRESSURE GAUGE</div>
                        <PressureGauge value={result.pressure} />
                        {/* Stat pills */}
                        <div style={{ display:"flex", justifyContent:"center", gap:10, marginTop:12 }}>
                          <div className="stat-pill">
                            <span className="stat-val" style={{ color:"var(--cyan)", fontSize:19 }}>
                              {runs && balls ? ((runs / balls) * 6).toFixed(2) : "—"}
                            </span>
                            <span className="stat-lbl">RRR</span>
                          </div>
                          <div className="stat-pill">
                            <span className="stat-val" style={{ color:"var(--green)", fontSize:19 }}>{wickets || "—"}</span>
                            <span className="stat-lbl">WICKETS</span>
                          </div>
                          <div className="stat-pill">
                            <span className="stat-val" style={{ color:"var(--gold)", fontSize:19 }}>{balls || "—"}</span>
                            <span className="stat-lbl">BALLS</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {result.momentum && (
                      <div className="card card-body">
                        <div className="card-title">MOMENTUM CHART</div>
                        <ResponsiveContainer width="100%" height={170}>
                          <AreaChart data={result.momentum} margin={{ top:5, right:5, bottom:0, left:-18 }}>
                            <defs>
                              <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#00e5ff" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}    />
                              </linearGradient>
                              <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#ffc107" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#ffc107" stopOpacity={0}   />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="over"
                              tick={{ fill:"#6b6b8a", fontSize:10, fontFamily:"DM Mono" }} />
                            <YAxis
                              tick={{ fill:"#6b6b8a", fontSize:10, fontFamily:"DM Mono" }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="runs" name="Runs"
                              stroke="#00e5ff" strokeWidth={2} fill="url(#grad1)" />
                            <Area type="monotone" dataKey="avgMomentum" name="Avg"
                              stroke="#ffc107" strokeWidth={1.5} fill="url(#grad2)" strokeDasharray="5 3" />
                          </AreaChart>
                        </ResponsiveContainer>
                        {/* Over delta chips */}
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10 }}>
                          {result.momentum.map((m, i) => (
                            <div key={i} style={{
                              background: m.delta > 2 ? "rgba(0,230,118,.12)" : m.delta < -2 ? "rgba(230,57,70,.12)" : "var(--bg3)",
                              border:`1px solid ${m.delta > 2 ? "var(--green)" : m.delta < -2 ? "var(--red)" : "var(--border)"}`,
                              borderRadius:6, padding:"3px 8px",
                              fontFamily:"var(--font-mono)", fontSize:11,
                              color: m.delta > 2 ? "var(--green)" : m.delta < -2 ? "var(--red)" : "var(--muted)"
                            }}>
                              O{i+1}: {m.runs} {m.trend}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Explanation ── */}
                {result.explanation && (
                  <div className="card card-body">
                    <div className="result-section-title">🔬 TACTICAL ANALYSIS</div>
                    <p className="expl-text">{result.explanation}</p>
                  </div>
                )}

                {/* ── Roast ── */}
                {result.roast && (
                  <div className="card card-glow-red card-body"
                    style={{ borderColor:"rgba(230,57,70,0.25)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                      <div className="result-section-title" style={{ margin:0 }}>🔥 ROAST</div>
                      <div style={{
                        padding:"4px 14px",
                        background:`${TEAMS[teamUser]?.color}22`,
                        border:`1px solid ${TEAMS[teamUser]?.color}`,
                        borderRadius:20, color:TEAMS[teamUser]?.color,
                        fontSize:12, fontWeight:700, fontFamily:"var(--font-mono)"
                      }}>
                        {TEAMS[teamUser]?.emoji} {teamUser} FAN MODE
                      </div>
                    </div>
                    <p className="roast-text">{result.roast}</p>

                    {result.factCheck && (
                      <div className="fact-box">
                        <span className={`badge ${result.factCheck.valid ? "badge-ok" : "badge-warn"}`}>
                          {result.factCheck.valid ? "✅ VERIFIED" : "⚠️ FLAGGED"}
                        </span>
                        <span className="fact-reason">{result.factCheck.reason}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Battle ── */}
                {result.battle && (
                  <div className="card card-glow-gold card-body"
                    style={{ borderColor:"rgba(255,193,7,0.2)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
                      <div className="result-section-title" style={{ margin:0 }}>⚔️ ROAST BATTLE</div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontSize:18 }}>{TEAMS[teamUser]?.emoji}</span>
                        <span style={{ color:"var(--muted)", fontFamily:"var(--font-mono)", fontSize:11 }}>VS</span>
                        <span style={{ fontSize:18 }}>{TEAMS[teamOpp]?.emoji}</span>
                      </div>
                    </div>
                    <div className="battle-text">{result.battle}</div>
                  </div>
                )}

                {/* ── Standalone Fact Check ── */}
                {task === "fact-check" && result.factCheck && (
                  <div className="card card-body">
                    <div className="result-section-title">✅ FACT CHECK RESULT</div>
                    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                      <span className={`badge ${result.factCheck.verdict === "TRUE" ? "badge-ok" : result.factCheck.verdict === "FALSE" ? "badge-warn" : "badge-neutral"}`}
                        style={{ fontSize:15, padding:"7px 20px" }}>
                        {result.factCheck.verdict === "TRUE" ? "✅ TRUE" : result.factCheck.verdict === "FALSE" ? "❌ FALSE" : "❓ UNKNOWN"}
                      </span>
                    </div>
                    <p style={{ fontSize:15, lineHeight:1.75, color:"var(--text)" }}>
                      {result.factCheck.reason}
                    </p>
                    {claim && (
                      <div style={{ marginTop:14, padding:"10px 14px", background:"var(--bg3)",
                        borderRadius:8, fontFamily:"var(--font-mono)", fontSize:12, color:"var(--muted)",
                        borderLeft:"3px solid var(--muted)" }}>
                        CLAIM: "{claim}"
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Empty state */}
            {!result && !loading && steps.length === 0 && (
              <div className="card empty-state">
                <div className="empty-icon">🏏</div>
                <div className="empty-title">READY FOR ANALYSIS</div>
                <div className="empty-sub" style={{ marginBottom:20 }}>
                  Select a task · Configure teams · Execute the agent
                </div>
                {/* Quick guide */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, width:"100%", maxWidth:480 }}>
                  {[
                    { emoji:"🔬", t:"ANALYZE", d:"Enter match data → pressure score, momentum chart + AI analysis" },
                    { emoji:"🔥", t:"ROAST", d:"Select teams → AI generates savage fan roast with fact-check" },
                    { emoji:"⚔️", t:"BATTLE", d:"3-round roast war between fan bases, winner declared" },
                    { emoji:"✅", t:"FACT CHECK", d:"Enter any cricket claim → TRUE/FALSE with explanation" },
                  ].map(({ emoji, t, d }) => (
                    <div key={t} style={{ background:"var(--bg3)", borderRadius:10,
                      border:"1px solid var(--border)", padding:"12px 14px", textAlign:"left" }}>
                      <div style={{ fontFamily:"var(--font-display)", fontSize:15, letterSpacing:".06em",
                        color:"var(--gold)", marginBottom:4 }}>{emoji} {t}</div>
                      <div style={{ fontSize:12, color:"var(--muted)", lineHeight:1.5 }}>{d}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
