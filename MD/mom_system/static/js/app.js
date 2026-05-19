// ─── State ────────────────────────────────────────────────────────────────────
let allMeetings = [];
let currentMeeting = null;
let currentFilter = "All";

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("f-date").value = new Date().toISOString().split("T")[0];
  loadAll();
});

async function loadAll() {
  await loadStats();
  await loadMeetings();
}

// ─── Tab Switching ────────────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(`tab-${name}`).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => {
    if (b.textContent.toLowerCase().includes(name)) b.classList.add("active");
  });
  if (name === "tasks") renderTasks();
}

// ─── Load Stats ───────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch("/api/stats");
    const data = await res.json();
    document.getElementById("stat-total").textContent = data.total_meetings;
    document.getElementById("stat-tasks").textContent = data.total_tasks;
    document.getElementById("stat-done").textContent = data.completed;
    document.getElementById("stat-pending").textContent = data.pending;
  } catch (e) { console.error("Stats error:", e); }
}

// ─── Load Meetings ────────────────────────────────────────────────────────────
async function loadMeetings() {
  try {
    const res = await fetch("/api/meetings");
    allMeetings = await res.json();
    renderRecent();
    renderTable();
    document.getElementById("meetings-sub").textContent =
      `${allMeetings.length} meetings • Click "View" to see the generated MoM`;
  } catch (e) { console.error("Load error:", e); }
}

// ─── Render Recent (Dashboard) ────────────────────────────────────────────────
function renderRecent() {
  const el = document.getElementById("recent-list");
  const recent = allMeetings.slice(0, 5);
  if (recent.length === 0) {
    el.innerHTML = `<div class="empty-state">No meetings yet — create your first one!</div>`;
    return;
  }
  el.innerHTML = recent.map(m => `
    <div class="recent-item">
      <div>
        <div class="recent-title">${m.title}</div>
        <div class="recent-meta">📅 ${m.date} &nbsp;|&nbsp; 👥 ${m.participants}</div>
      </div>
      <div class="recent-badges">
        <span class="badge badge-ai">${m.meeting_type}</span>
        <span class="badge ${m.status === 'done' ? 'badge-done' : 'badge-pending'}">${m.status === 'done' ? '✓ Done' : '⏳ Pending'}</span>
      </div>
    </div>
  `).join("");
}

