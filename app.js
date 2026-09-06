
const TASKS = [
  { id: "water", label: "Попил воды", emoji: "💧" },
  { id: "exercise", label: "Сделал зарядку", emoji: "🏃" },
  { id: "teeth", label: "Почистил зубы", emoji: "🪥" },
  { id: "no_phone", label: "1 час без телефона", emoji: "📵" },
  { id: "food", label: "Поел", emoji: "🍳" },
];

const STORAGE_KEY = "morningRoutineDataV1";
const SETTINGS_KEY = "morningRoutineSettingsV1";

let data = loadData();
let settings = loadSettings();

const $ = (id) => document.getElementById(id);

function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyDay() {
  return Object.fromEntries(TASKS.map(t => [t.id, false]));
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { days: {}, updatedAt: 0 };
  } catch {
    return { days: {}, updatedAt: 0 };
  }
}

function saveData() {
  data.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
  syncPushDebounced();
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSettingsLocal() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function ensureToday() {
  const key = localDateKey();
  if (!data.days[key]) {
    data.days[key] = emptyDay();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  return key;
}

function formatRuDate(key, long = true) {
  const [y,m,d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", long
    ? { weekday: "short", day: "numeric", month: "long" }
    : { day: "numeric", month: "short" }
  ).format(new Date(y, m-1, d));
}

function countDone(day) {
  return TASKS.reduce((n,t) => n + (day?.[t.id] ? 1 : 0), 0);
}

function calculateStreak() {
  let streak = 0;
  const cursor = new Date();
  // If today isn't perfect, streak continues from yesterday.
  const todayKey = localDateKey(cursor);
  if (countDone(data.days[todayKey]) < 5) cursor.setDate(cursor.getDate()-1);
  for (let i=0;i<3650;i++) {
    const key = localDateKey(cursor);
    if (countDone(data.days[key]) === 5) {
      streak++;
      cursor.setDate(cursor.getDate()-1);
    } else break;
  }
  return streak;
}

function toggleTask(id) {
  const key = ensureToday();
  data.days[key][id] = !data.days[key][id];
  saveData();
}

function renderToday() {
  const key = ensureToday();
  const day = data.days[key];
  const done = countDone(day);

  $("todayLabel").textContent = new Intl.DateTimeFormat("ru-RU", {
    weekday:"long", day:"numeric", month:"long"
  }).format(new Date());

  $("doneCount").textContent = done;
  $("streakCount").textContent = calculateStreak();
  $("progressFill").style.width = `${done / 5 * 100}%`;
  $("completionNote").hidden = done !== 5;

  $("taskList").innerHTML = TASKS.map(t => `
    <button class="task ${day[t.id] ? "done" : ""}" data-task="${t.id}">
      <span class="check">${day[t.id] ? "✓" : ""}</span>
      <span class="task-emoji">${t.emoji}</span>
      <span class="task-name">${t.label}</span>
    </button>
  `).join("");

  document.querySelectorAll("[data-task]").forEach(btn => {
    btn.addEventListener("click", () => toggleTask(btn.dataset.task));
  });
}

function renderHistory() {
  const keys = Object.keys(data.days).sort().reverse();
  const list = $("historyList");

  if (!keys.length) {
    list.innerHTML = `<div class="subtle">Пока нет истории.</div>`;
    return;
  }

  list.innerHTML = keys.map((key, idx) => {
    const day = data.days[key];
    const score = countDone(day);
    const open = idx < 3 ? "open" : "";
    return `
      <details class="day-card" ${open}>
        <summary>
          <span class="day-title">${formatRuDate(key)}</span>
          <span class="score-pill">${score}/5</span>
        </summary>
        <div class="day-items">
          ${TASKS.map(t => `
            <div class="day-item ${day[t.id] ? "ok" : ""}">
              <span class="mini-check">${day[t.id] ? "✓" : ""}</span>
              <span>${t.emoji} ${t.label}</span>
            </div>
          `).join("")}
        </div>
      </details>
    `;
  }).join("");
}

function lastNDays(n) {
  const arr = [];
  const d = new Date();
  for (let i=n-1;i>=0;i--) {
    const x = new Date(d);
    x.setDate(d.getDate()-i);
    arr.push(localDateKey(x));
  }
  return arr;
}

function renderStats() {
  const days30 = lastNDays(30);
  const scores = days30.map(k => countDone(data.days[k]));
  const perfect = scores.filter(x => x === 5).length;
  const rate = Math.round(scores.reduce((a,b)=>a+b,0) / (30*5) * 100);

  $("statPerfect").textContent = perfect;
  $("statRate").textContent = `${rate}%`;

  $("heatmap").innerHTML = days30.map(k => {
    const score = countDone(data.days[k]);
    return `<div class="heat" data-level="${score}" data-tip="${formatRuDate(k,false)} · ${score}/5"></div>`;
  }).join("");

  $("habitStats").innerHTML = TASKS.map(t => {
    const done = days30.filter(k => data.days[k]?.[t.id]).length;
    const pct = Math.round(done/30*100);
    return `
      <div class="habit-row">
        <div class="habit-label">${t.emoji} ${t.label}</div>
        <div class="subtle">${pct}%</div>
        <div class="habit-bar"><div style="width:${pct}%"></div></div>
      </div>
    `;
  }).join("");
}

function renderAll() {
  renderToday();
  renderHistory();
  renderStats();
}

// Navigation
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".view").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.view).classList.add("active");
  });
});

