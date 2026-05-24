const pages = [
  { id: "dashboard", label: "Analytics", title: "Dashboard tổng quan", icon: "monitoring" },
  { id: "notes", label: "Notes", title: "Ghi chu", icon: "sticky_note_2" },
  { id: "documents", label: "Tài liệu", title: "Tài liệu", icon: "folder_copy" },
  { id: "ideas", label: "Idea", title: "Idea", icon: "lightbulb" },
  { id: "content", label: "Plan Content", title: "Kế hoạch nội dung", icon: "edit_calendar" },
  { id: "calendar", label: "Calendar", title: "Lịch triển khai", icon: "calendar_month" },
  { id: "clock", label: "Clock", title: "Dong ho", icon: "schedule" },
  { id: "ads", label: "Ads Tool", title: "Công cụ tạo tên Ads", icon: "campaign" },
  { id: "tasks", label: "Tasks", title: "Quản lý công việc", icon: "checklist" },
  { id: "prompts", label: "Prompts", title: "Thư viện Prompt AI", icon: "terminal" },
];

const levelOrder = ["chapter", "lesson", "section", "item"];
const levelLabels = {
  course: "Tên khóa",
  chapter: "Chương",
  lesson: "Bài",
  section: "Mục 1/2/3",
  item: "Mục a/b/c hoặc đoạn",
};

let knowledgeDocumentsChanged = false;

function knowledgeSeedDocuments() {
  return Array.isArray(window.TA_KNOWLEDGE_DOCUMENTS) ? window.TA_KNOWLEDGE_DOCUMENTS : [];
}

function mergeKnowledgeDocuments(documents = []) {
  const merged = [...(documents || [])];
  const existing = new Set(merged.map((documentItem) => documentItem.id || documentItem.title));
  knowledgeSeedDocuments().forEach((documentItem) => {
    const key = documentItem.id || documentItem.title;
    if (!existing.has(key)) {
      merged.push({ ...documentItem });
      existing.add(key);
      knowledgeDocumentsChanged = true;
    }
  });
  return merged;
}

const state = {
  page: localStorage.getItem("ta.page") || "dashboard",
  search: "",
  taskFilter: "today",
  promptFilter: "all",
  ideaFormOpen: false,
  documentPanelOpen: false,
  documentFocusMode: false,
  zoom: Number(localStorage.getItem("ta.zoom") || 1.08),
  countdownTotal: Number(localStorage.getItem("ta.countdownTotal") || 25 * 60),
  countdownRemaining: Number(localStorage.getItem("ta.countdownRemaining") || 25 * 60),
  countdownRunning: false,
  stopwatchElapsed: Number(localStorage.getItem("ta.stopwatchElapsed") || 0),
  stopwatchRunning: false,
  stopwatchStartedAt: 0,
  stopwatchBase: 0,
  selectedCourseId: localStorage.getItem("ta.selectedCourseId") || "",
  courseDraftMode: "list",
  courseFocus: false,
  courseReadMode: false,
  selectedNoteId: localStorage.getItem("ta.selectedNoteId") || "",
  selectedDocumentId: localStorage.getItem("ta.selectedDocumentId") || "",
  authUser: null,
  authReady: false,
  tasks: readStore("ta.tasks", seedTasks()),
  prompts: readStore("ta.prompts", seedPrompts()),
  alarms: readStore("ta.alarms", []),
  courses: normalizeCourses(readStore("ta.courses", seedCourses())),
  notes: readStore("ta.notes", seedNotes()),
  documents: mergeKnowledgeDocuments(readStore("ta.documents", seedDocuments())),
  ideas: readStore("ta.ideas", seedIdeas()),
  contentPlans: readStore("ta.contentPlans", seedContentPlans()),
};

const app = document.querySelector("#app");
const nav = document.querySelector("#nav");
const pageTitle = document.querySelector("#pageTitle");
const searchInput = document.querySelector("#globalSearch");
const toast = document.querySelector("#toast");
const zoomValue = document.querySelector("#zoomValue");

if (!state.selectedCourseId && state.courses[0]) state.selectedCourseId = state.courses[0].id;
if (!state.selectedNoteId && state.notes[0]) state.selectedNoteId = state.notes[0].id;
if (!pages.some((page) => page.id === state.page)) state.page = "dashboard";

const remoteStateTable = "app_state";
let remoteStateId = "local-default";
let supabaseClient = null;
let remoteSaveTimer = null;
let remoteReady = false;
let remoteLoading = false;
let remoteErrorShown = false;
let documentSelectionRange = null;

function seedTasks() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Thiết kế landing page chiến dịch AI",
      description: "Phát triển wireframe và UI design cho chiến dịch quảng bá bộ công cụ AI Marketing mới.",
      due: "2026-05-20",
      priority: "High",
      status: "today",
      done: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Viết 5 mẫu quảng cáo remarketing",
      description: "Tập trung vào nhóm học viên đã xem webinar nhưng chưa đăng ký.",
      due: "2026-05-22",
      priority: "Medium",
      status: "upcoming",
      done: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Kiểm tra báo cáo doanh thu tuần",
      description: "Đối soát chi phí ads, số lead và doanh thu theo từng phễu.",
      due: "2026-05-14",
      priority: "Low",
      status: "completed",
      done: true,
    },
  ];
}

function seedPrompts() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Xây dựng kế hoạch nội dung 30 ngày",
      category: "Content",
      body: "Hãy lập kế hoạch nội dung 30 ngày cho [thương hiệu], gồm chủ đề, hook, định dạng, kênh đăng và CTA.",
      favorite: true,
    },
    {
      id: crypto.randomUUID(),
      title: "Phân tích chân dung khách hàng",
      category: "Marketing",
      body: "Đóng vai strategist. Phân tích nhóm khách hàng mục tiêu cho [sản phẩm], nêu pain point, động lực mua và thông điệp phù hợp.",
      favorite: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Viết angle quảng cáo Facebook",
      category: "Ads",
      body: "Tạo 12 angle quảng cáo Facebook cho [sản phẩm/dịch vụ], chia theo vấn đề, kết quả mong muốn, social proof và ưu đãi giới hạn.",
      favorite: false,
    },
  ];
}

function seedCourses() {
  return [
    {
      id: crypto.randomUUID(),
      level: "course",
      title: "AI Marketing Mastery",
      description: "Khóa học giúp marketer xây dựng hệ thống nội dung, ads và automation bằng AI.",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
      children: [
        {
          id: crypto.randomUUID(),
          level: "chapter",
          title: "Chương 1: Chiến lược nền tảng",
          description: "Làm rõ mục tiêu, chân dung khách hàng và bản đồ nội dung.",
          children: [
            { id: crypto.randomUUID(), level: "lesson", title: "Bài 1: Nền tảng chiến lược AI Marketing", description: "", type: "Bài học", minutes: 28, children: [] },
            { id: crypto.randomUUID(), level: "lesson", title: "Bài 2: Xây thư viện prompt vận hành", description: "", type: "Workshop", minutes: 42, children: [] },
          ],
        },
      ],
    },
  ];
}

function seedNotes() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Ý tưởng chiến dịch",
      body: "Viết nhanh các ý tưởng, hook, checklist hoặc việc cần nhớ ở đây.",
      color: "yellow",
      pinned: true,
    },
    {
      id: crypto.randomUUID(),
      title: "Việc cần xem lại",
      body: "Kiểm tra prompt, lịch content và tên ads trước khi chạy.",
      color: "blue",
      pinned: false,
    },
  ];
}

function seedContentPlans() {
  return [
    { id: crypto.randomUUID(), date: "2026-05-18", channel: "Facebook", topic: "Case study học viên", courseId: "", status: "Draft" },
    { id: crypto.randomUUID(), date: "2026-05-20", channel: "TikTok", topic: "Hook video AI Marketing", courseId: "", status: "Scheduled" },
  ];
}

function seedDocuments() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Giáo trình AI Growth System",
      type: "Giao trinh",
      color: "blue",
      summary: "Khung Attract, Grow, Scale, CRM/Data để lưu tài liệu AI tạo ra và mở đọc ngay trong app.",
      sourceUrl: "",
      content: "<h2>AI Growth System</h2><p>Lưu giáo trình, checklist, SOP hoặc tài liệu AI đã xuất sang app ở đây.</p><ul><li>Attract: kênh thu hút khách hàng</li><li>Grow: chuyển đổi và nuôi dưỡng</li><li>Scale: mở rộng vận hành</li><li>CRM/Data: dữ liệu và chăm sóc lại</li></ul>",
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: "Bảng theo dõi tài liệu",
      type: "Sheet",
      color: "green",
      summary: "Có thể lưu link Google Sheet, CSV hoặc bảng dữ liệu để mở lại nhanh.",
      sourceUrl: "https://docs.google.com/spreadsheets/",
      content: "<p>Dán link sheet vào ô nguồn, hoặc ghi chú cấu trúc bảng cần dùng ở đây.</p>",
      updatedAt: new Date().toISOString(),
    },
  ];
}

function seedIdeas() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Swipe file landing page AI",
      url: "https://app.theanhmarketing.com/",
      note: "Lưu các link tham khảo, tiêu đề và thumbnail nhỏ để dùng lại khi brainstorm.",
      createdAt: new Date().toISOString(),
    },
  ];
}

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  scheduleRemoteSave();
}

function getSupabaseConfig() {
  const config = window.SUPABASE_CONFIG || {};
  const url = String(config.url || "").trim();
  const publishableKey = String(config.publishableKey || "").trim();
  const hasProjectUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && !url.includes("your-project-ref");
  const hasPublishableKey = publishableKey.startsWith("sb_publishable_") || publishableKey.startsWith("eyJ");
  if (!hasProjectUrl || !hasPublishableKey) return null;
  return { url, publishableKey };
}

function collectRemoteState() {
  return {
    tasks: state.tasks,
    prompts: state.prompts,
    alarms: state.alarms,
    courses: state.courses,
    notes: state.notes,
    documents: state.documents,
    ideas: state.ideas,
    contentPlans: state.contentPlans,
    selectedCourseId: state.selectedCourseId,
    selectedDocumentId: state.selectedDocumentId,
  };
}

function applyRemoteState(payload) {
  if (!payload || typeof payload !== "object") return false;
  remoteLoading = true;
  if (Array.isArray(payload.tasks)) state.tasks = payload.tasks;
  if (Array.isArray(payload.prompts)) state.prompts = payload.prompts;
  if (Array.isArray(payload.alarms)) state.alarms = payload.alarms;
  if (Array.isArray(payload.courses)) state.courses = normalizeCourses(payload.courses);
  if (Array.isArray(payload.notes)) state.notes = payload.notes;
  if (Array.isArray(payload.documents)) state.documents = mergeKnowledgeDocuments(payload.documents);
  if (Array.isArray(payload.ideas)) state.ideas = payload.ideas;
  if (Array.isArray(payload.contentPlans)) state.contentPlans = payload.contentPlans;
  if (typeof payload.selectedCourseId === "string") state.selectedCourseId = payload.selectedCourseId;
  if (typeof payload.selectedDocumentId === "string") state.selectedDocumentId = payload.selectedDocumentId;
  if (!state.selectedCourseId && state.courses[0]) state.selectedCourseId = state.courses[0].id;
  if (!state.selectedDocumentId && state.documents[0]) state.selectedDocumentId = state.documents[0].id;
  localStorage.setItem("ta.tasks", JSON.stringify(state.tasks));
  localStorage.setItem("ta.prompts", JSON.stringify(state.prompts));
  localStorage.setItem("ta.alarms", JSON.stringify(state.alarms));
  localStorage.setItem("ta.courses", JSON.stringify(state.courses));
  localStorage.setItem("ta.notes", JSON.stringify(state.notes));
  localStorage.setItem("ta.documents", JSON.stringify(state.documents));
  localStorage.setItem("ta.ideas", JSON.stringify(state.ideas));
  localStorage.setItem("ta.contentPlans", JSON.stringify(state.contentPlans));
  localStorage.setItem("ta.selectedCourseId", state.selectedCourseId);
  localStorage.setItem("ta.selectedDocumentId", state.selectedDocumentId);
  remoteLoading = false;
  return true;
}

async function initSupabase() {
  const config = getSupabaseConfig();
  if (!config) {
    state.authReady = true;
    showToast("Supabase chua co URL that, dang luu local");
    return false;
  }
  if (!window.supabase?.createClient) {
    state.authReady = true;
    showToast("Chua tai duoc Supabase, dang luu local");
    return false;
  }
  supabaseClient = window.supabase.createClient(config.url, config.publishableKey);
  const { data } = await supabaseClient.auth.getSession();
  setAuthUser(data?.session?.user || null);
  state.authReady = true;
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    setAuthUser(session?.user || null);
    remoteReady = false;
    remoteErrorShown = false;
    if (state.authUser) {
      loadRemoteState();
    }
    render();
  });
  return true;
}