// ─── Render Table (Meetings Tab) ──────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("meetings-tbody");
  const filtered = currentFilter === "All"
    ? allMeetings
    : allMeetings.filter(m => m.meeting_type === currentFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No meetings found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((m, i) => `
    <tr>
      <td class="td-num">${String(i + 1).padStart(2, "0")}</td>
      <td>
        <div class="td-title">${m.title}</div>
        <div class="td-sub">${(m.action_items || []).length} action items</div>
      </td>
      <td class="td-muted">${m.date}</td>
      <td><span class="badge badge-ai" style="font-size:10px">${m.meeting_type}</span></td>
      <td class="td-muted" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.participants}</td>
      <td><span class="badge ${m.status === 'done' ? 'badge-done' : 'badge-pending'}">${m.status === 'done' ? '✓ Done' : '⏳'}</span></td>
      <td>
        <div class="action-btns">
          <button class="view-btn" onclick="viewMeeting(${m.id})">👁 View</button>
          <button class="del-btn" onclick="deleteMeeting(${m.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// ─── Filter Meetings ──────────────────────────────────────────────────────────
function filterMeetings(type, btn) {
  currentFilter = type;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderTable();
}

// ─── Render Tasks Tab ─────────────────────────────────────────────────────────
function renderTasks() {
  const el = document.getElementById("tasks-list");
  const allTasks = allMeetings.flatMap(m =>
    (m.action_items || []).map(a => ({ ...a, meetingTitle: m.title, meetingDate: m.date }))
  );
  const order = { high: 0, medium: 1, low: 2 };
  allTasks.sort((a, b) => (order[a.priority] || 2) - (order[b.priority] || 2));

  document.getElementById("tasks-sub").textContent =
    `${allTasks.length} tasks across ${allMeetings.length} meetings`;

  if (allTasks.length === 0) {
    el.innerHTML = `<div class="glass-card empty-state" style="padding:40px">No tasks yet — generate a MoM first!</div>`;
    return;
  }

  el.innerHTML = allTasks.map(t => `
    <div class="task-card ${t.priority || 'medium'}">
      <div>
        <div class="task-title">${t.task}</div>
        <div class="task-meta">
          <span>👤 ${t.owner}</span>
          <span>⏰ ${t.deadline}</span>
          <span class="task-meeting">📋 ${t.meetingTitle}</span>
        </div>
      </div>
      <span class="badge badge-${t.priority || 'medium'}">${t.priority || 'medium'}</span>
    </div>
  `).join("");
}

// ─── Form Open/Close ──────────────────────────────────────────────────────────
function openForm() {
  document.getElementById("form-modal").classList.add("open");
  document.getElementById("form-error").style.display = "none";
}
function closeForm() {
  document.getElementById("form-modal").classList.remove("open");
  clearForm();
}
function closeFormOutside(e) {
  if (e.target.id === "form-modal") closeForm();
}
function clearForm() {
  ["f-title", "f-participants", "f-agenda", "f-discussion"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("f-date").value = new Date().toISOString().split("T")[0];
  document.getElementById("f-type").value = "Project Discussion";
}

// ─── Generate MoM ─────────────────────────────────────────────────────────────
async function generateMoM() {
  const title = document.getElementById("f-title").value.trim();
  const date = document.getElementById("f-date").value;
  const meeting_type = document.getElementById("f-type").value;
  const participants = document.getElementById("f-participants").value.trim();
  const agenda = document.getElementById("f-agenda").value.trim();
  const discussion = document.getElementById("f-discussion").value.trim();

  const errEl = document.getElementById("form-error");
  if (!title || !participants || !discussion) {
    errEl.textContent = "⚠ Please fill Title, Participants, and Discussion Notes.";
    errEl.style.display = "block";
    return;
  }

  const btn = document.getElementById("generate-btn");
  btn.disabled = true;
  btn.innerHTML = `<span class="loader"></span> AI Generating...`;
  errEl.style.display = "none";

  try {
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date, meeting_type, participants, agenda, discussion }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");

    closeForm();
    await loadAll();

    // Auto open the new meeting
    const newMeeting = allMeetings[0];
    if (newMeeting) viewMeeting(newMeeting.id);

  } catch (e) {
    errEl.textContent = `❌ ${e.message}`;
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.innerHTML = "⭐ Generate MoM";
  }
}

// ─── View MoM ─────────────────────────────────────────────────────────────────
async function viewMeeting(id) {
  try {
    const res = await fetch(`/api/meetings/${id}`);
    const m = await res.json();
    currentMeeting = m;

    document.getElementById("view-type").textContent = m.meeting_type;
    document.getElementById("view-title").textContent = m.title;
    document.getElementById("view-meta").textContent = `📅 ${m.date}   👥 ${m.participants}`;

    const content = document.getElementById("view-content");
    const priorityColor = { high: "#f06565", medium: "#f7c948", low: "#4ade80" };

    content.innerHTML = `
      ${m.summary ? `
      <div class="view-section">
        <div class="view-section-title">📋 Summary</div>
        <div class="view-summary">${m.summary}</div>
      </div>` : ""}

      ${(m.decisions || []).length > 0 ? `
      <div class="view-section">
        <div class="view-section-title">⚡ Key Decisions</div>
        ${m.decisions.map((d, i) => `
          <div class="decision-item">
            <div class="decision-num">${i + 1}</div>
            <span style="font-size:14px;line-height:1.6">${d}</span>
          </div>`).join("")}
      </div>` : ""}

      ${(m.action_items || []).length > 0 ? `
      <div class="view-section">
        <div class="view-section-title">✅ Action Items</div>
        ${m.action_items.map(a => `
          <div class="action-item-card">
            <div>
              <div class="ai-task">${a.task}</div>
              <div class="ai-meta">👤 ${a.owner} &nbsp;|&nbsp; ⏰ ${a.deadline}</div>
            </div>
            <span class="badge badge-${a.priority || 'medium'}">${a.priority || 'medium'}</span>
          </div>`).join("")}
      </div>` : ""}

      ${(m.highlights || []).length > 0 ? `
      <div class="view-section">
        <div class="view-section-title">💡 Key Highlights</div>
        <div class="highlights-wrap">
          ${m.highlights.map(h => `<span class="highlight-tag">✦ ${h}</span>`).join("")}
        </div>
      </div>` : ""}

      ${m.next_meeting ? `
      <div class="view-section">
        <div class="view-section-title">📅 Next Meeting</div>
        <div class="next-meeting">→ ${m.next_meeting}</div>
      </div>` : ""}
    `;

    document.getElementById("view-modal").classList.add("open");
  } catch (e) { alert("Failed to load meeting details"); }
}

function closeView() {
  document.getElementById("view-modal").classList.remove("open");
  currentMeeting = null;
}
function closeViewOutside(e) {
  if (e.target.id === "view-modal") closeView();
}

// ─── Export MoM ───────────────────────────────────────────────────────────────
function exportMoM() {
  if (!currentMeeting) return;
  const m = currentMeeting;
  const lines = [
    "MINUTES OF MEETING",
    "==================",
    `Title      : ${m.title}`,
    `Date       : ${m.date}`,
    `Type       : ${m.meeting_type}`,
    `Participants: ${m.participants}`,
    "",
    "SUMMARY",
    "-------",
    m.summary || "",
    "",
    "KEY DECISIONS",
    "-------------",
    ...(m.decisions || []).map((d, i) => `${i + 1}. ${d}`),
    "",
    "ACTION ITEMS",
    "------------",
    ...(m.action_items || []).map(a =>
      `• [${(a.priority || "medium").toUpperCase()}] ${a.task}\n  Owner: ${a.owner} | Deadline: ${a.deadline}`
    ),
    "",
    "KEY HIGHLIGHTS",
    "--------------",
    ...(m.highlights || []).map(h => `• ${h}`),
    "",
    m.next_meeting ? `NEXT MEETING\n------------\n${m.next_meeting}` : "",
    "",
    "---",
    "Generated by MoM AI System — Ctrl+Elite | DSEC Perambalur",
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `MoM_${m.title.replace(/\s+/g, "_")}_${m.date}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Delete Meeting ───────────────────────────────────────────────────────────
async function deleteMeeting(id) {
  if (!confirm("Delete this meeting and its MoM?")) return;
  try {
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    await loadAll();
    renderTasks();
  } catch (e) { alert("Delete failed"); }
}
