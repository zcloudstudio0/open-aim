// Aim coach: tells you WHY you miss and what to train next.
//
// main.js patches the game's frame loop to call
//   window.__aimCoachFrame(snapshot, camera, running)  once per rendered frame of a round
//   window.__aimCoachShot(shotEvent, snapshot)         for every shot
// From those it works out, per round:
//   1. Miss analysis: over-flick, under-flick, shooting while moving, aiming too low/high
//   2. Crosshair placement: how far the crosshair was from the head when a target appeared,
//      and how much of the time it sat at head level
//   3. Counter-strafe: shots fired while still moving (the game's own movement error)
//   4. Progress: every round is kept (localStorage), shown as charts
//   5. Training plan: drills picked from your weakest areas
//   6. Adaptive difficulty: easier/harder drill suggested from your last rounds
//   7. Spray: where each bullet of a burst went, relative to the first one
//   8. Shot review: the crosshair's last 0.6 s before each shot, replayed in slow motion
//   9. Sensitivity lab: your results per sensitivity, and an A/B test
// Everything stays on this computer. Interface in Thai (default) or English.
(() => {
  if (window.__aimCoach) return;

  // ---------- language ----------
  // Shared with the rest of the app (mods/.../i18n/th.mjs): Thai unless the player picked English.
  const LANG_KEY = "aim-lang";
  const lang = () => { try { return localStorage.getItem(LANG_KEY) === "en" ? "en" : "th"; } catch { return "th"; } };
  const TEXT = {
    th: {
      coach: "โค้ช", coachTitle: "โค้ชการเล็ง", coachSub: "วิเคราะห์ว่ายิงพลาดเพราะอะไร และควรฝึกอะไรต่อ ข้อมูลทั้งหมดเก็บในเครื่องนี้เท่านั้น",
      tabOverview: "ภาพรวม", tabProgress: "พัฒนาการ", tabPlan: "แผนฝึก", tabSpray: "สเปรย์", tabReview: "รีเพลย์ช็อต", tabSens: "เซ็นซิ",
      noData: "ยังไม่มีข้อมูล ลองเล่นสัก 1 รอบแล้วกลับมาดูที่นี่",
      lastRound: "รอบล่าสุด", shots: "นัดที่ยิง", acc: "ความแม่น", hs: "เฮดช็อต", reaction: "เวลาตอบสนอง", placement: "ระยะเป้าตอนศัตรูโผล่",
      headLevel: "เป้าอยู่ระดับหัว", cleanShots: "ยิงตอนหยุดนิ่ง", spray: "สเปรย์กระจาย",
      whyMiss: "ยิงพลาดเพราะอะไร",
      cat_head: "เข้าหัว", cat_hit: "โดนเป้า", cat_body: "โดนตัว (ต่ำกว่าหัว)", cat_over: "เลื่อนเกินเป้า", cat_under: "เลื่อนไม่ถึงเป้า",
      cat_moving: "ยิงตอนยังเดิน", cat_low: "เล็งต่ำเกินไป", cat_high: "เล็งสูงเกินไป", cat_wide: "พลาดด้านข้าง",
      tip_over: "เลื่อนเมาส์เกินหัวบ่อย ลองลดแรงสะบัดและหยุดมือให้นิ่งก่อนยิง ฝึก micro flick",
      tip_under: "สะบัดไม่ถึงหัวแล้วรีบยิง ลองสะบัดให้สุดก่อน แล้วค่อยกดยิง",
      tip_moving: "กดยิงตอนตัวละครยังเคลื่อนที่ กระสุนจะกระจาย ให้กดปุ่มฝั่งตรงข้ามเพื่อหยุด (counter-strafe) แล้วค่อยยิง",
      tip_low: "เป้าเล็งต่ำกว่าระดับหัว ตั้งเป้าไว้ที่ความสูงหัวตลอดเวลา จะได้เลื่อนแค่แนวนอน",
      tip_high: "เล็งสูงเกินหัว ลดเป้าลงเล็กน้อย",
      tip_wide: "พลาดด้านข้างตอนเมาส์ไม่ได้เคลื่อน อาจเพราะเป้าขยับหรือยิงเร็วเกินไป",
      tip_placement: "ตอนศัตรูโผล่ เป้าเล็งอยู่ห่างหัวเฉลี่ย {0}° ยิ่งน้อยยิ่งดี ลองวางเป้าไว้ตรงมุมที่ศัตรูจะออกมา",
      tip_clean: "{0}% ของนัดยิงตอนยังเคลื่อนที่ เป้าหมายคือต่ำกว่า 10%",
      good: "ดีมาก! ไม่พบจุดอ่อนชัดเจนในรอบนี้",
      progressSub: "แต่ละจุดคือ 1 รอบ เส้นหนาคือค่าเฉลี่ย 5 รอบ",
      all: "ทุกด่าน", rounds: "รอบ",
      planSub: "จัดจากจุดอ่อนใน {0} รอบล่าสุดของคุณ ใช้เวลาประมาณ 15 นาที",
      warmup: "วอร์มอัพ", start: "เริ่มฝึก", minutes: "{0} นาที", focus: "เน้น",
      diffTitle: "ปรับความยาก", diffUp: "คุณแม่น {0}% ในด่านนี้ ลองด่านที่ยากขึ้น", diffDown: "ความแม่น {0}% ยังต่ำ ลองด่านที่ง่ายลงก่อน", diffKeep: "ความยากตอนนี้เหมาะแล้ว ({0}%) ฝึกต่อจนแม่นเกิน 85%",
      harder: "ยากขึ้น", easier: "ง่ายลง",
      plan_over: "ลดการเลื่อนเกินเป้า", plan_under: "สะบัดให้ถึงเป้า", plan_moving: "หยุดก่อนยิง (counter-strafe)",
      plan_low: "วางเป้าระดับหัว", plan_placement: "วางเป้าดักมุม (pre-aim)", plan_reaction: "ตอบสนองให้เร็วขึ้น", plan_track: "แทร็กเป้าที่เคลื่อนที่", plan_spray: "คุมสเปรย์",
      spraySub: "แต่ละเส้นคือ 1 ชุดกระสุนที่ยิงต่อเนื่อง จุดแรก (สีขาว) อยู่ตรงกลาง ยิ่งจุดเกาะกลุ่มกันยิ่งคุมสเปรย์ได้ดี",
      noBursts: "รอบล่าสุดไม่มีการยิงต่อเนื่อง (ต้องยิง 3 นัดขึ้นไปติดกัน)",
      burstSize: "ขนาดกลุ่มเฉลี่ย", bursts: "ชุดกระสุน", reviewSub: "เส้นทางเป้าเล็ง 0.6 วินาทีก่อนยิง วงกลมคือหัวเป้าหมาย จุดสุดท้ายคือตำแหน่งที่ยิง",
      play: "เล่น", speed: "ความเร็ว", noShots: "ยังไม่มีช็อตให้ดู",
      sensSub: "เทียบผลงานของคุณในแต่ละค่าเซ็นซิ ใช้ด่านเดิมและเล่นค่าละ 3 รอบขึ้นไปเพื่อให้เทียบได้ยุติธรรม",
      sensCurrent: "เซ็นซิตอนนี้", sensTest: "ทดสอบ A/B (−15% / เท่าเดิม / +15%)", sensSet: "ใช้", sensBest: "ค่าที่ดีที่สุดจากข้อมูล", sensNeed: "ต้องมีอย่างน้อย 3 รอบต่อค่าจึงจะเลือกค่าที่ดีที่สุดได้",
      sensSetDone: "ตั้งเซ็นซิเป็น {0} แล้ว", sensSetFail: "กลับไปหน้าล็อบบี้ก่อนจึงจะเปลี่ยนเซ็นซิได้",
      score: "คะแนนรวม", openCoach: "เปิดโค้ช", close: "ปิด", roundDone: "สรุปรอบนี้", clear: "ลบประวัติ", clearAsk: "ลบประวัติการฝึกทั้งหมดของโค้ช?",
      unknown: "ไม่ทราบชื่อด่าน", lang: "English", coachBtn: "โค้ช: วิเคราะห์การยิง แผนฝึก และพัฒนาการ",
    },
    en: {
      coach: "Coach", coachTitle: "Aim coach", coachSub: "Why you miss and what to train next. Everything stays on this computer.",
      tabOverview: "Overview", tabProgress: "Progress", tabPlan: "Plan", tabSpray: "Spray", tabReview: "Shot review", tabSens: "Sensitivity",
      noData: "No data yet. Play a round, then come back here.",
      lastRound: "Last round", shots: "Shots", acc: "Accuracy", hs: "Headshots", reaction: "Reaction", placement: "Crosshair off head at spawn",
      headLevel: "Crosshair at head level", cleanShots: "Shots while stopped", spray: "Spray spread",
      whyMiss: "Why you missed",
      cat_head: "Headshot", cat_hit: "Hit", cat_body: "Body (below head)", cat_over: "Over-flick", cat_under: "Under-flick",
      cat_moving: "Shot while moving", cat_low: "Aimed too low", cat_high: "Aimed too high", cat_wide: "Missed to the side",
      tip_over: "You often flick past the head. Flick a little softer and let your hand settle before you click. Train micro flicks.",
      tip_under: "You stop short of the head and click early. Finish the flick, then click.",
      tip_moving: "You fire while still moving, so bullets spread. Tap the opposite key to stop (counter-strafe), then shoot.",
      tip_low: "Your crosshair sits below head height. Keep it at head level so you only need to move sideways.",
      tip_high: "You aim above the head. Lower your crosshair slightly.",
      tip_wide: "Side misses with a still mouse: the target moved or you clicked too soon.",
      tip_placement: "When a target appeared your crosshair was {0}° from its head on average. Lower is better: pre-aim where enemies appear.",
      tip_clean: "{0}% of your shots were fired while moving. Aim for under 10%.",
      good: "Great! No clear weakness this round.",
      progressSub: "Each dot is one round; the thick line is the 5-round average.",
      all: "All drills", rounds: "rounds",
      planSub: "Built from the weak spots in your last {0} rounds. About 15 minutes.",
      warmup: "Warm-up", start: "Start", minutes: "{0} min", focus: "Focus",
      diffTitle: "Difficulty", diffUp: "{0}% accuracy here: try the harder drill.", diffDown: "{0}% accuracy is low: try the easier drill first.", diffKeep: "This difficulty fits ({0}%). Keep going until you pass 85%.",
      harder: "Harder", easier: "Easier",
      plan_over: "Stop over-flicking", plan_under: "Finish your flicks", plan_moving: "Stop before you shoot (counter-strafe)",
      plan_low: "Crosshair at head level", plan_placement: "Pre-aim angles", plan_reaction: "Faster reactions", plan_track: "Track moving targets", plan_spray: "Spray control",
      spraySub: "Each line is one burst. Its first bullet (white) is in the middle; the tighter the dots, the better your spray control.",
      noBursts: "No bursts last round (needs 3 or more shots in a row).",
      burstSize: "Average group size", bursts: "Bursts", reviewSub: "Your crosshair's last 0.6 s before the shot. The circle is the target's head, the last dot is where you fired.",
      play: "Play", speed: "Speed", noShots: "No shots to review yet.",
      sensSub: "Your results per sensitivity. Use the same drill and play 3+ rounds per value for a fair comparison.",
      sensCurrent: "Current sensitivity", sensTest: "A/B test (−15% / same / +15%)", sensSet: "Use", sensBest: "Best so far", sensNeed: "Needs 3+ rounds per value to pick a best one.",
      sensSetDone: "Sensitivity set to {0}.", sensSetFail: "Go back to the lobby to change sensitivity.",
      score: "Score", openCoach: "Open coach", close: "Close", roundDone: "Round summary", clear: "Clear history", clearAsk: "Delete all of the coach's training history?",
      unknown: "Unknown drill", lang: "ภาษาไทย", coachBtn: "Coach: shot analysis, training plan and progress",
    },
  };
  const t = (key, ...args) => String(TEXT[lang()][key] ?? TEXT.en[key] ?? key).replace(/\{(\d)\}/g, (_, i) => args[i]);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---------- drills used by the plan (share codes from scenarios/) ----------
  const DRILLS = {
    "e3c17ccb9f5a1500": "Micro flicks", "d43f842fb33e4d46": "Micro tiles", "3bf951cda7a49fef": "Micro shrink",
    "42029c967a1d3db5": "Micro track", "406d6e47ebc89bc3": "Head-level micro", "6bdae48b1990cd16": "Stop-and-go strafer",
    "43dd532452d8890e": "Jumping strafer", "d355a344c819596d": "Drift Click", "ea9dd90bd251f6ba": "Drift Track",
    "109f1c3d5d919b0d": "Drift Fast", "3738fa80e13c6341": "Drift Small",
    "b6d26bc36aab936c": "Sunset A Short: pre-aim (easy)", "377921a685c761aa": "Sunset A Short: pre-aim (hard)",
    "4bbed18893e7142f": "Sunset A Tube: pre-aim (easy)", "382004b0566223b7": "Sunset A Tube: pre-aim (hard)",
    "0bde7807c506db39": "Sunset B Main: pre-aim (easy)", "03bd24fedb5bcd4c": "Sunset B Main: pre-aim (hard)",
    "54d79166b4f48373": "Ascent B retake: peekers", "313818c034e0fb52": "Bind A Showers: peekers",
  };
  const FOCUS = {
    over: ["e3c17ccb9f5a1500", "3bf951cda7a49fef"], under: ["d43f842fb33e4d46", "d355a344c819596d"],
    moving: ["6bdae48b1990cd16", "43dd532452d8890e"], low: ["406d6e47ebc89bc3", "b6d26bc36aab936c"],
    placement: ["b6d26bc36aab936c", "0bde7807c506db39"], reaction: ["313818c034e0fb52", "109f1c3d5d919b0d"],
    track: ["42029c967a1d3db5", "ea9dd90bd251f6ba"], spray: ["54d79166b4f48373", "3738fa80e13c6341"],
  };
  // Easy -> hard pairs, for the difficulty suggestion.
  const LADDER = [
    ["b6d26bc36aab936c", "377921a685c761aa"], ["4bbed18893e7142f", "382004b0566223b7"], ["0bde7807c506db39", "03bd24fedb5bcd4c"],
    ["d43f842fb33e4d46", "e3c17ccb9f5a1500"], ["e3c17ccb9f5a1500", "3bf951cda7a49fef"], ["ea9dd90bd251f6ba", "42029c967a1d3db5"],
    ["d355a344c819596d", "3738fa80e13c6341"], ["6bdae48b1990cd16", "43dd532452d8890e"],
  ];

  // ---------- storage ----------
  const HIST_KEY = "es-coach-history-v1";
  const MAX_HISTORY = 400;
  function loadHistory() { try { const h = JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); return Array.isArray(h) ? h : []; } catch { return []; } }
  function saveHistory(h) { try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(-MAX_HISTORY))); } catch {} }
  function currentSens() {
    const v = parseFloat(document.querySelector(".hall-sens input")?.value);
    if (v > 0) return v;
    try { const s = parseFloat(localStorage.getItem("al-sensitivity-v1")); if (s > 0) return s; } catch {}
    return null;
  }

  // ---------- geometry ----------
  const D = 180 / Math.PI;
  const az = (x, z) => Math.atan2(x, -z) * D;              // 0 = looking down -Z (the game's yaw 0); right is +
  const el = (x, y, z) => Math.atan2(y, Math.hypot(x, z)) * D;
  const wrap = (a) => ((a + 540) % 360) - 180;
  const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

  // Scene templates (sphere or humanoid) for the drill being played.
  let templates = {};
  const headHeights = []; // measured from real head hits, so the head height matches the game's bots
  const headY = () => median(headHeights) ?? 1.6;
  async function loadScene(code) {
    templates = {};
    if (!code) return;
    try {
      const r = await fetch(`/prod-api/api/v1/public/val/aimlab/scenes/${code}`);
      const j = await r.json();
      const doc = typeof j?.data?.doc === "string" ? JSON.parse(j.data.doc) : j?.data?.doc;
      for (const a of doc?.actors || []) templates[a.id] = a.body || {};
    } catch {}
  }
  // The point a perfect shot aims at: the head of a humanoid, the centre of a ball.
  function aimPoint(a, playerY) {
    const body = templates[a.templateId];
    const p = a.position, o = a.offset || { x: 0, y: 0, z: 0 }, s = a.scale || 1;
    const humanoid = body ? body.shape === "humanoid" : p.y - playerY < 0.6;
    if (!humanoid) return { x: p.x + o.x, y: p.y + o.y, z: p.z + o.z, r: (body?.radius ?? 0.15) * s, humanoid };
    return { x: p.x + o.x, y: p.y + o.y + headY() * s, z: p.z + o.z, r: 0.11 * (body?.headSize ?? 1) * s, humanoid, base: p.y + o.y };
  }

  // ---------- live round ----------
  const FRAME_WINDOW = 700; // ms of frames kept for mouse speed and shot review
  let cur = null;           // the round being played
  let lastRound = null;     // details of the last finished round (spray and review)
  let pending = null;       // drill picked in the lobby
  let lastFrameAt = 0, stoppedSince = 0;

  function newRound(tick) {
    const code = pending?.code || null;
    cur = {
      id: Date.now(), at: Date.now(), code, name: (code && DRILLS[code]) || pending?.name || readRoundName(), sens: currentSens(),
      startTick: tick, lastTick: tick, frames: [], alive: new Set(), spawnAt: new Map(), firstHit: new Set(),
      shots: [], cats: {}, placement: [], headFrames: 0, aimFrames: 0, reactions: [], bursts: [], burst: null,
      lastShotAt: 0, finalized: false,
    };
    if (code) loadScene(code);
  }
  function readRoundName() {
    const lines = (document.querySelector(".al-aimlab-root")?.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    const i = lines.findIndex((l) => /TAB/.test(l));
    return i >= 0 && lines[i + 1] && !/^\d/.test(lines[i + 1]) ? lines[i + 1] : null;
  }

  window.__aimCoachFrame = (s, cam, running) => {
    try {
      if (!s || !cam) return;
      const now = performance.now();
      if (!running) { if (cur && !stoppedSince) stoppedSince = now; return; }
      stoppedSince = 0;
      if (!cur || s.tick < cur.lastTick) { if (cur) finalize(); newRound(s.tick); }
      else if (cur.finalized) reopen();
      cur.lastTick = s.tick;
      lastFrameAt = now;
      const e = cam.matrixWorld.elements;
      const fx = -e[8], fy = -e[9], fz = -e[10], px = e[12], py = e[13], pz = e[14];
      const camAz = az(fx, fz), camEl = el(fx, fy, fz);
      const playerY = s.player?.position?.y ?? 0;

      const targets = [];
      let nearest = null;
      for (const a of s.actors || []) {
        if (!a.alive || a.visible === false) continue;
        const p = aimPoint(a, playerY);
        const dx = p.x - px, dy = p.y - py, dz = p.z - pz;
        const tAz = az(dx, dz), tEl = el(dx, dy, dz);
        const dAz = wrap(camAz - tAz), dEl = camEl - tEl;
        const ang = Math.hypot(dAz, dEl);
        targets.push({ id: a.id, az: tAz, el: tEl });
        if (!nearest || ang < nearest.ang) nearest = { ang, dEl, humanoid: p.humanoid };
        if (!cur.alive.has(a.id)) {
          // A target just appeared: how far was the crosshair from its head?
          cur.spawnAt.set(a.id, now);
          if (s.tick - cur.startTick > 5) cur.placement.push(ang);
        }
      }
      cur.alive = new Set(targets.map((x) => x.id));
      // Crosshair height while not already on a target (humanoid drills only).
      if (nearest && nearest.humanoid && nearest.ang > 2) { cur.aimFrames++; if (Math.abs(nearest.dEl) < 1.5) cur.headFrames++; }

      cur.frames.push({ t: now, az: camAz, el: camEl, targets });
      while (cur.frames.length && now - cur.frames[0].t > FRAME_WINDOW) cur.frames.shift();
    } catch (err) { console.error("AIM COACH frame:", err); }
  };

  window.__aimCoachShot = (e, s) => {
    try {
      if (!cur || cur.finalized || !e || !e.direction || !e.origin) return;
      const now = performance.now();
      const d = e.direction, o = e.origin;
      const sAz = az(d.x, d.z), sEl = el(d.x, d.y, d.z);
      const playerY = s?.player?.position?.y ?? 0;

      // Target: the one hit, else the one closest to where the bullet went.
      let best = null;
      for (const a of s?.actors || []) {
        if (!(a.alive || a.id === e.hitActorId)) continue;
        const p = aimPoint(a, playerY);
        const dx = p.x - o.x, dy = p.y - o.y, dz = p.z - o.z;
        const dist = Math.hypot(dx, dy, dz);
        const dAz = wrap(sAz - az(dx, dz)), dEl = sEl - el(dx, dy, dz);
        const ang = Math.hypot(dAz, dEl);
        const cand = { id: a.id, dAz, dEl, ang, rad: Math.atan2(p.r, dist) * D, humanoid: p.humanoid, base: p.base };
        if (a.id === e.hitActorId) { best = cand; break; }
        if (!best || ang < best.ang) best = cand;
      }
      // Calibrate head height from real head hits.
      if (e.hitPart === "head" && e.hitPoint && best?.humanoid && best.base !== undefined) {
        const h = e.hitPoint.y - best.base;
        if (h > 0.8 && h < 2.4) { headHeights.push(h); if (headHeights.length > 60) headHeights.shift(); }
      }

      // Mouse speed over the last 100 ms (deg/s), signed like the error (right is +).
      const f = cur.frames;
      let yawVel = 0;
      if (f.length > 1) {
        const last = f[f.length - 1];
        let k = f.length - 2;
        while (k > 0 && last.t - f[k].t < 100) k--;
        const dt = (last.t - f[k].t) / 1000;
        if (dt > 0) yawVel = wrap(last.az - f[k].az) / dt;
      }
      const v = s?.player?.velocity;
      const speed = v ? Math.hypot(v.x || 0, v.y || 0) : 0;
      const moveErr = typeof e.firingDeg === "number" ? Math.max(0, e.spreadDeg - e.firingDeg) : 0;
      const moving = moveErr > 0.05 || speed > 1;

      let cat;
      const hit = e.hitActorId !== null && e.hitActorId !== undefined;
      if (hit && e.hitPart === "head") cat = "head";
      else if (hit && best && !best.humanoid) cat = "hit";
      else if (moving) cat = "moving";
      else if (hit) cat = best && best.dEl > 0 ? "high" : "body";
      else if (!best) cat = "wide";
      else if (Math.abs(best.dAz) >= Math.abs(best.dEl)) {
        if (Math.abs(yawVel) > 40) cat = Math.sign(best.dAz) === Math.sign(yawVel) ? "over" : "under";
        else cat = "wide";
      } else cat = best.dEl < 0 ? "low" : "high";
      cur.cats[cat] = (cur.cats[cat] || 0) + 1;

      // Reaction: target appeared -> first hit on it.
      if (hit && !cur.firstHit.has(e.hitActorId)) {
        cur.firstHit.add(e.hitActorId);
        const at = cur.spawnAt.get(e.hitActorId);
        if (at && now - at < 3000) cur.reactions.push(now - at);
      }

      // Spray: shots less than 250 ms apart are one burst.
      if (!cur.burst || now - cur.lastShotAt > 250) {
        if (cur.burst && cur.burst.pts.length >= 3) cur.bursts.push(cur.burst);
        cur.burst = { az0: sAz, el0: sEl, pts: [] };
      }
      cur.burst.pts.push([wrap(sAz - cur.burst.az0), sEl - cur.burst.el0]);
      cur.lastShotAt = now;

      // Shot review: crosshair path relative to the target's head over the last 0.6 s.
      let path = null;
      if (best) {
        path = [];
        for (const fr of f) {
          const tg = fr.targets.find((x) => x.id === best.id);
          if (tg) path.push([+wrap(fr.az - tg.az).toFixed(3), +(fr.el - tg.el).toFixed(3), Math.round(fr.t - now)]);
        }
        path.push([+best.dAz.toFixed(3), +best.dEl.toFixed(3), 0]);
      }
      cur.shots.push({ cat, hit, head: e.hitPart === "head", speed: +speed.toFixed(2), yawVel: Math.round(yawVel), rad: best ? +best.rad.toFixed(3) : null, path });
      if (cur.shots.length > 600) cur.shots.shift();
    } catch (err) { console.error("AIM COACH shot:", err); }
  };

  // ---------- end of round ----------
  function allBursts(r) { return r.burst && r.burst.pts.length >= 3 ? [...r.bursts, r.burst] : r.bursts; }
  function summarize(r) {
    const n = r.shots.length;
    const hits = r.shots.filter((x) => x.hit).length;
    const heads = r.shots.filter((x) => x.head).length;
    const humanoid = r.shots.some((x) => x.cat === "head" || x.cat === "body") || r.aimFrames > 0;
    const moving = r.cats.moving || 0;
    const sizes = allBursts(r).map((b) => { const cx = mean(b.pts.map((p) => p[0])), cy = mean(b.pts.map((p) => p[1])); return mean(b.pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy))); });
    return {
      id: r.id, at: r.at, code: r.code, name: r.name, sens: r.sens, shots: n, hits, heads,
      acc: n ? hits / n : 0, hs: hits ? heads / hits : 0, humanoid,
      cats: { ...r.cats }, placement: median(r.placement), headLevel: r.aimFrames > 30 ? r.headFrames / r.aimFrames : null,
      clean: n ? 1 - moving / n : null, reaction: median(r.reactions), spray: mean(sizes), bursts: allBursts(r).length,
    };
  }
  function finalize() {
    if (!cur || cur.finalized) return;
    cur.finalized = true;
    if (cur.shots.length < 3) return;
    const sum = summarize(cur);
    const h = loadHistory().filter((x) => x.id !== sum.id);
    h.push(sum);
    saveHistory(h);
    lastRound = { sum, shots: cur.shots, bursts: allBursts(cur) };
    showRoundCard(sum);
  }
  function reopen() { // resumed after the pause menu: the same round continues
    cur.finalized = false;
    hideRoundCard();
  }

  // ---------- analysis ----------
  function weaknesses(sums) {
    if (!sums.length) return [];
    const tot = {}; let shots = 0;
    for (const s of sums) { shots += s.shots; for (const [k, v] of Object.entries(s.cats)) tot[k] = (tot[k] || 0) + v; }
    const pct = (k) => (shots ? (tot[k] || 0) / shots : 0);
    const out = [];
    const add = (key, value, weight, text) => { if (value > 0) out.push({ key, value, score: value * weight, text }); };
    add("over", pct("over"), 1.2, t("tip_over"));
    add("under", pct("under"), 1.1, t("tip_under"));
    add("moving", pct("moving"), 1.3, t("tip_moving"));
    add("low", pct("low") + pct("body") * 0.6, 1.0, t("tip_low"));
    add("high", pct("high"), 0.7, t("tip_high"));
    add("wide", pct("wide"), 0.5, t("tip_wide"));
    const place = median(sums.map((s) => s.placement).filter((x) => x != null));
    if (place != null && place > 4) out.push({ key: "placement", value: place, score: Math.min(1, place / 25) * 0.6, text: t("tip_placement", place.toFixed(1)) });
    const react = median(sums.map((s) => s.reaction).filter((x) => x != null));
    if (react != null && react > 450) out.push({ key: "reaction", value: react, score: Math.min(1, (react - 450) / 600) * 0.5, text: "" });
    const spray = mean(sums.map((s) => s.spray).filter((x) => x != null));
    if (spray != null && spray > 1.2) out.push({ key: "spray", value: spray, score: Math.min(1, spray / 4) * 0.4, text: "" });
    return out.filter((w) => w.score > 0.04).sort((a, b) => b.score - a.score);
  }
  function difficultyAdvice(sums) {
    const last = sums[sums.length - 1];
    if (!last?.code) return null;
    const same = sums.filter((s) => s.code === last.code).slice(-3);
    const acc = mean(same.map((s) => s.acc));
    const pair = LADDER.find((p) => p.includes(last.code));
    const pct = Math.round(acc * 100);
    if (acc >= 0.85 && (!last.humanoid || mean(same.map((s) => s.hs)) >= 0.4)) {
      const next = LADDER.find((p) => p[0] === last.code)?.[1] ?? null;
      return { dir: "up", text: t("diffUp", pct), code: next };
    }
    if (acc < 0.55) {
      const prev = LADDER.find((p) => p[1] === last.code)?.[0] ?? null;
      return { dir: "down", text: t("diffDown", pct), code: prev };
    }
    return pair ? { dir: "keep", text: t("diffKeep", pct), code: null } : { dir: "keep", text: t("diffKeep", pct), code: null };
  }

  // ---------- starting a drill from the coach ----------
  async function startDrill(code) {
    closePanel(); hideRoundCard();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = Date.now() + 15000;
    // Leave a finished round first: the game's own Back button, else reload the lobby
    // and start the drill from there (see the coach-start check below).
    if (document.querySelector(".al-aimlab-root")) {
      const back = [...document.querySelectorAll('.al-aimlab-root button, .al-aimlab-root a, .al-aimlab-root [role="button"]')]
        .find((b) => /VALORANT Training|^\s*Back|返回/i.test(b.textContent));
      back?.click();
      const leaveBy = Date.now() + 3000;
      while (Date.now() < leaveBy && document.querySelector(".al-aimlab-root")) await wait(150);
      if (document.querySelector(".al-aimlab-root")) { location.assign(`/aim#coach-start=${encodeURIComponent(code)}`); location.reload(); return; }
    }
    const tabEl = document.querySelector(".hall-tab");
    if (tabEl && !tabEl.classList.contains("is-active")) tabEl.click();
    while (Date.now() < until) {
      const card = document.querySelector(`[data-role="workshop-card"][data-share-code="${code}"]`);
      const go = card && card.querySelector(".al-wk-split-go, .al-wk-go");
      if (card) card.scrollIntoView({ block: "center" });
      if (go) {
        pending = { code, name: DRILLS[code] || cardName(card) };
        // The game's router can put the start link back while it loads; drop it so a reload does not restart the drill.
        if (/coach-start=/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
        go.click();
        return;
      }
      await wait(150);
    }
  }
  function cardName(card) {
    const lines = (card?.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    return lines.find((l) => !/^NO\./i.test(l)) || null;
  }
  // Remember which drill the player starts from the lobby.
  document.addEventListener("click", (ev) => {
    const c = ev.target.closest?.('[data-role="workshop-card"]');
    if (c?.dataset.shareCode) pending = { code: c.dataset.shareCode, name: cardName(c) };
  }, true);

  // ---------- styles ----------
  const style = document.createElement("style");
  style.textContent = `
.es-coach{width:min(940px,94vw)!important;max-width:none!important;max-height:88vh;display:flex;flex-direction:column}
.es-coach .es-tool-body{overflow:auto}
.es-coach-tabs{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 14px;border-bottom:1px solid #343b4a}
.es-coach-tabs button{background:none;border:0;border-bottom:2px solid transparent;color:#9aa1ae;padding:8px 12px;font:600 13px/1.2 inherit;cursor:pointer}
.es-coach-tabs button.is-on{color:#f4f5f7;border-color:var(--es-red,#ff4655)}
.es-coach-tabs .es-coach-lang{margin-left:auto;color:#ffd25a}
.es-coach-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:0 0 16px}
.es-coach-kpi{background:#ffffff08;border:1px solid #ffffff12;padding:10px 12px}
.es-coach-kpi span{display:block;color:#9aa1ae;font-size:11px;margin-bottom:4px}
.es-coach-kpi b{font-size:20px;font-weight:700;color:#f4f5f7}
.es-coach-bars{display:flex;flex-direction:column;gap:6px;margin:0 0 16px}
.es-coach-bar{display:grid;grid-template-columns:170px 1fr 52px;align-items:center;gap:10px;font-size:13px}
.es-coach-bar i{display:block;height:10px;background:#ffffff10;position:relative}
.es-coach-bar i u{position:absolute;inset:0 auto 0 0;background:var(--c,#ff4655)}
.es-coach-bar em{font-style:normal;text-align:right;color:#c9ced6}
.es-coach-tips{display:flex;flex-direction:column;gap:8px}
.es-coach-tip{border-left:3px solid var(--es-red,#ff4655);background:#ff465512;padding:10px 12px;font-size:13px;line-height:1.6}
.es-coach-tip.is-good{border-color:#4ade80;background:#4ade8012}
.es-coach-tip button{margin-left:8px}
.es-coach h3{font-size:14px;margin:18px 0 8px;color:#f4f5f7}
.es-coach-note{color:#9aa1ae;font-size:12px;margin:0 0 12px;line-height:1.6}
.es-coach canvas{display:block;max-width:100%;background:#0b0e13;border:1px solid #ffffff12}
.es-coach-plan{display:flex;flex-direction:column;gap:8px}
.es-coach-step{display:grid;grid-template-columns:60px 1fr auto;align-items:center;gap:12px;background:#ffffff08;border:1px solid #ffffff12;padding:10px 12px}
.es-coach-step b{display:block;font-size:14px}.es-coach-step small{color:#9aa1ae;font-size:12px}
.es-coach-min{font-size:12px;color:#ffd25a;font-weight:700}
.es-coach-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:8px 0}
.es-coach-list{display:flex;flex-direction:column;gap:4px;max-height:420px;overflow:auto;width:220px}
.es-coach-list button{display:flex;justify-content:space-between;gap:8px;text-align:left;background:#ffffff06;border:1px solid #ffffff10;color:#c9ced6;padding:6px 8px;cursor:pointer;font-size:12px}
.es-coach-list button.is-on{border-color:var(--es-red,#ff4655);color:#fff}
.es-coach-review{display:flex;gap:14px;flex-wrap:wrap}
.es-coach-table{width:100%;border-collapse:collapse;font-size:13px}
.es-coach-table th,.es-coach-table td{padding:7px 8px;border-bottom:1px solid #ffffff10;text-align:right}
.es-coach-table th:first-child,.es-coach-table td:first-child{text-align:left}
.es-coach-table tr.is-best td{color:#4ade80;font-weight:700}
.es-coach-card{position:fixed;right:22px;bottom:84px;z-index:2147482000;width:340px;background:rgba(14,17,23,.95);border:1px solid #343b4a;box-shadow:0 10px 40px #000a;padding:14px 16px;color:#f4f5f7;font-size:13px}
.es-coach-card h4{margin:0 0 8px;font-size:14px;display:flex;justify-content:space-between}
.es-coach-card h4 button{background:none;border:0;color:#9aa1ae;cursor:pointer;font-size:14px}
.es-coach-card .es-coach-kpis{grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px}
.es-coach-card .es-coach-kpi{padding:6px 8px}.es-coach-card .es-coach-kpi b{font-size:16px}
.es-coach-card p{margin:0 0 10px;line-height:1.55;color:#c9ced6}
.es-coach-card .es-coach-row{margin:0}
`;
  document.head.appendChild(style);

  // ---------- panel ----------
  let shade = null, tab = "overview", anim = 0;
  function closePanel() { cancelAnimationFrame(anim); shade?.remove(); shade = null; }
  function open(which) {
    if (which) tab = which;
    window.__aimTools?.close?.();
    closePanel();
    shade = document.createElement("div");
    shade.className = "es-tool-shade";
    shade.innerHTML = `<section class="es-tool es-coach" role="dialog" aria-label="${esc(t("coachTitle"))}">
      <header class="es-tool-head"><div><h2>${esc(t("coachTitle"))}</h2><p>${esc(t("coachSub"))}</p></div>
      <button type="button" class="es-tool-x" aria-label="${esc(t("close"))}">✕</button></header>
      <div class="es-tool-body"><nav class="es-coach-tabs"></nav><div class="es-coach-view"></div></div></section>`;
    shade.addEventListener("mousedown", (e) => { if (e.target === shade) closePanel(); });
    shade.querySelector(".es-tool-x").addEventListener("click", closePanel);
    for (const type of ["keydown", "keyup", "keypress"]) shade.addEventListener(type, (e) => { if (type === "keydown" && e.key === "Escape") closePanel(); e.stopPropagation(); });
    const nav = shade.querySelector(".es-coach-tabs");
    const tabs = [["overview", t("tabOverview")], ["progress", t("tabProgress")], ["plan", t("tabPlan")], ["spray", t("tabSpray")], ["review", t("tabReview")], ["sens", t("tabSens")]];
    for (const [id, label] of tabs) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label; b.classList.toggle("is-on", id === tab);
      b.addEventListener("click", () => { tab = id; open(); });
      nav.appendChild(b);
    }
    const lb = document.createElement("button");
    lb.type = "button"; lb.className = "es-coach-lang"; lb.textContent = t("lang");
    // The whole app switches language, so reload like the top bar's language button.
    lb.addEventListener("click", () => { try { localStorage.setItem(LANG_KEY, lang() === "th" ? "en" : "th"); } catch {} location.reload(); });
    nav.appendChild(lb);
    document.body.appendChild(shade);
    const view = shade.querySelector(".es-coach-view");
    ({ overview, progress, plan, spray, review, sens })[tab](view);
  }

  const pctTxt = (x) => (x == null ? "–" : `${Math.round(x * 100)}%`);
  const degTxt = (x) => (x == null ? "–" : `${x.toFixed(1)}°`);
  const msTxt = (x) => (x == null ? "–" : `${Math.round(x)} ms`);
  const CAT_COLOR = { head: "#4ade80", hit: "#4ade80", body: "#ffd25a", over: "#ff4655", under: "#ff8a4c", moving: "#5ce1e6", low: "#c084fc", high: "#a78bfa", wide: "#9aa1ae" };

  function kpis(s) {
    const items = [[t("shots"), s.shots], [t("acc"), pctTxt(s.acc)]];
    if (s.humanoid) items.push([t("hs"), pctTxt(s.hs)]);
    items.push([t("reaction"), msTxt(s.reaction)], [t("cleanShots"), pctTxt(s.clean)]);
    if (s.placement != null) items.push([t("placement"), degTxt(s.placement)]);
    if (s.headLevel != null) items.push([t("headLevel"), pctTxt(s.headLevel)]);
    if (s.spray != null) items.push([t("spray"), degTxt(s.spray)]);
    return `<div class="es-coach-kpis">${items.map(([k, v]) => `<div class="es-coach-kpi"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div>`;
  }
  function catBars(s) {
    const total = s.shots || 1;
    const order = ["head", "hit", "body", "over", "under", "moving", "low", "high", "wide"].filter((k) => s.cats[k]);
    return `<div class="es-coach-bars">${order.map((k) => `<div class="es-coach-bar"><span>${esc(t("cat_" + k))}</span><i><u style="width:${(s.cats[k] / total) * 100}%;--c:${CAT_COLOR[k]}"></u></i><em>${Math.round((s.cats[k] / total) * 100)}%</em></div>`).join("")}</div>`;
  }
  function tipsHtml(list) {
    const shown = list.filter((w) => w.text).slice(0, 3);
    if (!shown.length) return `<div class="es-coach-tips"><div class="es-coach-tip is-good">${esc(t("good"))}</div></div>`;
    return `<div class="es-coach-tips">${shown.map((w) => `<div class="es-coach-tip">${esc(w.text)}</div>`).join("")}</div>`;
  }

  // 1-3. Overview: last round, why you missed, crosshair placement and counter-strafe.
  function overview(view) {
    const h = loadHistory();
    const s = h[h.length - 1];
    if (!s) { view.innerHTML = `<p class="es-coach-note">${esc(t("noData"))}</p>`; return; }
    const w = weaknesses([s]);
    if (s.clean != null && s.clean < 0.9 && !w.some((x) => x.key === "moving")) w.push({ key: "clean", score: 0.1, text: t("tip_clean", Math.round((1 - s.clean) * 100)) });
    view.innerHTML = `<h3>${esc(t("lastRound"))}: ${esc(s.name || t("unknown"))}</h3>${kpis(s)}<h3>${esc(t("whyMiss"))}</h3>${catBars(s)}${tipsHtml(w)}`;
  }

  // 4. Progress charts.
  function progress(view) {
    const h = loadHistory();
    if (!h.length) { view.innerHTML = `<p class="es-coach-note">${esc(t("noData"))}</p>`; return; }
    const names = [...new Map(h.filter((x) => x.code).map((x) => [x.code, x.name || x.code])).entries()];
    view.innerHTML = `<p class="es-coach-note">${esc(t("progressSub"))}</p>
      <div class="es-coach-row"><select class="es-coach-filter"><option value="">${esc(t("all"))} (${h.length} ${esc(t("rounds"))})</option>${names.map(([c, n]) => `<option value="${esc(c)}">${esc(n)}</option>`).join("")}</select>
      <button type="button" class="es-coach-clear">${esc(t("clear"))}</button></div><div class="es-coach-charts"></div>`;
    const sel = view.querySelector(".es-coach-filter");
    const draw = () => {
      const rows = h.filter((x) => !sel.value || x.code === sel.value).slice(-60);
      const box = view.querySelector(".es-coach-charts");
      box.innerHTML = "";
      for (const [label, key, fmt, color, lowerBetter] of [
        [t("acc"), "acc", pctTxt, "#ff4655"], [t("hs"), "hs", pctTxt, "#4ade80"], [t("reaction"), "reaction", msTxt, "#5ce1e6", true],
        [t("placement"), "placement", degTxt, "#ffd25a", true], [t("cleanShots"), "clean", pctTxt, "#c084fc"],
      ]) {
        const pts = rows.filter((r) => key !== "hs" || r.humanoid).map((r) => r[key]).filter((v) => v != null);
        if (!pts.length) continue;
        const h3 = document.createElement("h3");
        h3.textContent = `${label}: ${fmt(pts[pts.length - 1])} ${lowerBetter ? "(↓)" : "(↑)"}`;
        box.appendChild(h3);
        box.appendChild(lineChart(pts, color, key === "reaction" || key === "placement" ? null : [0, 1], fmt));
      }
    };
    sel.addEventListener("change", draw);
    view.querySelector(".es-coach-clear").addEventListener("click", () => { if (confirm(t("clearAsk"))) { saveHistory([]); open(); } });
    draw();
  }
  function lineChart(values, color, range, fmt) {
    const W = 860, H = 120, P = 40, dpr = window.devicePixelRatio || 1;
    const c = document.createElement("canvas");
    c.width = W * dpr; c.height = H * dpr; c.style.width = "100%"; c.style.aspectRatio = `${W}/${H}`;
    const g = c.getContext("2d"); g.scale(dpr, dpr);
    let lo = range ? range[0] : Math.min(...values), hi = range ? range[1] : Math.max(...values);
    if (hi - lo < 1e-6) { hi += 1; lo = Math.max(0, lo - 1); }
    const x = (i) => P + (values.length === 1 ? (W - P - 12) / 2 : (i / (values.length - 1)) * (W - P - 12));
    const y = (v) => H - 14 - ((v - lo) / (hi - lo)) * (H - 28);
    g.strokeStyle = "#ffffff14"; g.lineWidth = 1;
    for (const f of [0, 0.5, 1]) { const yy = H - 14 - f * (H - 28); g.beginPath(); g.moveTo(P, yy); g.lineTo(W - 8, yy); g.stroke(); }
    g.fillStyle = "#9aa1ae"; g.font = "10px Bahnschrift, Segoe UI, sans-serif"; g.textAlign = "right";
    g.fillText(fmt(hi), P - 6, 18); g.fillText(fmt(lo), P - 6, H - 11);
    g.fillStyle = color + "88";
    values.forEach((v, i) => { g.beginPath(); g.arc(x(i), y(v), 2.4, 0, 7); g.fill(); });
    g.strokeStyle = color; g.lineWidth = 2.5; g.beginPath();
    values.forEach((_, i) => { const v = mean(values.slice(Math.max(0, i - 4), i + 1)); i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)); });
    g.stroke();
    return c;
  }

  // 5-6. Training plan and difficulty.
  function plan(view) {
    const h = loadHistory();
    const recent = h.slice(-10);
    if (!recent.length) { view.innerHTML = `<p class="es-coach-note">${esc(t("noData"))}</p>`; return; }
    const w = weaknesses(recent);
    const keys = w.map((x) => (x.key === "high" ? "low" : x.key)).filter((k, i, a) => FOCUS[k] && a.indexOf(k) === i).slice(0, 3);
    for (const k of ["placement", "track", "reaction"]) if (keys.length < 3 && !keys.includes(k)) keys.push(k);
    const steps = [{ title: t("warmup"), code: "d43f842fb33e4d46", min: 3 }];
    keys.forEach((k, i) => steps.push({ title: `${t("focus")}: ${t("plan_" + k)}`, code: FOCUS[k][recent.length % FOCUS[k].length], min: i === 0 ? 5 : 3.5 }));
    const adv = difficultyAdvice(h);
    view.innerHTML = `<p class="es-coach-note">${esc(t("planSub", recent.length))}</p><div class="es-coach-plan">${steps.map((s, i) => `
      <div class="es-coach-step"><span class="es-coach-min">${esc(t("minutes", s.min))}</span><div><b>${i + 1}. ${esc(s.title)}</b><small>${esc(DRILLS[s.code] || s.code)}</small></div>
      <button type="button" class="es-tool-primary" data-code="${esc(s.code)}">${esc(t("start"))}</button></div>`).join("")}</div>
      ${adv ? `<h3>${esc(t("diffTitle"))}</h3><div class="es-coach-tip ${adv.dir === "keep" ? "is-good" : ""}">${esc(adv.text)}${adv.code ? ` <button type="button" class="es-tool-primary" data-code="${esc(adv.code)}">${esc(adv.dir === "up" ? t("harder") : t("easier"))}: ${esc(DRILLS[adv.code] || "")}</button>` : ""}</div>` : ""}
      <h3>${esc(t("whyMiss"))}</h3>${tipsHtml(w)}`;
    view.addEventListener("click", (e) => { const b = e.target.closest("[data-code]"); if (b) startDrill(b.dataset.code); });
  }

  // 7. Spray groups of the last round.
  function spray(view) {
    const bursts = lastRound?.bursts || [];
    view.innerHTML = `<p class="es-coach-note">${esc(t("spraySub"))}</p>`;
    if (!bursts.length) { view.insertAdjacentHTML("beforeend", `<p class="es-coach-note">${esc(t("noBursts"))}</p>`); return; }
    const s = lastRound.sum;
    view.insertAdjacentHTML("beforeend", `<div class="es-coach-kpis"><div class="es-coach-kpi"><span>${esc(t("burstSize"))}</span><b>${degTxt(s.spray)}</b></div><div class="es-coach-kpi"><span>${esc(t("bursts"))}</span><b>${bursts.length}</b></div></div>`);
    const W = 520, H = 420, dpr = window.devicePixelRatio || 1;
    const c = document.createElement("canvas");
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px";
    const g = c.getContext("2d"); g.scale(dpr, dpr);
    let max = 1;
    for (const b of bursts) for (const [x, y] of b.pts) max = Math.max(max, Math.abs(x), Math.abs(y));
    const k = (Math.min(W, H) / 2 - 24) / max, cx = W / 2, cy = H / 2;
    g.strokeStyle = "#ffffff18";
    for (let r = 1; r <= max; r += max > 6 ? 2 : 1) { g.beginPath(); g.arc(cx, cy, r * k, 0, 7); g.stroke(); }
    g.fillStyle = "#9aa1ae"; g.font = "10px Bahnschrift, Segoe UI, sans-serif"; g.fillText(`1° = ${k.toFixed(0)} px`, 8, H - 8);
    bursts.slice(-12).forEach((b, bi, arr) => {
      const alpha = 0.35 + 0.65 * ((bi + 1) / arr.length);
      g.strokeStyle = `rgba(255,70,85,${alpha * 0.6})`; g.lineWidth = 1.2; g.beginPath();
      b.pts.forEach(([x, y], i) => { const px = cx + x * k, py = cy - y * k; i ? g.lineTo(px, py) : g.moveTo(px, py); });
      g.stroke();
      b.pts.forEach(([x, y], i) => { g.fillStyle = i === 0 ? `rgba(255,255,255,${alpha})` : `rgba(255,210,90,${alpha})`; g.beginPath(); g.arc(cx + x * k, cy - y * k, 3, 0, 7); g.fill(); });
    });
    view.appendChild(c);
  }

  // 8. Shot review in slow motion.
  function review(view) {
    const shots = (lastRound?.shots || []).map((s, i) => ({ ...s, i })).filter((s) => s.path && s.path.length > 1);
    if (!shots.length) { view.innerHTML = `<p class="es-coach-note">${esc(t("noShots"))}</p>`; return; }
    shots.sort((a, b) => (a.hit === b.hit ? a.i - b.i : a.hit ? 1 : -1)); // misses first
    view.innerHTML = `<p class="es-coach-note">${esc(t("reviewSub"))}</p><div class="es-coach-review"><div class="es-coach-list"></div><div>
      <canvas class="es-coach-replay"></canvas>
      <div class="es-coach-row"><button type="button" class="es-tool-primary es-coach-play">▶ ${esc(t("play"))}</button>
      <label>${esc(t("speed"))} <select class="es-coach-speed"><option value="0.1">0.1×</option><option value="0.25" selected>0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option></select></label>
      <input type="range" class="es-coach-scrub" min="0" max="1000" value="1000" style="flex:1"></div></div></div>`;
    const list = view.querySelector(".es-coach-list");
    shots.slice(0, 80).forEach((s, n) => {
      const b = document.createElement("button");
      b.type = "button"; b.innerHTML = `<span>#${s.i + 1} ${esc(t("cat_" + s.cat))}</span><span style="color:${CAT_COLOR[s.cat]}">●</span>`;
      b.addEventListener("click", () => select(n));
      list.appendChild(b);
    });
    const c = view.querySelector(".es-coach-replay");
    const W = 420, H = 420, dpr = window.devicePixelRatio || 1;
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px";
    const g = c.getContext("2d"); g.scale(dpr, dpr);
    const scrub = view.querySelector(".es-coach-scrub");
    let shot = null, playing = false, t0 = 0;
    function frame(p) {
      const path = shot.path, start = path[0][2];
      const now = start * (1 - p);
      let max = 1.5;
      for (const [x, y] of path) max = Math.max(max, Math.abs(x), Math.abs(y));
      const k = (W / 2 - 20) / max, cx = W / 2, cy = H / 2;
      g.clearRect(0, 0, W, H);
      g.strokeStyle = "#ffffff14"; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, H); g.moveTo(0, cy); g.lineTo(W, cy); g.stroke();
      g.fillStyle = "#ff465533"; g.strokeStyle = "#ff4655"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, Math.max(4, (shot.rad || 0.3) * k), 0, 7); g.fill(); g.stroke();
      g.strokeStyle = "#ffd25a"; g.lineWidth = 2; g.beginPath();
      let last = null;
      for (const pt of path) { if (pt[2] > now) break; const px = cx + pt[0] * k, py = cy - pt[1] * k; last ? g.lineTo(px, py) : g.moveTo(px, py); last = [px, py]; }
      g.stroke();
      if (last) { g.fillStyle = p >= 1 ? CAT_COLOR[shot.cat] : "#fff"; g.beginPath(); g.arc(last[0], last[1], 5, 0, 7); g.fill(); }
      g.fillStyle = "#c9ced6"; g.font = "13px Bahnschrift, Segoe UI, Tahoma, sans-serif"; g.textAlign = "left";
      g.fillText(`${t("cat_" + shot.cat)} · ${Math.round(now)} ms`, 10, 20);
      g.fillStyle = "#9aa1ae"; g.font = "10px Bahnschrift, Segoe UI, sans-serif";
      g.fillText(`1° = ${k.toFixed(0)} px · ${Math.abs(shot.yawVel)}°/s`, 10, H - 10);
    }
    function select(n) {
      shot = shots[n];
      [...list.children].forEach((b, i) => b.classList.toggle("is-on", i === n));
      playing = false; scrub.value = 1000; frame(1);
    }
    function loop(ts) {
      if (!playing || !shade) return;
      const dur = (-shot.path[0][2] || 600) / parseFloat(view.querySelector(".es-coach-speed").value);
      const p = Math.min(1, (ts - t0) / dur);
      scrub.value = p * 1000; frame(p);
      if (p < 1) anim = requestAnimationFrame(loop); else playing = false;
    }
    view.querySelector(".es-coach-play").addEventListener("click", () => { playing = true; t0 = performance.now(); cancelAnimationFrame(anim); anim = requestAnimationFrame(loop); });
    scrub.addEventListener("input", () => { playing = false; frame(scrub.value / 1000); });
    select(0);
  }

  // 9. Sensitivity lab.
  function sens(view) {
    const h = loadHistory().filter((x) => x.sens > 0);
    const cur0 = currentSens();
    const groups = new Map();
    for (const r of h) { const k = +r.sens.toFixed(3); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
    const rows = [...groups.entries()].map(([s, rs]) => {
      const acc = mean(rs.map((r) => r.acc)), hs = mean(rs.filter((r) => r.humanoid).map((r) => r.hs));
      const flick = mean(rs.map((r) => ((r.cats.over || 0) + (r.cats.under || 0)) / Math.max(1, r.shots)));
      const react = median(rs.map((r) => r.reaction).filter((x) => x != null));
      return { s, n: rs.length, acc, hs, flick, react, score: acc * 100 + (hs ?? 0) * 40 - flick * 60 };
    }).sort((a, b) => a.s - b.s);
    const eligible = rows.filter((r) => r.n >= 3);
    const best = eligible.length ? eligible.reduce((a, b) => (b.score > a.score ? b : a)) : null;
    const ab = cur0 ? [0.85, 1, 1.15].map((f) => +(cur0 * f).toFixed(3)) : [];
    view.innerHTML = `<p class="es-coach-note">${esc(t("sensSub"))}</p>
      <div class="es-coach-kpis"><div class="es-coach-kpi"><span>${esc(t("sensCurrent"))}</span><b>${cur0 ?? "–"}</b></div>
      <div class="es-coach-kpi"><span>${esc(t("sensBest"))}</span><b>${best ? best.s : "–"}</b></div></div>
      ${ab.length ? `<h3>${esc(t("sensTest"))}</h3><div class="es-coach-row">${ab.map((v) => `<button type="button" class="${v === cur0 ? "" : "es-tool-primary"}" data-sens="${v}">${esc(t("sensSet"))} ${v}</button>`).join("")}</div>` : ""}
      <p class="es-coach-note es-coach-sens-status" role="status">${best ? "" : esc(t("sensNeed"))}</p>
      ${rows.length ? `<table class="es-coach-table"><thead><tr><th>Sens</th><th>${esc(t("rounds"))}</th><th>${esc(t("acc"))}</th><th>${esc(t("hs"))}</th><th>${esc(t("cat_over"))} + ${esc(t("cat_under"))}</th><th>${esc(t("reaction"))}</th><th>${esc(t("score"))}</th></tr></thead>
      <tbody>${rows.map((r) => `<tr class="${best && r.s === best.s ? "is-best" : ""}"><td>${r.s}</td><td>${r.n}</td><td>${pctTxt(r.acc)}</td><td>${pctTxt(r.hs)}</td><td>${pctTxt(r.flick)}</td><td>${msTxt(r.react)}</td><td>${Math.round(r.score)}</td></tr>`).join("")}</tbody></table>` : `<p class="es-coach-note">${esc(t("noData"))}</p>`}`;
    view.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sens]");
      if (!b) return;
      const status = view.querySelector(".es-coach-sens-status");
      const input = document.querySelector(".hall-sens input");
      if (!input) { status.textContent = t("sensSetFail"); return; }
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, b.dataset.sens);
      for (const type of ["input", "change"]) input.dispatchEvent(new Event(type, { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      input.blur();
      status.textContent = t("sensSetDone", b.dataset.sens);
      setTimeout(() => { if (shade) open("sens"); }, 600);
    });
  }

  // ---------- round summary card ----------
  let card = null;
  function hideRoundCard() { card?.remove(); card = null; }
  function showRoundCard(s) {
    hideRoundCard();
    if (!document.querySelector(".al-aimlab-root")) return;
    const w = weaknesses([s]);
    const top = w.find((x) => x.text);
    const adv = difficultyAdvice(loadHistory());
    card = document.createElement("aside");
    card.className = "es-coach-card";
    const k = [[t("acc"), pctTxt(s.acc)], s.humanoid ? [t("hs"), pctTxt(s.hs)] : [t("reaction"), msTxt(s.reaction)], [t("cleanShots"), pctTxt(s.clean)]];
    card.innerHTML = `<h4><span>${esc(t("roundDone"))}</span><button type="button" aria-label="${esc(t("close"))}">✕</button></h4>
      <div class="es-coach-kpis">${k.map(([a, b]) => `<div class="es-coach-kpi"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join("")}</div>
      <p>${esc(top ? top.text : t("good"))}</p>${adv && adv.dir !== "keep" ? `<p>${esc(adv.text)}</p>` : ""}
      <div class="es-coach-row"><button type="button" class="es-tool-primary" data-open>${esc(t("openCoach"))}</button>
      ${adv?.code ? `<button type="button" data-code="${esc(adv.code)}">${esc(adv.dir === "up" ? t("harder") : t("easier"))}</button>` : ""}</div>`;
    card.querySelector("h4 button").addEventListener("click", hideRoundCard);
    card.querySelector("[data-open]").addEventListener("click", () => { hideRoundCard(); open("overview"); });
    card.querySelector("[data-code]")?.addEventListener("click", (e) => startDrill(e.currentTarget.dataset.code));
    for (const type of ["mousedown", "keydown"]) card.addEventListener(type, (e) => e.stopPropagation());
    document.body.appendChild(card);
  }

  // Close the round when the game stops sending frames (results, menu) or the round view goes away.
  setInterval(() => {
    const inRound = !!document.querySelector(".al-aimlab-root");
    if (!inRound) { if (cur && !cur.finalized) finalize(); hideRoundCard(); cur = null; return; }
    const now = performance.now();
    if (cur && !cur.finalized && stoppedSince && now - stoppedSince > 1200) finalize();
    if (cur && !cur.finalized && !stoppedSince && lastFrameAt && now - lastFrameAt > 2500) finalize();
  }, 400);

  // A drill picked in the coach while a round was open: start it once the lobby is back.
  {
    const m = /coach-start=([0-9a-f]{16})/.exec(location.hash);
    if (m) { history.replaceState(null, "", location.pathname + location.search); startDrill(m[1]); }
  }

  window.__aimCoach = { open, close: closePanel, startDrill, history: loadHistory, label: () => t("coach"), title: () => t("coachBtn") };
})();