function setAuthUser(user) {
  state.authUser = user;
  remoteStateId = user?.id || "local-default";
}

async function loadRemoteState() {
  if (!supabaseClient || !state.authUser) return;
  const { data, error } = await supabaseClient
    .from(remoteStateTable)
    .select("payload")
    .eq("id", remoteStateId)
    .maybeSingle();

  if (error) {
    showToast("Chua doc duoc Supabase, dang luu local");
    return;
  }

  remoteReady = true;
  knowledgeDocumentsChanged = false;
  if (data?.payload && applyRemoteState(data.payload)) {
    if (knowledgeDocumentsChanged) saveRemoteState();
    render();
    return;
  }
  saveRemoteState();
}

function scheduleRemoteSave() {
  if (!remoteReady || remoteLoading) return;
  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = window.setTimeout(saveRemoteState, 700);
}

async function saveRemoteState() {
  if (!supabaseClient || remoteLoading || !state.authUser) return;
  const { error } = await supabaseClient.from(remoteStateTable).upsert({
    id: remoteStateId,
    payload: collectRemoteState(),
    updated_at: new Date().toISOString(),
  });
  if (error && !remoteErrorShown) {
    remoteErrorShown = true;
    showToast("Chua luu duoc len Supabase");
  }
}

function normalizeCourses(courses) {
  return (courses || []).map((course) => {
    if (course.content !== undefined || course.toc) {
      return {
        ...course,
        level: "course",
        content: course.content || "",
        toc: course.toc || [],
        children: [],
      };
    }
    if (course.children) {
      const chapters = normalizeNodes(course.children).map((node, index) => nodeToChapter(node, index));
      return {
        ...course,
        level: "course",
        content: course.content || chapters.map((chapter) => [chapter.title, chapter.body, chapter.summary, chapter.materials].filter(Boolean).join("\n")).join("\n\n"),
        toc: course.toc || chapters.map((chapter) => ({ id: chapter.id || crypto.randomUUID(), level: "chapter", title: chapter.title || `Chương ${index + 1}`, parentId: "" })),
        children: [],
      };
    }
    if (course.modules) {
      return {
        id: course.id || crypto.randomUUID(),
        level: "course",
        title: course.title || "Khóa học mới",
        description: course.description || "",
        image: course.image || "",
        content: (course.modules || []).map((module) => [module.title, module.description, ...(module.lessons || []).map((lesson) => lesson.title)].filter(Boolean).join("\n")).join("\n\n"),
        toc: (course.modules || []).map((module, index) => ({ id: module.id || crypto.randomUUID(), level: "chapter", title: module.title || `Chương ${index + 1}`, parentId: "" })),
        children: [],
      };
    }
    return {
      id: course.id || crypto.randomUUID(),
      level: "course",
      title: course.title || "Khóa học mới",
      description: course.description || "",
      image: course.image || "",
      content: course.content || "",
      toc: course.toc || [],
      children: [],
    };
  });
}

function normalizeNodes(nodes) {
  return (nodes || []).map((node) => ({
    id: node.id || crypto.randomUUID(),
    level: node.level || "lesson",
    title: node.title || "Nội dung mới",
    description: node.description || "",
    type: node.type || "Bài học",
    minutes: Number(node.minutes || 0),
    image: node.image || "",
    children: normalizeNodes(node.children || []),
  }));
}

function nodeToChapter(node, index = 0) {
  if (node.level === "chapter") {
    return {
      ...node,
      level: "chapter",
      title: node.title || `Chương ${index + 1}`,
      body: node.body || flattenChapterBody(node.children || []),
      summary: node.summary || "",
      materials: node.materials || "",
      collapsed: Boolean(node.collapsed),
      children: [],
    };
  }
  return {
    id: node.id || crypto.randomUUID(),
    level: "chapter",
    title: node.title || `Chương ${index + 1}`,
    description: node.description || "",
    image: node.image || "",
    body: [node.title, node.description, flattenChapterBody(node.children || [])].filter(Boolean).join("\n"),
    summary: "",
    materials: "",
    collapsed: false,
    children: [],
  };
}

function flattenChapterBody(nodes) {
  return (nodes || [])
    .flatMap((node) => [node.title, node.description, flattenChapterBody(node.children || [])])
    .filter(Boolean)
    .join("\n");
}

function writeAll() {
  writeStore("ta.tasks", state.tasks);
  writeStore("ta.prompts", state.prompts);
  writeStore("ta.alarms", state.alarms);
  writeStore("ta.courses", state.courses);
  writeStore("ta.notes", state.notes);
  writeStore("ta.documents", state.documents);
  writeStore("ta.ideas", state.ideas);
  writeStore("ta.contentPlans", state.contentPlans);
}

function icon(name) {
  return `<span class="material-symbols-outlined">${name}</span>`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function applyZoom() {
  const value = Math.min(1.35, Math.max(0.9, Number(state.zoom || 1)));
  state.zoom = value;
  document.documentElement.style.setProperty("--ui-scale", value.toFixed(2));
  if (zoomValue) zoomValue.textContent = `${Math.round(value * 100)}%`;
  localStorage.setItem("ta.zoom", String(value));
}

function changeZoom(delta) {
  state.zoom = Math.min(1.35, Math.max(0.9, Number(state.zoom || 1) + delta));
  applyZoom();
}

function copyText(text, label = "Đã copy") {
  const value = String(text || "").trim();
  if (!value) return showToast("Không có nội dung để copy");
  const fallbackCopy = () => {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    showToast(ok ? label : "Không copy được, hãy chọn và copy thủ công");
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).then(() => showToast(label)).catch(fallbackCopy);
  } else {
    fallbackCopy();
  }
}

function setPage(page) {
  state.page = page;
  state.search = "";
  state.courseFocus = false;
  searchInput.value = "";
  localStorage.setItem("ta.page", page);
  document.body.classList.remove("menu-open");
  render();
}

function matchesSearch(...values) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  return values.join(" ").toLowerCase().includes(q);
}

function renderNav() {
  nav.innerHTML = pages
    .map((page) => `
      <button class="${page.id === state.page ? "is-active" : ""}" type="button" data-page="${page.id}">
        ${icon(page.icon)}
        ${page.label}
      </button>
    `)
    .join("") + (state.authUser ? `
      <button type="button" data-logout>
        ${icon("logout")}
        Logout
      </button>
    ` : "");
}

function render() {
  document.body.classList.toggle("course-focus", state.page === "courses" && state.courseFocus);
  document.body.classList.toggle("document-focus", state.page === "documents" && state.documentFocusMode);
  renderNav();
  if (supabaseClient && state.authReady && !state.authUser) {
    pageTitle.textContent = "Đăng nhập";
    searchInput.placeholder = "Đăng nhập để mở dashboard...";
    app.innerHTML = renderAuth();
    bindAuthEvents();
    return;
  }
  const page = pages.find((item) => item.id === state.page) || pages[0];
  pageTitle.textContent = page.title;
  searchInput.placeholder = {
    dashboard: "Tìm số liệu...",
    notes: "Tìm ghi chú...",
    documents: "Tìm tài liệu...",
    ideas: "Tìm idea...",
    content: "Tìm kế hoạch content...",
    calendar: "Tìm lịch...",
    clock: "Tim bao thuc...",
    ads: "Tìm trong công cụ...",
    tasks: "Tìm công việc...",
    prompts: "Tìm prompt...",
  }[state.page] || "Tìm kiếm...";
  app.innerHTML = {
    dashboard: renderDashboard,
    notes: renderNotes,
    documents: renderDocuments,
    ideas: renderIdeas,
    content: renderContentPlan,
    calendar: renderCalendar,
    clock: renderClock,
    ads: renderAds,
    tasks: renderTasks,
    prompts: renderPrompts,
    settings: renderSimplePage,
    support: renderSimplePage,
  }[state.page]?.() || renderDashboard();
  bindViewEvents();
}

function renderAuth() {
  return `
    <section class="page auth-page">
      <form class="card pad auth-card" id="authForm">
        <span class="eyebrow">${icon("lock")} Supabase Auth</span>
        <h1 class="headline">Đăng nhập dashboard</h1>
        <p class="subhead">Đăng nhập hoặc tạo tài khoản để lưu Notes, Tasks, Prompts và Plan Content lên Supabase.</p>
        <input id="authMode" type="hidden" value="login" />
        <div class="field">
          <label for="authEmail">Email</label>
          <input id="authEmail" type="email" autocomplete="email" required placeholder="you@example.com" />
        </div>
        <div class="field">
          <label for="authPassword">Mật khẩu</label>
          <input id="authPassword" type="password" autocomplete="current-password" required minlength="6" placeholder="Tối thiểu 6 ký tự" />
        </div>
        <div class="course-form-actions">
          <button class="primary-button" type="submit" id="authSubmit">${icon("login")} Đăng nhập</button>
          <button class="secondary-button" type="button" id="toggleAuthMode">${icon("person_add")} Tạo tài khoản</button>
        </div>
        <button class="secondary-button auth-google" type="button" id="googleLogin">${icon("account_circle")} Đăng nhập bằng Google</button>
      </form>
    </section>
  `;
}

function bindAuthEvents() {
  const form = document.querySelector("#authForm");
  const modeInput = document.querySelector("#authMode");
  const submit = document.querySelector("#authSubmit");
  const toggle = document.querySelector("#toggleAuthMode");
  toggle?.addEventListener("click", () => {
    const isLogin = modeInput.value === "login";
    modeInput.value = isLogin ? "register" : "login";
    submit.innerHTML = `${icon(isLogin ? "person_add" : "login")} ${isLogin ? "Tạo tài khoản" : "Đăng nhập"}`;
    toggle.innerHTML = `${icon(isLogin ? "login" : "person_add")} ${isLogin ? "Đã có tài khoản" : "Tạo tài khoản"}`;
  });
  document.querySelector("#googleLogin")?.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) showToast(error.message);
  });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.querySelector("#authEmail").value.trim();
    const password = document.querySelector("#authPassword").value;
    const mode = modeInput.value;
    const result = mode === "register"
      ? await supabaseClient.auth.signUp({ email, password })
      : await supabaseClient.auth.signInWithPassword({ email, password });
    if (result.error) {
      showToast(result.error.message);
      return;
    }
    showToast(mode === "register" ? "Đã tạo tài khoản, hãy kiểm tra email nếu Supabase yêu cầu" : "Đã đăng nhập");
  });
}

function flattenNodes(node) {
  return [node, ...(node.children || []).flatMap(flattenNodes)];
}

function courseStats() {
  const pinnedNotes = state.notes.filter((note) => note.pinned).length;
  return {
    notes: state.notes.length,
    pinnedNotes,
    documents: state.documents.length,
    ideas: state.ideas.length,
    prompts: state.prompts.length,
    tasks: state.tasks.length,
    plans: state.contentPlans.length,
  };
}

function countBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item) || "Khác";
    groups[key] = (groups[key] || 0) + 1;
    return groups;
  }, {});
}

function ideaCategory(idea) {
  const text = `${idea.title || ""} ${idea.url || ""} ${idea.note || ""}`.toLowerCase();
  if (/(facebook|fb|meta)/.test(text)) return "Facebook";
  if (/(tiktok|tik tok)/.test(text)) return "TikTok";
  if (/(ads|quảng cáo|quang cao|campaign)/.test(text)) return "Quảng cáo";
  if (/(landing|page|website|web)/.test(text)) return "Landing";
  if (/(email|zalo|crm)/.test(text)) return "CRM";
  if (/(content|post|reel|video)/.test(text)) return "Content";
  return "Khác";
}

function percent(part, total) {
  return Math.round((part / Math.max(total, 1)) * 100);
}

function ratioRows(groups, total) {
  const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return `<div class="ratio-empty">Chưa có dữ liệu</div>`;
  return entries.map(([label, value]) => {
    const width = percent(value, total);
    return `
      <div class="ratio-row">
        <div class="ratio-row__text">
          <span>${escapeHtml(label)}</span>
          <strong>${value} · ${width}%</strong>
        </div>
        <div class="ratio-track"><i style="width:${width}%"></i></div>
      </div>
    `;
  }).join("");
}

function reportCard(iconName, title, total, groups, actionPage) {
  return `
    <article class="card pad report-card">
      <div class="report-card__head">
        <div>
          <span>${icon(iconName)}</span>
          <h3>${title}</h3>
        </div>
        <button class="icon-button" type="button" data-page="${actionPage}" aria-label="Mở ${title}">${icon("open_in_new")}</button>
      </div>
      <strong class="report-total">${total}</strong>
      <p class="muted">Tổng số mục đang lưu</p>
      <div class="ratio-list">${ratioRows(groups, total)}</div>
    </article>
  `;
}