// Settings dialog
$("settingsBtn").addEventListener("click", () => {
  $("supabaseUrl").value = settings.url || "";
  $("supabaseKey").value = settings.key || "";
  $("syncId").value = settings.syncId || "";
  setSyncStatus(settings.url && settings.key && settings.syncId ? "Sync подключен." : "Работает локально на этом устройстве.");
  $("settingsDialog").showModal();
});

$("saveSettingsBtn").addEventListener("click", async () => {
  settings = {
    url: $("supabaseUrl").value.trim().replace(/\/$/,""),
    key: $("supabaseKey").value.trim(),
    syncId: $("syncId").value.trim()
  };
  saveSettingsLocal();
  if (!isSyncReady()) {
    setSyncStatus("Заполни все 3 поля для синхронизации.");
    return;
  }
  setSyncStatus("Подключаю…");
  try {
    await syncPull(true);
    setSyncStatus("Готово. Данные синхронизированы.");
  } catch(e) {
    setSyncStatus("Ошибка: " + (e.message || e));
  }
});

$("disconnectBtn").addEventListener("click", () => {
  settings = {};
  saveSettingsLocal();
  $("supabaseUrl").value = "";
  $("supabaseKey").value = "";
  $("syncId").value = "";
  setSyncStatus("Sync отключен. Локальные данные сохранены.");
});

function setSyncStatus(msg) {
  $("syncStatus").textContent = msg;
}

function isSyncReady() {
  return !!(settings.url && settings.key && settings.syncId);
}

async function supabaseFetch(path, options={}) {
  const res = await fetch(`${settings.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": settings.key,
      "Authorization": `Bearer ${settings.key}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`.slice(0,240));
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function syncPull(forceMerge=false) {
  if (!isSyncReady()) return;
  const rows = await supabaseFetch(`routine_state?sync_id=eq.${encodeURIComponent(settings.syncId)}&select=*`);
  const remote = rows?.[0];

  if (!remote) {
    await syncPush();
    return;
  }

  const remoteData = remote.payload || { days:{}, updatedAt:0 };
  // Merge day-by-day, prefer latest whole local/remote state if timestamps differ.
  // For simple single-user routine this avoids losing history from either device.
  const mergedDays = { ...(remoteData.days || {}), ...(data.days || {}) };
  data = {
    days: mergedDays,
    updatedAt: Math.max(remoteData.updatedAt || 0, data.updatedAt || 0)
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();

  if (forceMerge) await syncPush();
}

async function syncPush() {
  if (!isSyncReady()) return;
  const payload = {
    sync_id: settings.syncId,
    payload: data,
    updated_at: new Date().toISOString()
  };
  await supabaseFetch(`routine_state?on_conflict=sync_id`, {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload)
  });
}

let syncTimer;
function syncPushDebounced() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncPush().catch(()=>{}), 450);
}

window.addEventListener("focus", () => syncPull().catch(()=>{}));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") syncPull().catch(()=>{});
});

// PWA registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}

ensureToday();
renderAll();
syncPull().catch(()=>{});