function renderDashboard() {
  const done = state.tasks.filter((task) => task.done).length;
  const completion = Math.round((done / Math.max(state.tasks.length, 1)) * 100);
  const stats = courseStats();
  const noteGroups = countBy(state.notes, (note) => note.pinned ? "Đang ghim" : `Màu ${note.color || "white"}`);
  const documentGroups = countBy(state.documents, (documentItem) => documentItem.type || "Doc");
  const ideaGroups = countBy(state.ideas, ideaCategory);
  const promptGroups = countBy(state.prompts, (prompt) => prompt.category || "Khác");
  const taskGroups = {
    "Đã xong": done,
    "Chưa xong": Math.max(state.tasks.length - done, 0),
    ...countBy(state.tasks, (task) => task.status || "today"),
  };
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("bolt")} Live Updates</span>
          <h1 class="headline">Dashboard <span class="highlight">Tổng Quan</span></h1>
          <p class="subhead">Báo cáo số lượng và tỷ lệ phân nhóm của Notes, Tài liệu, Idea, Prompt và Task trong một dashboard.</p>
        </div>
        <button class="primary-button" type="button" data-page="notes">${icon("add")} Thêm ghi chú</button>
      </div>
      <div class="grid metrics">
        ${metric("sticky_note_2", "Ghi chú", stats.notes, `${stats.pinnedNotes} ghim`, "pill")}
        ${metric("folder_copy", "Tài liệu", stats.documents, `${Object.keys(documentGroups).length} loại`, "pill")}
        ${metric("lightbulb", "Idea", stats.ideas, `${Object.keys(ideaGroups).length} nhóm`, "pill")}
        ${metric("terminal", "Prompt AI", stats.prompts, `${state.prompts.filter((item) => item.favorite).length} favorite`, "pill")}
        ${metric("speed", "Hoàn thành công việc", `${completion}%`, `${done}/${state.tasks.length}`, "pill")}
      </div>
      <div class="dashboard-reports">
        ${reportCard("sticky_note_2", "Notes", stats.notes, noteGroups, "notes")}
        ${reportCard("folder_copy", "Tài liệu", stats.documents, documentGroups, "documents")}
        ${reportCard("lightbulb", "Idea", stats.ideas, ideaGroups, "ideas")}
        ${reportCard("terminal", "Prompt", stats.prompts, promptGroups, "prompts")}
        ${reportCard("checklist", "Task", stats.tasks, taskGroups, "tasks")}
      </div>
    </section>
  `;
}

function metric(iconName, label, value, trend, trendClass) {
  return `<article class="card metric"><div class="metric__top">${icon(iconName)}<span class="${trendClass}">${trend}</span></div><p>${label}</p><strong>${value}</strong></article>`;
}

function activity(iconName, title, body) {
  return `<div class="list-item">${icon(iconName)}<div><h4>${title}</h4><p>${body}</p></div></div>`;
}

function selectedCourse() {
  return state.courses.find((course) => course.id === state.selectedCourseId) || state.courses[0] || null;
}

function selectedDocument() {
  return state.documents.find((documentItem) => documentItem.id === state.selectedDocumentId) || state.documents[0] || null;
}

function renderNotes() {
  const filtered = [...state.notes]
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
    .filter((note) => matchesSearch(note.title, note.body));
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("sticky_note_2")} Sticky Notes</span>
          <h1 class="headline">Ghi chú</h1>
          <p class="subhead">Ghi nhanh ý tưởng, checklist và việc cần nhớ theo kiểu sticky notes.</p>
        </div>
        <button class="primary-button" id="newNoteButton" type="button">${icon("add")} Thêm ghi chú</button>
      </div>
      <div class="notes-board">
        ${filtered.length ? filtered.map(noteCard).join("") : `<div class="empty">Chưa có ghi chú phù hợp.</div>`}
      </div>
    </section>
  `;
}

function noteCard(note) {
  return `
    <article class="sticky-note note-${note.color || "yellow"} ${note.pinned ? "is-pinned" : ""}">
      <div class="note-toolbar">
        <button class="icon-button" type="button" data-pin-note="${note.id}" aria-label="Ghim">${icon(note.pinned ? "push_pin" : "keep")}</button>
        <select data-note-color="${note.id}" aria-label="Màu ghi chú">
          ${["yellow", "blue", "green", "pink", "white"].map((color) => `<option value="${color}" ${color === note.color ? "selected" : ""}>${color}</option>`).join("")}
        </select>
        <button class="icon-button danger-button" type="button" data-delete-note="${note.id}" aria-label="Xóa ghi chú">${icon("delete")}</button>
      </div>
      <input class="note-title-input" data-note-title="${note.id}" value="${escapeHtml(note.title)}" placeholder="Tiêu đề ghi chú" />
      <textarea class="note-body-input" data-note-body="${note.id}" placeholder="Viết ghi chú...">${escapeHtml(note.body)}</textarea>
    </article>
  `;
}

function documentTypeOptions(activeType = "Doc") {
  return ["Doc", "Sheet", "PDF", "Link", "Giao trinh"].map((type) => `<option value="${type}" ${type === activeType ? "selected" : ""}>${type}</option>`).join("");
}

function documentColorOptions(activeColor = "blue") {
  return ["blue", "green", "pink", "yellow", "white"].map((color) => `<option value="${color}" ${color === activeColor ? "selected" : ""}>${color}</option>`).join("");
}

function documentTocItems(content = "") {
  const container = document.createElement("div");
  container.innerHTML = content;
  const headings = [...container.querySelectorAll("h1, h2, h3")].map((heading, index) => ({
    index,
    level: heading.tagName.toLowerCase(),
    title: heading.textContent.trim(),
  })).filter((heading) => heading.title);
  if (headings.length) return headings;
  return [{ index: 0, level: "p", title: "Nội dung chính" }];
}

function renderDocumentToc(active) {
  const items = documentTocItems(active.content || "");
  return `
    <aside class="document-toc">
      <span>Mục lục</span>
      ${items.map((item) => `
        <button class="toc-${item.level}" type="button" data-document-heading="${item.index}">
          ${escapeHtml(item.title)}
        </button>
      `).join("")}
    </aside>
  `;
}

function renderDocumentFocus(active) {
  return `
    <section class="document-focus-page">
      <header class="document-focus-header">
        <button class="secondary-button" type="button" data-exit-document-focus>${icon("arrow_back")} Quay lại kho</button>
        <div>
          <span class="eyebrow">${icon("folder_copy")} ${escapeHtml(active.type || "Doc")}</span>
          <h1>${escapeHtml(active.title || "Tài liệu chưa đặt tên")}</h1>
        </div>
        <button class="icon-button danger-button" type="button" data-delete-document="${active.id}" aria-label="Xóa tài liệu">${icon("delete")}</button>
      </header>
      <div class="document-focus-layout">
        ${renderDocumentToc(active)}
        <article class="document-focus-sheet">
          ${documentEditorToolbar()}
          <div class="document-free-editor document-focus-editor" contenteditable="true" data-document-content="${active.id}">${active.content || ""}</div>
          <div class="document-selection-menu" id="documentSelectionMenu" hidden>
            <button type="button" data-doc-format="bold">${icon("format_bold")} In đậm</button>
            <button type="button" data-doc-format="italic">${icon("format_italic")} In nghiêng</button>
            <button type="button" data-doc-format="underline">${icon("format_underlined")} Gạch chân</button>
            <button type="button" data-doc-block="h2">${icon("title")} Tiêu đề</button>
            <button type="button" data-doc-block="blockquote">${icon("format_quote")} Trích dẫn</button>
            <button type="button" data-doc-clear>${icon("format_clear")} Xóa định dạng</button>
          </div>
        </article>
      </div>
    </section>
  `;
}

function documentEditorToolbar() {
  return `
    <div class="document-editor-toolbar">
      <button class="icon-button" type="button" data-doc-format="bold" aria-label="In đậm">${icon("format_bold")}</button>
      <button class="icon-button" type="button" data-doc-format="italic" aria-label="In nghiêng">${icon("format_italic")}</button>
      <button class="icon-button" type="button" data-doc-format="underline" aria-label="Gạch chân">${icon("format_underlined")}</button>
      <button class="icon-button" type="button" data-doc-format="insertUnorderedList" aria-label="Danh sách chấm">${icon("format_list_bulleted")}</button>
      <button class="icon-button" type="button" data-doc-format="insertOrderedList" aria-label="Danh sách số">${icon("format_list_numbered")}</button>
      <button class="icon-button" type="button" data-doc-block="h2" aria-label="Tiêu đề">${icon("title")}</button>
      <button class="icon-button" type="button" data-doc-block="blockquote" aria-label="Trích dẫn">${icon("format_quote")}</button>
      <button class="icon-button" type="button" data-doc-clear aria-label="Xóa định dạng">${icon("format_clear")}</button>
      <button class="icon-button" type="button" data-doc-link aria-label="Thêm link">${icon("add_link")}</button>
      <button class="icon-button" type="button" data-doc-image aria-label="Thêm ảnh">${icon("image")}</button>
    </div>
  `;
}

function renderDocuments() {
  const filtered = state.documents.filter((documentItem) => matchesSearch(documentItem.title, documentItem.type, documentItem.summary, documentItem.content, documentItem.sourceUrl));
  const active = state.documentPanelOpen ? selectedDocument() : null;
  if (active && state.documentFocusMode) return renderDocumentFocus(active);
  return `
    <section class="page documents-page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("folder_copy")} Tài liệu</span>
          <h1 class="headline">Kho tài liệu</h1>
          <p class="subhead">Lưu giáo trình, doc, sheet, PDF, link và nội dung AI xuất sang app để bấm vào là đọc ngay.</p>
        </div>
        <button class="primary-button" id="newDocumentButton" type="button">${icon("add")} Thêm tài liệu</button>
      </div>
      <div class="documents-layout ${active ? "has-active-document" : ""}">
        <aside class="document-list">
          ${filtered.length ? filtered.map((documentItem) => `
            <button class="document-module document-color-${documentItem.color || "blue"} ${active?.id === documentItem.id ? "is-active" : ""}" type="button" data-open-document="${documentItem.id}">
              <span>${escapeHtml(documentItem.type || "Doc")}</span>
              <strong>${escapeHtml(documentItem.title || "Tài liệu chưa đặt tên")}</strong>
              <small>${escapeHtml(documentItem.summary || documentItem.sourceUrl || "Bấm để mở tài liệu")}</small>
            </button>
          `).join("") : `<div class="empty compact-empty">Chưa có tài liệu phù hợp.</div>`}
        </aside>
        ${active ? `
          <article class="document-reader">
            <div class="document-reader-actions">
              <select data-document-type="${active.id}" aria-label="Loại tài liệu">${documentTypeOptions(active.type)}</select>
              <select data-document-color="${active.id}" aria-label="Màu tài liệu">${documentColorOptions(active.color)}</select>
              <button class="secondary-button" type="button" data-copy-document="${active.id}">${icon("content_copy")} Copy</button>
              ${active.sourceUrl ? `<button class="secondary-button" type="button" data-open-document-source="${active.id}">${icon("open_in_new")} Mở nguồn</button>` : ""}
              <button class="icon-button" type="button" data-close-document aria-label="Đóng tài liệu">${icon("close")}</button>
              <button class="icon-button danger-button" type="button" data-delete-document="${active.id}" aria-label="Xóa tài liệu">${icon("delete")}</button>
            </div>
            <div class="document-open-layout">
              ${renderDocumentToc(active)}
              <div class="document-edit-pane">
                <input class="doc-title-input" data-document-title="${active.id}" value="${escapeHtml(active.title)}" placeholder="Tên tài liệu" />
                <textarea class="doc-desc-input compact-desc" data-document-summary="${active.id}" placeholder="Mô tả ngắn...">${escapeHtml(active.summary || "")}</textarea>
                <input class="document-source-input" data-document-source="${active.id}" value="${escapeHtml(active.sourceUrl || "")}" placeholder="Dán link Doc, Sheet, PDF hoặc nguồn tham khảo..." />
                ${documentEditorToolbar()}
                <div class="document-free-editor" contenteditable="true" data-document-content="${active.id}" data-enter-document-focus>${active.content || ""}</div>
                <div class="document-selection-menu" id="documentSelectionMenu" hidden>
                  <button type="button" data-doc-format="bold">${icon("format_bold")} In đậm</button>
                  <button type="button" data-doc-format="italic">${icon("format_italic")} In nghiêng</button>
                  <button type="button" data-doc-format="underline">${icon("format_underlined")} Gạch chân</button>
                  <button type="button" data-doc-block="h2">${icon("title")} Tiêu đề</button>
                  <button type="button" data-doc-block="blockquote">${icon("format_quote")} Trích dẫn</button>
                  <button type="button" data-doc-clear>${icon("format_clear")} Xóa định dạng</button>
                </div>
              </div>
            </div>
          </article>
        ` : ""}
      </div>
    </section>
  `;
}

function renderIdeas() {
  const filtered = state.ideas.filter((idea) => matchesSearch(idea.title, idea.url, idea.note));
  return `
    <section class="page ideas-page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("lightbulb")} Idea</span>
          <h1 class="headline">Kho idea và link</h1>
          <p class="subhead">Lưu tiêu đề, link và thumbnail tự lấy từ website để gom tư liệu tham khảo cho content, offer và funnel.</p>
        </div>
        <button class="primary-button" id="newIdeaButton" type="button">${icon(state.ideaFormOpen ? "close" : "add")} ${state.ideaFormOpen ? "Đóng" : "Thêm idea"}</button>
      </div>
      ${state.ideaFormOpen ? `<form class="idea-form card pad" id="ideaForm">
        <div class="field">
          <label for="ideaTitle">Tiêu đề</label>
          <input id="ideaTitle" type="text" placeholder="VD: Mẫu landing page khóa học AI" required />
        </div>
        <div class="field">
          <label for="ideaUrl">Link</label>
          <input id="ideaUrl" type="url" placeholder="https://..." required />
        </div>
        <div class="field">
          <label for="ideaNote">Ghi chú</label>
          <textarea id="ideaNote" placeholder="Ghi angle, insight, lý do cần lưu..."></textarea>
        </div>
        <button class="primary-button" type="submit">${icon("add")} Lưu idea</button>
      </form>` : ""}
      <div class="idea-grid">
        ${filtered.length ? filtered.map((idea) => `
          <article class="idea-card">
            <div class="idea-card-actions">
              <button class="icon-button" type="button" data-copy-idea="${idea.id}" aria-label="Copy link">${icon("content_copy")}</button>
              <button class="icon-button danger-button" type="button" data-delete-idea="${idea.id}" aria-label="Xóa idea">${icon("delete")}</button>
            </div>
            <div class="idea-thumbnail">
              ${ideaThumbnailUrl(idea) ? `<img src="${escapeHtml(ideaThumbnailUrl(idea))}" alt="" loading="lazy" />` : icon("link")}
            </div>
            <div class="idea-content">
              <h3>${escapeHtml(idea.title)}</h3>
              <a href="${escapeHtml(idea.url)}" target="_blank" rel="noreferrer">${escapeHtml(idea.url)}</a>
              <p>${escapeHtml(idea.note || "Chưa có ghi chú.")}</p>
            </div>
          </article>
        `).join("") : `<div class="empty">Chưa có idea phù hợp.</div>`}
      </div>
    </section>
  `;
}

function ideaThumbnailUrl(idea) {
  if (idea?.thumbnail) return idea.thumbnail;
  try {
    const hostname = new URL(idea.url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return "";
  }
}

function renderCourses() {
  const course = selectedCourse();
  const filteredCourses = state.courses.filter((item) => matchesSearch(item.title, item.description, item.content, ...(item.toc || []).map((toc) => toc.title)));
  if (state.courseDraftMode === "create") return renderCourseCreateDetail();
  if (state.courseDraftMode === "read" && course) return renderCourseRead(course);
  if (state.courseDraftMode === "edit" && course) return renderCourseDetail(course);
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("school")} Courses</span>
          <h1 class="headline">Khóa học</h1>
        </div>
        <button class="primary-button" id="newCourseButton" type="button">${icon("add")} Tạo khóa học</button>
      </div>
      <div class="grid three-col">
        ${filteredCourses.map((item) => `
          <article class="card pad prompt-card course-card">
            <div class="row-between">
              <span class="tag">${(item.toc || []).length} mục lục</span>
              <button class="icon-button danger-button" type="button" data-delete-course="${item.id}" aria-label="Xóa khóa">${icon("delete")}</button>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description || "Chưa có mô tả.")}</p>
            <button class="primary-button" type="button" data-open-course="${item.id}">${icon("edit")} Mở khóa học</button>
          </article>
        `).join("") || `
          <article class="card pad prompt-card course-card">
            <h3>Chưa có khóa học</h3>
            <p>Bấm nút tạo khóa học để bắt đầu.</p>
            <button class="primary-button" id="bigNewCourse" type="button">${icon("add")} Tạo khóa học</button>
          </article>
        `}
      </div>
    </section>
  `;
}

function courseIndex(courseId) {
  return state.courses.findIndex((course) => course.id === courseId);
}

function courseNav(course) {
  const index = courseIndex(course.id);
  const prev = state.courses[index - 1];
  const next = state.courses[index + 1];
  return `
    <div class="course-nav-bar">
      <button class="secondary-button" type="button" data-course-list>${icon("arrow_back")} Danh sách khóa học</button>
      <div class="course-nav-actions">
        ${course.id ? `<button class="secondary-button" type="button" data-toggle-course-read="${course.id}">${icon(state.courseDraftMode === "read" ? "edit" : "menu_book")} ${state.courseDraftMode === "read" ? "Sửa khóa học" : "Xem khóa học"}</button>` : ""}
        <button class="icon-button" type="button" data-nav-course="${prev?.id || ""}" ${prev ? "" : "disabled"} aria-label="Khóa trước">${icon("chevron_left")}</button>
        <button class="icon-button" type="button" data-nav-course="${next?.id || ""}" ${next ? "" : "disabled"} aria-label="Khóa sau">${icon("chevron_right")}</button>
      </div>
    </div>
  `;
}

function renderCourseRead(course) {
  const chapters = (course.toc || []).filter((item) => item.level === "chapter");
  return `
    <section class="page course-reader-page">
      ${courseNav(course)}
      <article class="course-reader">
        <header class="course-reader-cover">
          <span class="eyebrow">${icon("menu_book")} Chế độ đọc</span>
          <h1>${escapeHtml(course.title)}</h1>
          <p>${escapeHtml(course.description || "Chưa có mô tả khóa học.")}</p>
        </header>
        ${chapters.length ? `
          <nav class="reader-chapters">
            ${chapters.map((chapter, index) => `<a href="#chapter-${chapter.id}">${index + 1}. ${escapeHtml(chapter.title)}</a>`).join("")}
          </nav>
        ` : ""}
        <div class="reader-content">
          ${chapters.length ? chapters.map((chapter, index) => `
            <section class="reader-chapter" id="chapter-${chapter.id}">
              <span>Chương ${index + 1}</span>
              <h2>${escapeHtml(chapter.title)}</h2>
            </section>
          `).join("") : ""}
          <div class="reader-body">${course.content || `<p>Chưa có nội dung khóa học.</p>`}</div>
        </div>
      </article>
    </section>
  `;
}

function editorToolbar() {
  return `
    <div class="course-editor-toolbar">
      <button class="icon-button" type="button" data-format="bold" aria-label="In đậm">${icon("format_bold")}</button>
      <button class="icon-button" type="button" data-format="italic" aria-label="In nghiêng">${icon("format_italic")}</button>
      <button class="icon-button" type="button" data-format="underline" aria-label="Gạch chân">${icon("format_underlined")}</button>
      <button class="icon-button" type="button" data-format="insertUnorderedList" aria-label="Danh sách">${icon("format_list_bulleted")}</button>
      <button class="icon-button" type="button" data-insert-image aria-label="Thêm ảnh">${icon("image")}</button>
    </div>
  `;
}

function renderCourseCreateDetail() {
  return `
    <section class="page">
      ${courseNav({ id: "" })}
      <form class="course-create-basic card pad" id="courseCreateForm">
        <h2>Tạo khóa học</h2>
        <div class="field">
          <label for="newCourseTitle">Tên khóa</label>
          <input id="newCourseTitle" type="text" placeholder="VD: AI Marketing Mastery" autofocus />
        </div>
        <div class="field">
          <label for="newCourseDescription">Mô tả</label>
          <textarea id="newCourseDescription" placeholder="Mục tiêu, đối tượng học, kết quả đầu ra..."></textarea>
        </div>
        <div class="field">
          <label for="newCourseImage">Hình minh họa URL</label>
          <input id="newCourseImage" type="text" placeholder="https://..." />
        </div>
        <button class="primary-button" type="submit">${icon("save")} Tạo khóa học</button>
      </form>
    </section>
  `;
}

function renderCourseDetail(course) {
  return `
    <section class="page course-editor-page">
      ${courseNav(course)}
      <div class="course-word-layout">
        <section class="course-word-editor">
          <div class="course-word-title">
            <input class="doc-title-input" data-course-title="${course.id}" value="${escapeHtml(course.title)}" />
            <button class="icon-button danger-button" type="button" data-delete-course="${course.id}" aria-label="Xóa khóa">${icon("delete")}</button>
          </div>
          <textarea class="doc-desc-input compact-desc" data-course-desc="${course.id}" placeholder="Mô tả khóa học...">${escapeHtml(course.description)}</textarea>
          ${editorToolbar()}
          <div class="course-free-editor" contenteditable="true" data-course-content="${course.id}">${course.content || ""}</div>
          <div class="selection-menu" id="selectionMenu" hidden>
            <button type="button" data-mark-toc="chapter">Chương</button>
            <button type="button" data-mark-toc="lesson">Bài học</button>
            <button type="button" data-mark-toc="section">Mục</button>
          </div>
        </section>
        <aside class="course-toc-panel">
          <div class="row-between">
            <h3>Mục lục</h3>
            <button class="icon-button" type="button" data-add-toc="${course.id}" aria-label="Thêm mục lục">${icon("add")}</button>
          </div>
          <div class="toc-list">
            ${(course.toc || []).map((item) => renderTocItem(course.id, item)).join("")}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderTocItem(courseId, item) {
  const className = item.level === "chapter" ? "toc-item toc-chapter" : item.level === "lesson" ? "toc-item toc-lesson" : "toc-item toc-section";
  return `
    <div class="${className}">
      <button type="button" data-focus-toc="${escapeHtml(item.title)}">${escapeHtml(item.title)}</button>
      <span>${item.level === "chapter" ? "Chương" : item.level === "lesson" ? "Bài học" : "Mục"}</span>
      <button class="toc-plus" type="button" data-add-child-toc="${courseId}:${item.id}" aria-label="Thêm mục con">+</button>
      <button class="toc-delete" type="button" data-delete-toc="${courseId}:${item.id}" aria-label="Xóa">×</button>
    </div>
  `;
}

function courseStatsFor(course) {
  return {
    chapters: (course.toc || []).filter((item) => item.level === "chapter").length,
    lessons: (course.toc || []).filter((item) => item.level === "lesson").length,
    sections: (course.toc || []).filter((item) => item.level === "section").length,
  };
}

function tocLevelAfter(level) {
  if (level === "chapter") return "lesson";
  if (level === "lesson") return "section";
  return "section";
}

function tocTitle(level) {
  return level === "chapter" ? "Chương mới" : level === "lesson" ? "Bài học mới" : "Mục mới";
}

function showSelectionMenu(editor, event) {
  event.preventDefault();
  const menu = document.querySelector("#selectionMenu");
  if (!menu) return;
  const selection = window.getSelection();
  const text = selectedTextInEditor(editor);
  if (!text || !selection?.rangeCount) {
    menu.hidden = true;
    state.pendingSelectionText = "";
    return;
  }
  state.pendingSelectionText = text;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const left = Math.min(Math.max(rect.right + 8, 8), window.innerWidth - 170);
  const top = Math.min(Math.max(rect.top, 8), window.innerHeight - 120);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.hidden = false;
}

function selectedTextInEditor(editor) {
  const selection = window.getSelection();
  const text = selection?.toString().trim() || "";
  if (!text || !selection?.anchorNode || !selection?.focusNode) return "";
  if (!editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return "";
  return text;
}

function hideSelectionMenu() {
  const menu = document.querySelector("#selectionMenu");
  if (menu) menu.hidden = true;
  state.pendingSelectionText = "";
}

function saveDocumentSelection(editor) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.anchorNode || !selection.focusNode) return false;
  if (!editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return false;
  documentSelectionRange = selection.getRangeAt(0).cloneRange();
  return !selection.toString().trim() || true;
}

function restoreDocumentSelection() {
  if (!documentSelectionRange) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(documentSelectionRange);
}

function showDocumentSelectionMenu(editor, event) {
  event.preventDefault();
  const menu = document.querySelector("#documentSelectionMenu");
  if (!menu) return;
  const selection = window.getSelection();
  const text = selectedTextInEditor(editor);
  if (!text || !selection?.rangeCount) {
    menu.hidden = true;
    documentSelectionRange = null;
    return;
  }
  documentSelectionRange = selection.getRangeAt(0).cloneRange();
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const left = Math.min(Math.max(rect.left, 8), window.innerWidth - 190);
  const top = Math.min(Math.max(rect.bottom + 8, 8), window.innerHeight - 220);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.hidden = false;
}

function hideDocumentSelectionMenu() {
  const menu = document.querySelector("#documentSelectionMenu");
  if (menu) menu.hidden = true;
}

function persistDocumentEditor(editor) {
  const documentItem = state.documents.find((item) => item.id === editor?.dataset.documentContent);
  if (!documentItem || !editor) return;
  documentItem.content = editor.innerHTML;
  documentItem.updatedAt = new Date().toISOString();
  writeStore("ta.documents", state.documents);
}

function runDocumentCommand(command, value = null) {
  const editor = document.querySelector("[data-document-content]");
  if (!editor) return;
  editor.focus();
  restoreDocumentSelection();
  document.execCommand(command, false, value);
  persistDocumentEditor(editor);
  saveDocumentSelection(editor);
}

function runDocumentBlock(tagName) {
  runDocumentCommand("formatBlock", tagName);
}

function syncTocWithEditor(course, editor) {
  const text = editor.innerText || "";
  course.toc = (course.toc || []).filter((item) => item.source !== "selection" || text.includes(item.title));
}

function findCourse(courseId) {
  return state.courses.find((course) => course.id === courseId);
}

function findNode(nodes, nodeId) {
  for (const node of nodes || []) {
    if (node.id === nodeId) return node;
    const found = findNode(node.children, nodeId);
    if (found) return found;
  }
  return null;
}

function findCourseNode(courseId, nodeId) {
  const course = findCourse(courseId);
  if (!course) return null;
  if (course.id === nodeId) return course;
  return findNode(course.children, nodeId);
}

function findParent(root, childId, parent = null) {
  if (!root) return null;
  if (root.id === childId) return parent;
  for (const child of root.children || []) {
    const found = findParent(child, childId, root);
    if (found) return found;
  }
  return null;
}

function removeNode(nodes, nodeId) {
  const index = nodes.findIndex((node) => node.id === nodeId);
  if (index >= 0) return nodes.splice(index, 1)[0];
  for (const node of nodes) {
    const removed = removeNode(node.children || [], nodeId);
    if (removed) return removed;
  }
  return null;
}

function findSiblingsInfo(nodes, nodeId, parent = null) {
  const index = nodes.findIndex((node) => node.id === nodeId);
  if (index >= 0) return { siblings: nodes, index, parent };
  for (const node of nodes) {
    const found = findSiblingsInfo(node.children || [], nodeId, node);
    if (found) return found;
  }
  return null;
}

function createOutlineNode(level, title = "") {
  return {
    id: crypto.randomUUID(),
    level,
    title: title || nextTitle(level),
    description: "",
    type: level === "lesson" ? "Bài học" : "",
    minutes: level === "lesson" ? 20 : 0,
    children: [],
  };
}

function createChapter(title = "Chương mới") {
  return {
    id: crypto.randomUUID(),
    level: "chapter",
    title,
    description: "",
    image: "",
    body: "",
    summary: "",
    materials: "",
    collapsed: false,
    children: [],
  };
}

function nextTitle(level) {
  const labels = {
    chapter: "Chương mới",
    lesson: "Bài mới",
    section: "Mục mới",
    item: "Đoạn mới",
  };
  return labels[level] || "Nội dung mới";
}

function insertAfter(rootNodes, nodeId, newNode) {
  const index = rootNodes.findIndex((node) => node.id === nodeId);
  if (index >= 0) {
    rootNodes.splice(index + 1, 0, newNode);
    return true;
  }
  return rootNodes.some((node) => insertAfter(node.children || [], nodeId, newNode));
}

function syncLevelFromDepth(node, depth) {
  node.level = levelOrder[Math.min(depth, levelOrder.length - 1)];
  (node.children || []).forEach((child) => syncLevelFromDepth(child, depth + 1));
}

function indentNode(courseId, nodeId) {
  const course = findCourse(courseId);
  if (!course) return;
  const info = findSiblingsInfo(course.children, nodeId);
  if (!info || info.index === 0) {
    showToast("Cần có một dòng ở phía trên để lùi vào");
    return;
  }
  const [node] = info.siblings.splice(info.index, 1);
  const newParent = info.siblings[info.index - 1];
  newParent.children ||= [];
  newParent.children.push(node);
  const parentDepth = levelOrder.indexOf(newParent.level);
  syncLevelFromDepth(node, parentDepth + 1);
  writeStore("ta.courses", state.courses);
  render();
}

function outdentNode(courseId, nodeId) {
  const course = findCourse(courseId);
  if (!course) return;
  const info = findSiblingsInfo(course.children, nodeId);
  if (!info || !info.parent) {
    showToast("Dòng này đã ở cấp ngoài cùng");
    return;
  }
  const [node] = info.siblings.splice(info.index, 1);
  const parentInfo = findSiblingsInfo(course.children, info.parent.id);
  if (!parentInfo) {
    course.children.push(node);
    syncLevelFromDepth(node, 0);
  } else {
    parentInfo.siblings.splice(parentInfo.index + 1, 0, node);
    const parentDepth = parentInfo.parent ? levelOrder.indexOf(parentInfo.parent.level) + 1 : 0;
    syncLevelFromDepth(node, parentDepth);
  }
  writeStore("ta.courses", state.courses);
  render();
}

function renderAds() {
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("campaign")} Ads Tool</span>
          <h1 class="headline">Công cụ <span class="highlight">Marketing</span></h1>
          <p class="subhead">Tao ten ads nhanh, cac phan duoc noi bang dau gach duoi.</p>
        </div>
      </div>
      <div class="grid two-col">
        <form class="card pad form-grid" id="adsForm">
          ${field("Ngày", "adsDate", "date", "2026-05-15")}
          <div class="field">
            <label for="adsCampaign">Chien dich</label>
            <input id="adsCampaign" type="text" value="AI Marketing" />
          </div>
          ${field("Content", "adsContent", "text", "Video-Viral-01")}
          ${field("Tệp", "adsAudience", "text", "LAL-1-3")}
          <button class="primary-button" type="button" id="copyAdName">${icon("content_copy")} Copy tên Ads</button>
        </form>
        <aside class="card pad">
          <h3>Tên quảng cáo</h3>
          <div class="preview-box" id="adPreview"></div>
          <p class="muted">Vi du: ngay_chien_dich_content_tep.</p>
        </aside>
      </div>
    </section>
  `;
}

function field(label, id, type, value) {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${escapeHtml(value)}" /></div>`;
}

function normalizeAdPart(value = "") {
  return String(value).trim().replace(/[\s\-\/]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function renderContentPlan() {
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("edit_calendar")} Plan Content</span>
          <h1 class="headline">Kế hoạch <span class="highlight">Content</span></h1>
          <p class="subhead">Lên topic theo ngày và kênh. Calendar sẽ lấy dữ liệu từ đây.</p>
        </div>
      </div>
      <div class="grid two-col">
        <div class="list">${state.contentPlans.filter((plan) => matchesSearch(plan.topic, plan.channel)).map(planCard).join("")}</div>
        <form class="card pad form-grid" id="contentPlanForm">
          <h3>Thêm kế hoạch</h3>
          ${field("Ngày", "planDate", "date", "2026-05-20")}
          ${field("Topic", "planTopic", "text", "")}
          <div class="field"><label for="planChannel">Kênh</label><select id="planChannel"><option>Facebook</option><option>TikTok</option><option>LinkedIn</option><option>Email</option><option>Blog</option></select></div>
          <button class="primary-button" type="submit">${icon("add")} Thêm content</button>
        </form>
      </div>
    </section>
  `;
}

function planCard(plan) {
  return `
    <article class="list-item">
      ${icon("edit_note")}
      <div style="flex:1">
        <div class="row-between">
          <h4>${escapeHtml(plan.topic)}</h4>
          <span class="tag">${escapeHtml(plan.channel)}</span>
        </div>
        <p>${new Date(plan.date).toLocaleDateString("vi-VN")}</p>
        <div class="item-actions task-actions">
          <button class="icon-button" type="button" data-copy-plan="${plan.id}" aria-label="Copy">${icon("content_copy")}</button>
          <button class="icon-button danger-button" type="button" data-delete-plan="${plan.id}" aria-label="Xóa">${icon("delete")}</button>
        </div>
      </div>
    </article>
  `;
}

function renderCalendar() {
  const sorted = [...state.contentPlans].sort((a, b) => a.date.localeCompare(b.date));
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("calendar_month")} Calendar</span>
          <h1 class="headline">Lịch <span class="highlight">Triển khai</span></h1>
          <p class="subhead">Tổng hợp task deadline và content plan theo ngày.</p>
        </div>
      </div>
      <div class="calendar-board">
        ${sorted.map((plan) => `
          <article class="card pad calendar-day">
            <span class="pill">${new Date(plan.date).toLocaleDateString("vi-VN")}</span>
            <h3>${escapeHtml(plan.topic)}</h3>
            <p>${escapeHtml(plan.channel)}</p>
          </article>
        `).join("")}
        ${state.tasks.map((task) => `
          <article class="card pad calendar-day">
            <span class="pill">${new Date(task.due).toLocaleDateString("vi-VN")}</span>
            <h3>${escapeHtml(task.title)}</h3>
            <p>Task · ${escapeHtml(task.priority)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderClock() {
  const alarms = state.alarms.filter((alarm) => matchesSearch(alarm.time, alarm.label));
  return `
    <section class="page clock-page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("schedule")} Time Center</span>
          <h1 class="headline">Đồng hồ</h1>
          <p class="subhead">Đồng hồ điện tử lớn, báo thức, đếm ngược và bấm giờ trong cùng một màn hình.</p>
        </div>
      </div>

      <div class="clock-hero card">
        <div>
          <p class="clock-label">Giờ hiện tại</p>
          <div class="digital-clock" id="digitalClock">--:--:--</div>
          <p class="clock-date" id="clockDate">--</p>
        </div>
        <span class="material-symbols-outlined">schedule</span>
      </div>

      <div class="grid three-col clock-tools">
        <article class="card pad clock-panel">
          <div class="row-between">
            <h3>Báo thức</h3>
            <span class="pill">${state.alarms.length} alarms</span>
          </div>
          <form class="alarm-form" id="alarmForm">
            <input id="alarmTime" type="time" required />
            <input id="alarmLabel" type="text" placeholder="Tên báo thức" />
            <button class="primary-button" type="submit">${icon("add_alert")} Thêm</button>
          </form>
          <div class="alarm-list">
            ${alarms.length ? alarms.map(alarmCard).join("") : `<div class="empty compact-empty">Chưa có báo thức.</div>`}
          </div>
        </article>

        <article class="card pad clock-panel">
          <div class="row-between">
            <h3>Đếm ngược</h3>
            <span class="pill" id="countdownStatus">${state.countdownRunning ? "Running" : "Ready"}</span>
          </div>
          <div class="timer-display" id="countdownDisplay">${formatDuration(state.countdownRemaining)}</div>
          <form class="timer-setup" id="countdownSetup">
            <input id="countdownHours" type="number" min="0" max="99" placeholder="Giờ" />
            <input id="countdownMinutes" type="number" min="0" max="59" placeholder="Phút" />
            <input id="countdownSeconds" type="number" min="0" max="59" placeholder="Giây" />
            <button class="secondary-button" type="submit">${icon("timer")} Set</button>
          </form>
          <div class="timer-actions">
            <button class="primary-button" type="button" id="toggleCountdown">${icon(state.countdownRunning ? "pause" : "play_arrow")} ${state.countdownRunning ? "Tạm dừng" : "Bắt đầu"}</button>
            <button class="secondary-button" type="button" id="resetCountdown">${icon("restart_alt")} Reset</button>
          </div>
        </article>

        <article class="card pad clock-panel">
          <div class="row-between">
            <h3>Bấm giờ</h3>
            <span class="pill" id="stopwatchStatus">${state.stopwatchRunning ? "Running" : "Ready"}</span>
          </div>
          <div class="timer-display" id="stopwatchDisplay">${formatStopwatch(state.stopwatchElapsed)}</div>
          <div class="timer-actions stopwatch-actions">
            <button class="primary-button" type="button" id="toggleStopwatch">${icon(state.stopwatchRunning ? "pause" : "play_arrow")} ${state.stopwatchRunning ? "Tạm dừng" : "Bắt đầu"}</button>
            <button class="secondary-button" type="button" id="lapStopwatch">${icon("flag")} Lap</button>
            <button class="secondary-button" type="button" id="resetStopwatch">${icon("restart_alt")} Reset</button>
          </div>
          <div class="lap-list" id="lapList"></div>
        </article>
      </div>
    </section>
  `;
}

function alarmCard(alarm) {
  return `
    <div class="alarm-item ${alarm.enabled ? "" : "is-off"}">
      <label>
        <input type="checkbox" data-toggle-alarm="${alarm.id}" ${alarm.enabled ? "checked" : ""} />
        <span>
          <strong>${escapeHtml(alarm.time)}</strong>
          <small>${escapeHtml(alarm.label || "Báo thức")}</small>
        </span>
      </label>
      <button class="icon-button danger-button" type="button" data-delete-alarm="${alarm.id}" aria-label="Xóa báo thức">${icon("delete")}</button>
    </div>
  `;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}

function formatStopwatch(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds));
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function renderTasks() {
  const filtered = state.tasks.filter((task) => {
    const statusOk = state.taskFilter === "all" || task.status === state.taskFilter || (state.taskFilter === "completed" && task.done);
    return statusOk && matchesSearch(task.title, task.description, task.priority);
  });
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("checklist")} Workflow</span>
          <h1 class="headline">Danh sách <span class="highlight">Công việc</span></h1>
          <p class="subhead">Mọi task trừ report/báo cáo đều có sửa. Tất cả task đều có copy và xóa.</p>
        </div>
      </div>
      <div class="controls">${segmented("task", [["today", "Today"], ["upcoming", "Upcoming"], ["completed", "Completed"], ["all", "Tất cả"]], state.taskFilter)}</div>
      <div class="grid two-col">
        <div class="list">${filtered.length ? filtered.map(taskCard).join("") : `<div class="empty">Không có công việc phù hợp.</div>`}</div>
        <form class="card pad form-grid" id="taskForm">
          <input id="taskEditId" type="hidden" value="" />
          <h3 id="taskFormTitle">Tạo công việc mới</h3>
          ${field("Tiêu đề", "taskTitle", "text", "")}
          <div class="field"><label for="taskDescription">Mô tả</label><textarea id="taskDescription"></textarea></div>
          ${field("Deadline", "taskDue", "date", "2026-05-20")}
          <div class="field"><label for="taskPriority">Độ ưu tiên</label><select id="taskPriority"><option>High</option><option selected>Medium</option><option>Low</option></select></div>
          <div class="course-form-actions">
            <button class="primary-button" type="submit">${icon("save")} Lưu công việc</button>
            <button class="secondary-button" type="button" id="resetTaskForm">${icon("restart_alt")} Làm mới</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

function segmented(type, options, active) {
  return `<div class="segmented" data-segmented="${type}">${options.map(([value, label]) => `<button class="${value === active ? "is-active" : ""}" type="button" data-value="${value}">${label}</button>`).join("")}</div>`;
}

function isReportTask(task) {
  return /\breport\b|báo cáo|bao cao/i.test(`${task.title} ${task.description}`);
}

function taskCard(task) {
  const isReport = isReportTask(task);
  return `
    <article class="list-item ${task.done ? "is-done" : ""}">
      <input type="checkbox" data-task-toggle="${task.id}" ${task.done ? "checked" : ""} aria-label="Đánh dấu hoàn thành" />
      <div style="flex:1">
        <div class="row-between">
          <h4>${escapeHtml(task.title)}</h4>
          <span class="tag ${task.priority === "High" ? "high" : ""} ${task.done ? "done" : ""}">${task.done ? "Done" : task.priority}</span>
        </div>
        <p>${escapeHtml(task.description)}</p>
        <p><strong>Deadline:</strong> ${new Date(task.due).toLocaleDateString("vi-VN")}</p>
        <div class="item-actions task-actions">
          <button class="icon-button" type="button" data-copy-task="${task.id}" aria-label="Copy">${icon("content_copy")}</button>
          ${isReport ? `<span class="pill">Report</span>` : `<button class="icon-button" type="button" data-edit-task="${task.id}" aria-label="Sửa">${icon("edit")}</button>`}
          <button class="icon-button danger-button" type="button" data-delete-task="${task.id}" aria-label="Xóa">${icon("delete")}</button>
        </div>
      </div>
    </article>
  `;
}

function taskCopyText(task) {
  return [`Tiêu đề: ${task.title}`, `Mô tả: ${task.description}`, `Deadline: ${task.due}`, `Ưu tiên: ${task.priority}`, `Trạng thái: ${task.done ? "Done" : task.status}`].join("\n");
}

function setTaskForm(task) {
  document.querySelector("#taskEditId").value = task?.id || "";
  document.querySelector("#taskTitle").value = task?.title || "";
  document.querySelector("#taskDescription").value = task?.description || "";
  document.querySelector("#taskDue").value = task?.due || "2026-05-20";
  document.querySelector("#taskPriority").value = task?.priority || "Medium";
  document.querySelector("#taskFormTitle").textContent = task ? "Sửa công việc" : "Tạo công việc mới";
}

function renderPrompts() {
  const categories = ["all", "Marketing", "Content", "Ads", "Automation", "Favorite"];
  const filtered = state.prompts.filter((prompt) => {
    const categoryOk = state.promptFilter === "all" || prompt.category === state.promptFilter || (state.promptFilter === "Favorite" && prompt.favorite);
    return categoryOk && matchesSearch(prompt.title, prompt.body, prompt.category);
  });
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("terminal")} Prompt Library</span>
          <h1 class="headline">Thư viện <span class="highlight">Prompt AI</span></h1>
          <p class="subhead">Lọc prompt theo nhóm, đánh dấu yêu thích và copy nhanh nội dung.</p>
        </div>
      </div>
      <div class="controls">${segmented("prompt", categories.map((item) => [item, item === "all" ? "Tất cả" : item]), state.promptFilter)}</div>
      <div class="grid three-col">${filtered.length ? filtered.map(promptCard).join("") : `<div class="empty">Không có prompt phù hợp.</div>`}</div>
    </section>
  `;
}

function promptCard(prompt) {
  return `
    <article class="card pad prompt-card">
      <div class="row-between">
        <select class="prompt-category-input" data-prompt-category="${prompt.id}">
          ${["Marketing", "Content", "Ads", "Automation"].map((category) => `<option ${category === prompt.category ? "selected" : ""}>${category}</option>`).join("")}
        </select>
        <button class="favorite ${prompt.favorite ? "is-active" : ""}" type="button" data-favorite="${prompt.id}" aria-label="Yêu thích">${icon("star")}</button>
      </div>
      <input class="prompt-title-input" data-prompt-title="${prompt.id}" value="${escapeHtml(prompt.title)}" />
      <textarea class="prompt-body-input" data-prompt-body="${prompt.id}">${escapeHtml(prompt.body)}</textarea>
      <div class="prompt-actions">
        <button class="primary-button" type="button" data-copy-prompt="${prompt.id}">${icon("content_copy")} Copy Prompt</button>
        <button class="icon-button danger-button" type="button" data-delete-prompt="${prompt.id}" aria-label="Xóa prompt">${icon("delete")}</button>
      </div>
    </article>
  `;
}

function renderSimplePage() {
  const isSettings = state.page === "settings";
  return `<section class="page"><div class="page-header"><div><span class="eyebrow">${icon(isSettings ? "settings" : "help")} ${isSettings ? "Settings" : "Support"}</span><h1 class="headline">${isSettings ? "Cài đặt" : "Trung tâm hỗ trợ"}</h1><p class="subhead">Khu vực này đã được đặt chỗ để mở rộng sau.</p></div></div></section>`;
}

function bindViewEvents() {
  document.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => setPage(button.dataset.page)));
  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    await supabaseClient?.auth.signOut();
    showToast("Đã đăng xuất");
  });

  document.querySelector("#newNoteButton")?.addEventListener("click", () => {
    const colors = ["yellow", "blue", "green", "pink"];
    state.notes.unshift({
      id: crypto.randomUUID(),
      title: "Ghi chú mới",
      body: "",
      color: colors[state.notes.length % colors.length],
      pinned: false,
    });
    writeStore("ta.notes", state.notes);
    render();
  });
  document.querySelectorAll("[data-note-title], [data-note-body]").forEach((field) => {
    field.addEventListener("input", () => {
      const id = field.dataset.noteTitle || field.dataset.noteBody;
      const note = state.notes.find((item) => item.id === id);
      if (!note) return;
      if (field.dataset.noteTitle) note.title = field.value;
      if (field.dataset.noteBody) note.body = field.value;
      writeStore("ta.notes", state.notes);
    });
  });
  document.querySelectorAll("[data-note-color]").forEach((select) => {
    select.addEventListener("change", () => {
      const note = state.notes.find((item) => item.id === select.dataset.noteColor);
      if (!note) return;
      note.color = select.value;
      writeStore("ta.notes", state.notes);
      render();
    });
  });
  document.querySelectorAll("[data-pin-note]").forEach((button) => {
    button.addEventListener("click", () => {
      const note = state.notes.find((item) => item.id === button.dataset.pinNote);
      if (!note) return;
      note.pinned = !note.pinned;
      writeStore("ta.notes", state.notes);
      render();
    });
  });
  document.querySelectorAll("[data-delete-note]").forEach((button) => {
    button.addEventListener("click", () => {
      state.notes = state.notes.filter((item) => item.id !== button.dataset.deleteNote);
      state.selectedNoteId = state.notes[0]?.id || "";
      writeStore("ta.notes", state.notes);
      render();
    });
  });

  document.querySelector("#newDocumentButton")?.addEventListener("click", () => {
    const documentItem = {
      id: crypto.randomUUID(),
      title: "Tài liệu mới",
      type: "Doc",
      color: "blue",
      summary: "",
      sourceUrl: "",
      content: "<p>Bắt đầu viết hoặc dán nội dung tài liệu ở đây.</p>",
      updatedAt: new Date().toISOString(),
    };
    state.documents.unshift(documentItem);
    state.selectedDocumentId = documentItem.id;
    state.documentPanelOpen = true;
    state.documentFocusMode = false;
    localStorage.setItem("ta.selectedDocumentId", documentItem.id);
    writeStore("ta.documents", state.documents);
    render();
  });
  document.querySelectorAll("[data-open-document]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDocumentId = button.dataset.openDocument;
      state.documentPanelOpen = true;
      state.documentFocusMode = false;
      localStorage.setItem("ta.selectedDocumentId", state.selectedDocumentId);
      scheduleRemoteSave();
      render();
    });
  });
  document.querySelectorAll("[data-document-title], [data-document-summary], [data-document-source], [data-document-type], [data-document-color]").forEach((field) => {
    field.addEventListener("input", () => {
      const id = field.dataset.documentTitle || field.dataset.documentSummary || field.dataset.documentSource || field.dataset.documentType || field.dataset.documentColor;
      const documentItem = state.documents.find((item) => item.id === id);
      if (!documentItem) return;
      if (field.dataset.documentTitle) documentItem.title = field.value;
      if (field.dataset.documentSummary) documentItem.summary = field.value;
      if (field.dataset.documentSource) documentItem.sourceUrl = field.value;
      if (field.dataset.documentType) documentItem.type = field.value;
      if (field.dataset.documentColor) documentItem.color = field.value;
      documentItem.updatedAt = new Date().toISOString();
      writeStore("ta.documents", state.documents);
    });
  });
  document.querySelectorAll("[data-document-type], [data-document-color]").forEach((select) => {
    select.addEventListener("change", () => {
      const id = select.dataset.documentType || select.dataset.documentColor;
      const documentItem = state.documents.find((item) => item.id === id);
      if (!documentItem) return;
      if (select.dataset.documentType) documentItem.type = select.value;
      if (select.dataset.documentColor) documentItem.color = select.value;
      documentItem.updatedAt = new Date().toISOString();
      writeStore("ta.documents", state.documents);
      render();
    });
  });
  document.querySelectorAll("[data-document-content]").forEach((editor) => {
    editor.addEventListener("click", () => {
      if (!editor.hasAttribute("data-enter-document-focus")) return;
      state.documentFocusMode = true;
      render();
    });
    editor.addEventListener("input", () => {
      persistDocumentEditor(editor);
      hideDocumentSelectionMenu();
    });
    editor.addEventListener("mouseup", () => saveDocumentSelection(editor));
    editor.addEventListener("keyup", () => saveDocumentSelection(editor));
    editor.addEventListener("contextmenu", (event) => showDocumentSelectionMenu(editor, event));
    editor.addEventListener("click", () => hideDocumentSelectionMenu());
  });
  document.querySelector("#documentSelectionMenu")?.addEventListener("mousedown", (event) => event.preventDefault());
  document.querySelector("[data-exit-document-focus]")?.addEventListener("click", () => {
    state.documentFocusMode = false;
    hideDocumentSelectionMenu();
    render();
  });
  document.querySelector("[data-close-document]")?.addEventListener("click", () => {
    state.documentPanelOpen = false;
    state.documentFocusMode = false;
    hideDocumentSelectionMenu();
    render();
  });
  document.querySelectorAll("[data-document-heading]").forEach((button) => {
    button.addEventListener("click", () => {
      const editor = document.querySelector("[data-document-content]");
      const headings = editor ? [...editor.querySelectorAll("h1, h2, h3")] : [];
      const target = headings[Number(button.dataset.documentHeading)];
      (target || editor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  document.querySelectorAll("[data-doc-format], [data-doc-block], [data-doc-clear], [data-doc-link], [data-doc-image]").forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      if (button.dataset.docFormat) runDocumentCommand(button.dataset.docFormat);
      if (button.dataset.docBlock) runDocumentBlock(button.dataset.docBlock);
      if (button.hasAttribute("data-doc-clear")) runDocumentCommand("removeFormat");
      if (button.hasAttribute("data-doc-link")) {
        const url = window.prompt("Dán URL cần chèn");
        if (url) runDocumentCommand("createLink", url);
      }
      if (button.hasAttribute("data-doc-image")) {
        const url = window.prompt("Dán URL hình ảnh");
        if (url) runDocumentCommand("insertImage", url);
      }
    });
  });
  document.querySelectorAll("[data-copy-document]").forEach((button) => {
    button.addEventListener("click", () => {
      const documentItem = state.documents.find((item) => item.id === button.dataset.copyDocument);
      copyText(documentItem?.content?.replace(/<[^>]+>/g, " ") || documentItem?.sourceUrl || "", "Đã copy tài liệu");
    });
  });
  document.querySelectorAll("[data-open-document-source]").forEach((button) => {
    button.addEventListener("click", () => {
      const documentItem = state.documents.find((item) => item.id === button.dataset.openDocumentSource);
      if (documentItem?.sourceUrl) window.open(documentItem.sourceUrl, "_blank", "noopener,noreferrer");
    });
  });
  document.querySelectorAll("[data-delete-document]").forEach((button) => {
    button.addEventListener("click", () => {
      state.documents = state.documents.filter((item) => item.id !== button.dataset.deleteDocument);
      state.selectedDocumentId = state.documents[0]?.id || "";
      state.documentPanelOpen = false;
      state.documentFocusMode = false;
      localStorage.setItem("ta.selectedDocumentId", state.selectedDocumentId);
      writeStore("ta.documents", state.documents);
      render();
    });
  });

  document.querySelector("#newIdeaButton")?.addEventListener("click", () => {
    state.ideaFormOpen = !state.ideaFormOpen;
    render();
  });
  document.querySelector("#ideaForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.querySelector("#ideaTitle").value.trim();
    const url = document.querySelector("#ideaUrl").value.trim();
    if (!title || !url) return showToast("Nhập tiêu đề và link trước");
    state.ideas.unshift({
      id: crypto.randomUUID(),
      title,
      url,
      note: document.querySelector("#ideaNote").value.trim(),
      createdAt: new Date().toISOString(),
    });
    state.ideaFormOpen = false;
    writeStore("ta.ideas", state.ideas);
    render();
  });
  document.querySelectorAll("[data-copy-idea]").forEach((button) => {
    button.addEventListener("click", () => {
      const idea = state.ideas.find((item) => item.id === button.dataset.copyIdea);
      copyText(idea?.url || "", "Đã copy link idea");
    });
  });
  document.querySelectorAll("[data-delete-idea]").forEach((button) => {
    button.addEventListener("click", () => {
      state.ideas = state.ideas.filter((item) => item.id !== button.dataset.deleteIdea);
      writeStore("ta.ideas", state.ideas);
      render();
    });
  });

  document.querySelector("#alarmForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const time = document.querySelector("#alarmTime").value;
    const label = document.querySelector("#alarmLabel").value.trim();
    if (!time) return showToast("Chọn giờ báo thức trước");
    state.alarms.push({ id: crypto.randomUUID(), time, label, enabled: true, lastTriggered: "" });
    writeStore("ta.alarms", state.alarms);
    render();
  });
  document.querySelectorAll("[data-toggle-alarm]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const alarm = state.alarms.find((item) => item.id === checkbox.dataset.toggleAlarm);
      if (!alarm) return;
      alarm.enabled = checkbox.checked;
      alarm.lastTriggered = "";
      writeStore("ta.alarms", state.alarms);
      render();
    });
  });
  document.querySelectorAll("[data-delete-alarm]").forEach((button) => {
    button.addEventListener("click", () => {
      state.alarms = state.alarms.filter((item) => item.id !== button.dataset.deleteAlarm);
      writeStore("ta.alarms", state.alarms);
      render();
    });
  });
  document.querySelector("#countdownSetup")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const hours = Number(document.querySelector("#countdownHours").value || 0);
    const minutes = Number(document.querySelector("#countdownMinutes").value || 0);
    const seconds = Number(document.querySelector("#countdownSeconds").value || 0);
    const total = Math.max(1, (hours * 3600) + (minutes * 60) + seconds);
    state.countdownTotal = total;
    state.countdownRemaining = total;
    state.countdownRunning = false;
    persistTimers();
    updateClockDom();
  });
  document.querySelector("#toggleCountdown")?.addEventListener("click", () => {
    if (state.countdownRemaining <= 0) state.countdownRemaining = state.countdownTotal || 60;
    state.countdownRunning = !state.countdownRunning;
    render();
  });
  document.querySelector("#resetCountdown")?.addEventListener("click", () => {
    state.countdownRunning = false;
    state.countdownRemaining = state.countdownTotal || 25 * 60;
    persistTimers();
    render();
  });
  document.querySelector("#toggleStopwatch")?.addEventListener("click", () => {
    if (state.stopwatchRunning) {
      state.stopwatchElapsed = Date.now() - state.stopwatchStartedAt + state.stopwatchBase;
      state.stopwatchRunning = false;
    } else {
      state.stopwatchBase = state.stopwatchElapsed;
      state.stopwatchStartedAt = Date.now();
      state.stopwatchRunning = true;
    }
    persistTimers();
    render();
  });
  document.querySelector("#resetStopwatch")?.addEventListener("click", () => {
    state.stopwatchRunning = false;
    state.stopwatchElapsed = 0;
    state.stopwatchBase = 0;
    persistTimers();
    render();
  });
  document.querySelector("#lapStopwatch")?.addEventListener("click", () => {
    const list = document.querySelector("#lapList");
    if (!list) return;
    const lap = document.createElement("div");
    lap.className = "lap-item";
    lap.textContent = formatStopwatch(currentStopwatchElapsed());
    list.prepend(lap);
  });

  document.querySelector("#newCourseButton")?.addEventListener("click", () => {
    state.courseDraftMode = "create";
    state.courseFocus = false;
    render();
  });
  document.querySelector("#bigNewCourse")?.addEventListener("click", () => {
    state.courseDraftMode = "create";
    state.courseFocus = false;
    render();
  });
  document.querySelector("[data-course-list]")?.addEventListener("click", () => {
    state.courseDraftMode = "list";
    state.courseFocus = false;
    render();
  });
  document.querySelector("[data-toggle-course-read]")?.addEventListener("click", () => {
    state.courseDraftMode = state.courseDraftMode === "read" ? "edit" : "read";
    state.courseFocus = state.courseDraftMode === "read";
    render();
  });
  document.querySelectorAll("[data-nav-course]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!button.dataset.navCourse) return;
      state.selectedCourseId = button.dataset.navCourse;
      state.courseDraftMode = "edit";
      localStorage.setItem("ta.selectedCourseId", state.selectedCourseId);
      scheduleRemoteSave();
      render();
    });
  });
  document.querySelector("#exitCourseFocus")?.addEventListener("click", () => {
    state.courseFocus = false;
    render();
  });
  document.querySelector("[data-toggle-course-focus]")?.addEventListener("click", () => {
    state.courseFocus = !state.courseFocus;
    render();
  });
  document.querySelectorAll("[data-open-course]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCourseId = button.dataset.openCourse;
      state.courseDraftMode = "edit";
      localStorage.setItem("ta.selectedCourseId", state.selectedCourseId);
      scheduleRemoteSave();
      render();
    });
  });
  document.querySelector("#courseCreateForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.querySelector("#newCourseTitle").value.trim();
    if (!title) return showToast("Bạn cần nhập tên khóa học");
    const course = {
      id: crypto.randomUUID(),
      level: "course",
      title,
      description: document.querySelector("#newCourseDescription").value.trim(),
      image: document.querySelector("#newCourseImage").value.trim(),
      content: "",
      toc: [],
      children: [],
    };
    state.courses.unshift(course);
    state.selectedCourseId = course.id;
    state.courseDraftMode = "edit";
    localStorage.setItem("ta.selectedCourseId", course.id);
    writeStore("ta.courses", state.courses);
    render();
  });
  document.querySelectorAll("[data-course-title]").forEach((input) => {
    input.addEventListener("input", () => {
      const course = findCourse(input.dataset.courseTitle);
      course.title = input.value;
      writeStore("ta.courses", state.courses);
    });
  });
  document.querySelectorAll("[data-course-desc]").forEach((input) => {
    input.addEventListener("input", () => {
      const course = findCourse(input.dataset.courseDesc);
      course.description = input.value;
      writeStore("ta.courses", state.courses);
    });
  });
  document.querySelectorAll("[data-course-content]").forEach((editor) => {
    editor.addEventListener("input", () => {
      const course = findCourse(editor.dataset.courseContent);
      course.content = editor.innerHTML;
      syncTocWithEditor(course, editor);
      writeStore("ta.courses", state.courses);
      hideSelectionMenu();
    });
    editor.addEventListener("contextmenu", (event) => showSelectionMenu(editor, event));
    editor.addEventListener("click", () => hideSelectionMenu());
  });
  document.querySelector("#selectionMenu")?.addEventListener("mousedown", (event) => event.preventDefault());
  document.querySelectorAll("[data-format]").forEach((button) => {
    button.addEventListener("click", () => {
      document.execCommand(button.dataset.format, false, null);
      const editor = document.querySelector("[data-course-content]");
      const course = editor ? findCourse(editor.dataset.courseContent) : null;
      if (course && editor) {
        course.content = editor.innerHTML;
        writeStore("ta.courses", state.courses);
      }
    });
  });
  document.querySelector("[data-insert-image]")?.addEventListener("click", () => {
    const url = window.prompt("Dán URL hình ảnh");
    if (!url) return;
    document.execCommand("insertImage", false, url);
    const editor = document.querySelector("[data-course-content]");
    const course = editor ? findCourse(editor.dataset.courseContent) : null;
    if (course && editor) {
      course.content = editor.innerHTML;
      writeStore("ta.courses", state.courses);
    }
  });
  document.querySelectorAll("[data-mark-toc]").forEach((button) => {
    button.addEventListener("click", () => {
      const course = selectedCourse();
      const text = (state.pendingSelectionText || "").trim();
      if (!course || !text) return showToast("Bôi đen nội dung rồi bấm chuột phải ngay trên đoạn đã chọn");
      course.toc ||= [];
      course.toc.push({ id: crypto.randomUUID(), level: button.dataset.markToc, title: text, parentId: "", source: "selection" });
      state.pendingSelectionText = "";
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-add-toc]").forEach((button) => {
    button.addEventListener("click", () => {
      const course = findCourse(button.dataset.addToc);
      course.toc ||= [];
      course.toc.push({ id: crypto.randomUUID(), level: "chapter", title: tocTitle("chapter"), parentId: "" });
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-add-child-toc]").forEach((button) => {
    button.addEventListener("click", () => {
      const [courseId, tocId] = button.dataset.addChildToc.split(":");
      const course = findCourse(courseId);
      const parent = (course.toc || []).find((item) => item.id === tocId);
      const level = tocLevelAfter(parent?.level);
      const index = course.toc.findIndex((item) => item.id === tocId);
      course.toc.splice(index + 1, 0, { id: crypto.randomUUID(), level, title: tocTitle(level), parentId: tocId });
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-delete-toc]").forEach((button) => {
    button.addEventListener("click", () => {
      const [courseId, tocId] = button.dataset.deleteToc.split(":");
      const course = findCourse(courseId);
      course.toc = (course.toc || []).filter((item) => item.id !== tocId && item.parentId !== tocId);
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-focus-toc]").forEach((button) => {
    button.addEventListener("click", () => showToast(`Mục lục: ${button.dataset.focusToc}`));
  });
  document.querySelectorAll("[data-add-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      const course = findCourse(button.dataset.addChapter);
      course.children.push(createChapter(`Chương ${course.children.length + 1}`));
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-toggle-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      const [courseId, chapterId] = button.dataset.toggleChapter.split(":");
      const chapter = findCourseNode(courseId, chapterId);
      chapter.collapsed = !chapter.collapsed;
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-delete-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      const [courseId, chapterId] = button.dataset.deleteChapter.split(":");
      const course = findCourse(courseId);
      course.children = course.children.filter((chapter) => chapter.id !== chapterId);
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-chapter-title], [data-chapter-body], [data-chapter-summary], [data-chapter-materials]").forEach((field) => {
    field.addEventListener("input", () => {
      const key = field.dataset.chapterTitle ? "chapterTitle" : field.dataset.chapterBody ? "chapterBody" : field.dataset.chapterSummary ? "chapterSummary" : "chapterMaterials";
      const [courseId, chapterId] = field.dataset[key].split(":");
      const chapter = findCourseNode(courseId, chapterId);
      if (field.dataset.chapterTitle) chapter.title = field.value;
      if (field.dataset.chapterBody) chapter.body = field.value;
      if (field.dataset.chapterSummary) chapter.summary = field.value;
      if (field.dataset.chapterMaterials) chapter.materials = field.value;
      writeStore("ta.courses", state.courses);
    });
  });
  document.querySelectorAll("[data-outline-title]").forEach((input) => {
    input.addEventListener("input", () => {
      const [courseId, nodeId] = input.dataset.outlineTitle.split(":");
      findCourseNode(courseId, nodeId).title = input.value;
      writeStore("ta.courses", state.courses);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const [courseId, nodeId] = input.dataset.outlineTitle.split(":");
      const node = findCourseNode(courseId, nodeId);
      const course = findCourse(courseId);
      const newNode = createOutlineNode(node.level, nextTitle(node.level));
      insertAfter(course.children, nodeId, newNode);
      writeStore("ta.courses", state.courses);
      render();
      requestAnimationFrame(() => document.querySelector(`[data-outline-title="${courseId}:${newNode.id}"]`)?.focus());
    });
  });
  document.querySelectorAll("[data-add-child-row]").forEach((button) => {
    button.addEventListener("click", () => {
      const [courseId, nodeId] = button.dataset.addChildRow.split(":");
      const node = findCourseNode(courseId, nodeId);
      const level = levelOrder[Math.min(levelOrder.indexOf(node.level) + 1, levelOrder.length - 1)];
      const child = createOutlineNode(level, nextTitle(level));
      node.children.push(child);
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-indent-node]").forEach((button) => button.addEventListener("click", () => {
    const [courseId, nodeId] = button.dataset.indentNode.split(":");
    indentNode(courseId, nodeId);
  }));
  document.querySelectorAll("[data-outdent-node]").forEach((button) => button.addEventListener("click", () => {
    const [courseId, nodeId] = button.dataset.outdentNode.split(":");
    outdentNode(courseId, nodeId);
  }));
  document.querySelectorAll("[data-delete-node]").forEach((button) => button.addEventListener("click", () => {
    const [courseId, nodeId] = button.dataset.deleteNode.split(":");
    const course = findCourse(courseId);
    removeNode(course.children, nodeId);
    writeStore("ta.courses", state.courses);
    render();
  }));
  document.querySelectorAll("[data-delete-course]").forEach((button) => button.addEventListener("click", () => {
    state.courses = state.courses.filter((course) => course.id !== button.dataset.deleteCourse);
    state.selectedCourseId = state.courses[0]?.id || "";
    writeStore("ta.courses", state.courses);
    render();
  }));

  const adsForm = document.querySelector("#adsForm");
  if (adsForm) {
    const preview = () => {
      const value = [
        document.querySelector("#adsDate").value,
        document.querySelector("#adsCampaign").value,
        document.querySelector("#adsContent").value,
        document.querySelector("#adsAudience").value,
      ].map(normalizeAdPart).filter(Boolean).join("_");
      document.querySelector("#adPreview").textContent = value || "Nhập đủ thông tin để tạo tên quảng cáo";
    };
    adsForm.addEventListener("input", preview);
    document.querySelector("#copyAdName").addEventListener("click", () => copyText(document.querySelector("#adPreview").textContent, "Đã copy tên Ads"));
    preview();
  }

  document.querySelector("#contentPlanForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const topic = document.querySelector("#planTopic").value.trim();
    if (!topic) return showToast("Bạn cần nhập topic");
    state.contentPlans.push({
      id: crypto.randomUUID(),
      date: document.querySelector("#planDate").value,
      channel: document.querySelector("#planChannel").value,
      topic,
      status: "Draft",
    });
    writeStore("ta.contentPlans", state.contentPlans);
    render();
  });
  document.querySelectorAll("[data-copy-plan]").forEach((button) => button.addEventListener("click", () => {
    const plan = state.contentPlans.find((item) => item.id === button.dataset.copyPlan);
    copyText(`${plan.date} - ${plan.channel} - ${plan.topic}`, "Đã copy content plan");
  }));
  document.querySelectorAll("[data-delete-plan]").forEach((button) => button.addEventListener("click", () => {
    state.contentPlans = state.contentPlans.filter((item) => item.id !== button.dataset.deletePlan);
    writeStore("ta.contentPlans", state.contentPlans);
    render();
  }));

  document.querySelectorAll("[data-segmented='task'] button").forEach((button) => button.addEventListener("click", () => {
    state.taskFilter = button.dataset.value;
    render();
  }));
  document.querySelectorAll("[data-task-toggle]").forEach((checkbox) => checkbox.addEventListener("change", () => {
    const task = state.tasks.find((item) => item.id === checkbox.dataset.taskToggle);
    task.done = checkbox.checked;
    task.status = checkbox.checked ? "completed" : "today";
    writeStore("ta.tasks", state.tasks);
    render();
  }));
  document.querySelector("#taskForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.querySelector("#taskTitle").value.trim();
    if (!title) return showToast("Bạn cần nhập tiêu đề công việc");
    const editId = document.querySelector("#taskEditId").value;
    const payload = {
      title,
      description: document.querySelector("#taskDescription").value.trim() || "Chưa có mô tả.",
      due: document.querySelector("#taskDue").value,
      priority: document.querySelector("#taskPriority").value,
    };
    if (editId) {
      const task = state.tasks.find((item) => item.id === editId);
      if (task && !isReportTask(task)) Object.assign(task, payload);
    } else {
      state.tasks.unshift({ id: crypto.randomUUID(), ...payload, status: "today", done: false });
    }
    writeStore("ta.tasks", state.tasks);
    render();
  });
  document.querySelector("#resetTaskForm")?.addEventListener("click", () => setTaskForm(null));
  document.querySelectorAll("[data-edit-task]").forEach((button) => button.addEventListener("click", () => {
    const task = state.tasks.find((item) => item.id === button.dataset.editTask);
    if (task && !isReportTask(task)) setTaskForm(task);
  }));
  document.querySelectorAll("[data-copy-task]").forEach((button) => button.addEventListener("click", () => {
    const task = state.tasks.find((item) => item.id === button.dataset.copyTask);
    copyText(taskCopyText(task), "Đã copy công việc");
  }));
  document.querySelectorAll("[data-delete-task]").forEach((button) => button.addEventListener("click", () => {
    state.tasks = state.tasks.filter((item) => item.id !== button.dataset.deleteTask);
    writeStore("ta.tasks", state.tasks);
    render();
  }));

  document.querySelectorAll("[data-segmented='prompt'] button").forEach((button) => button.addEventListener("click", () => {
    state.promptFilter = button.dataset.value;
    render();
  }));
  document.querySelectorAll("[data-favorite]").forEach((button) => button.addEventListener("click", () => {
    const prompt = state.prompts.find((item) => item.id === button.dataset.favorite);
    prompt.favorite = !prompt.favorite;
    writeStore("ta.prompts", state.prompts);
    render();
  }));
  document.querySelectorAll("[data-prompt-title], [data-prompt-body], [data-prompt-category]").forEach((field) => {
    field.addEventListener("input", () => {
      const id = field.dataset.promptTitle || field.dataset.promptBody || field.dataset.promptCategory;
      const prompt = state.prompts.find((item) => item.id === id);
      if (field.dataset.promptTitle) prompt.title = field.value;
      if (field.dataset.promptBody) prompt.body = field.value;
      if (field.dataset.promptCategory) prompt.category = field.value;
      writeStore("ta.prompts", state.prompts);
    });
  });
  document.querySelectorAll("[data-copy-prompt]").forEach((button) => button.addEventListener("click", () => {
    const prompt = state.prompts.find((item) => item.id === button.dataset.copyPrompt);
    copyText(prompt.body, "Đã copy prompt");
  }));
  document.querySelectorAll("[data-delete-prompt]").forEach((button) => button.addEventListener("click", () => {
    state.prompts = state.prompts.filter((item) => item.id !== button.dataset.deletePrompt);
    writeStore("ta.prompts", state.prompts);
    render();
  }));
}

searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  render();
});

document.querySelector("#menuButton").addEventListener("click", () => {
  document.body.classList.toggle("menu-open");
});

document.querySelector("#zoomIn")?.addEventListener("click", () => changeZoom(0.05));
document.querySelector("#zoomOut")?.addEventListener("click", () => changeZoom(-0.05));

function currentStopwatchElapsed() {
  return state.stopwatchRunning ? Date.now() - state.stopwatchStartedAt + state.stopwatchBase : state.stopwatchElapsed;
}

function persistTimers() {
  localStorage.setItem("ta.countdownTotal", String(state.countdownTotal));
  localStorage.setItem("ta.countdownRemaining", String(Math.max(0, Math.floor(state.countdownRemaining))));
  localStorage.setItem("ta.stopwatchElapsed", String(Math.floor(state.stopwatchElapsed)));
}

function updateClockDom() {
  const now = new Date();
  const digital = document.querySelector("#digitalClock");
  if (digital) digital.textContent = now.toLocaleTimeString("vi-VN", { hour12: false });
  const date = document.querySelector("#clockDate");
  if (date) date.textContent = now.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const sidebarClock = document.querySelector("#sidebarClock");
  if (sidebarClock) sidebarClock.textContent = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const sidebarClockDate = document.querySelector("#sidebarClockDate");
  if (sidebarClockDate) sidebarClockDate.textContent = now.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });

  const countdown = document.querySelector("#countdownDisplay");
  if (countdown) countdown.textContent = formatDuration(state.countdownRemaining);
  const countdownStatus = document.querySelector("#countdownStatus");
  if (countdownStatus) countdownStatus.textContent = state.countdownRunning ? "Running" : "Ready";

  const stopwatch = document.querySelector("#stopwatchDisplay");
  if (stopwatch) stopwatch.textContent = formatStopwatch(currentStopwatchElapsed());
  const stopwatchStatus = document.querySelector("#stopwatchStatus");
  if (stopwatchStatus) stopwatchStatus.textContent = state.stopwatchRunning ? "Running" : "Ready";
}

function tickClock() {
  const before = Math.ceil(state.countdownRemaining);
  if (state.countdownRunning) {
    state.countdownRemaining = Math.max(0, state.countdownRemaining - 1);
    if (before > 0 && state.countdownRemaining <= 0) {
      state.countdownRunning = false;
      persistTimers();
      triggerAlert("Đếm ngược đã kết thúc");
      render();
      return;
    }
    persistTimers();
  }

  if (state.stopwatchRunning) {
    localStorage.setItem("ta.stopwatchElapsed", String(Math.floor(currentStopwatchElapsed())));
  }

  checkAlarms();
  updateClockDom();
}

function checkAlarms() {
  if (!state.alarms.length) return;
  const now = new Date();
  const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const today = now.toISOString().slice(0, 10);
  let changed = false;
  state.alarms.forEach((alarm) => {
    if (!alarm.enabled || alarm.time !== current || alarm.lastTriggered === today) return;
    alarm.lastTriggered = today;
    changed = true;
    triggerAlert(alarm.label ? `Báo thức: ${alarm.label}` : `Báo thức ${alarm.time}`);
  });
  if (changed) writeStore("ta.alarms", state.alarms);
}

function triggerAlert(message) {
  showToast(message);
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.8);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.85);
  } catch {}
}

window.setInterval(tickClock, 1000);
applyZoom();
updateClockDom();
render();
(async () => {
  if (await initSupabase()) {
    render();
    await loadRemoteState();
  }
})();
