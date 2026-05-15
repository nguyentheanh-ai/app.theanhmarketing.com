const pages = [
  { id: "dashboard", label: "Analytics", title: "Dashboard tổng quan", icon: "monitoring" },
  { id: "courses", label: "Courses", title: "Quản lý khóa học", icon: "school" },
  { id: "content", label: "Plan Content", title: "Kế hoạch nội dung", icon: "edit_calendar" },
  { id: "calendar", label: "Calendar", title: "Lịch triển khai", icon: "calendar_month" },
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

const state = {
  page: localStorage.getItem("ta.page") || "dashboard",
  search: "",
  taskFilter: "today",
  promptFilter: "all",
  selectedCourseId: localStorage.getItem("ta.selectedCourseId") || "",
  courseDraftMode: "list",
  courseFocus: false,
  courseReadMode: false,
  authUser: null,
  authReady: false,
  tasks: readStore("ta.tasks", seedTasks()),
  prompts: readStore("ta.prompts", seedPrompts()),
  courses: normalizeCourses(readStore("ta.courses", seedCourses())),
  contentPlans: readStore("ta.contentPlans", seedContentPlans()),
};

const app = document.querySelector("#app");
const nav = document.querySelector("#nav");
const pageTitle = document.querySelector("#pageTitle");
const searchInput = document.querySelector("#globalSearch");
const toast = document.querySelector("#toast");

if (!state.selectedCourseId && state.courses[0]) state.selectedCourseId = state.courses[0].id;

const remoteStateTable = "app_state";
let remoteStateId = "local-default";
let supabaseClient = null;
let remoteSaveTimer = null;
let remoteReady = false;
let remoteLoading = false;
let remoteErrorShown = false;

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
      body: "Tạo 12 angle quảng cáo Facebook cho [khóa học], chia theo vấn đề, kết quả mong muốn, social proof và ưu đãi giới hạn.",
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

function seedContentPlans() {
  return [
    { id: crypto.randomUUID(), date: "2026-05-18", channel: "Facebook", topic: "Case study học viên", courseId: "", status: "Draft" },
    { id: crypto.randomUUID(), date: "2026-05-20", channel: "TikTok", topic: "Hook video AI Marketing", courseId: "", status: "Scheduled" },
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
    courses: state.courses,
    contentPlans: state.contentPlans,
    selectedCourseId: state.selectedCourseId,
  };
}

function applyRemoteState(payload) {
  if (!payload || typeof payload !== "object") return false;
  remoteLoading = true;
  if (Array.isArray(payload.tasks)) state.tasks = payload.tasks;
  if (Array.isArray(payload.prompts)) state.prompts = payload.prompts;
  if (Array.isArray(payload.courses)) state.courses = normalizeCourses(payload.courses);
  if (Array.isArray(payload.contentPlans)) state.contentPlans = payload.contentPlans;
  if (typeof payload.selectedCourseId === "string") state.selectedCourseId = payload.selectedCourseId;
  if (!state.selectedCourseId && state.courses[0]) state.selectedCourseId = state.courses[0].id;
  localStorage.setItem("ta.tasks", JSON.stringify(state.tasks));
  localStorage.setItem("ta.prompts", JSON.stringify(state.prompts));
  localStorage.setItem("ta.courses", JSON.stringify(state.courses));
  localStorage.setItem("ta.contentPlans", JSON.stringify(state.contentPlans));
  localStorage.setItem("ta.selectedCourseId", state.selectedCourseId);
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
  if (data?.payload && applyRemoteState(data.payload)) {
    render();
    showToast("Da dong bo du lieu tu Supabase");
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
  writeStore("ta.courses", state.courses);
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
  if (page === "courses") {
    state.courseDraftMode = "list";
    state.courseFocus = false;
  }
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
    courses: "Tìm khóa học, chương, bài...",
    content: "Tìm kế hoạch content...",
    calendar: "Tìm lịch...",
    ads: "Tìm trong công cụ...",
    tasks: "Tìm công việc...",
    prompts: "Tìm prompt...",
  }[state.page] || "Tìm kiếm...";
  app.innerHTML = {
    dashboard: renderDashboard,
    courses: renderCourses,
    content: renderContentPlan,
    calendar: renderCalendar,
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
        <p class="subhead">Đăng nhập hoặc tạo tài khoản để lưu Courses, Tasks, Prompts và Plan Content lên Supabase.</p>
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
  const toc = state.courses.flatMap((course) => course.toc || []);
  const chapters = toc.filter((item) => item.level === "chapter");
  const lessons = toc.filter((item) => item.level === "lesson");
  const sections = toc.filter((item) => item.level === "section");
  return { courses: state.courses.length, chapters: chapters.length, lessons: lessons.length, sections: sections.length, prompts: state.prompts.length };
}

function renderDashboard() {
  const done = state.tasks.filter((task) => task.done).length;
  const completion = Math.round((done / Math.max(state.tasks.length, 1)) * 100);
  const stats = courseStats();
  const revenue = [240, 310, 420, 390, 520, 610, 720, 790];
  const max = Math.max(...revenue);
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("bolt")} Live Updates</span>
          <h1 class="headline">Dashboard <span class="highlight">Tổng Quan</span></h1>
          <p class="subhead">Thống kê khóa học, prompt, content plan, calendar và task trong một dashboard.</p>
        </div>
        <button class="primary-button" type="button" data-page="courses">${icon("add")} Thêm khóa học</button>
      </div>
      <div class="grid metrics">
        ${metric("school", "Khóa học", stats.courses, `${stats.chapters} chương`, "pill")}
        ${metric("library_books", "Tổng số chương", stats.chapters, "đang soạn", "pill")}
        ${metric("terminal", "Prompt AI", stats.prompts, `${state.prompts.filter((item) => item.favorite).length} favorite`, "pill")}
        ${metric("speed", "Hoàn thành công việc", `${completion}%`, `${done}/${state.tasks.length}`, "pill")}
      </div>
      <div class="grid two-col">
        <article class="card pad">
          <div class="row-between">
            <div>
              <h3>Xu hướng doanh thu</h3>
              <p class="muted">So sánh hiệu suất 8 kỳ gần nhất.</p>
            </div>
            <span class="pill">2026</span>
          </div>
          <div class="chart">${revenue.map((item) => `<div class="bar" style="height:${(item / max) * 100}%"><span>${item}M</span></div>`).join("")}</div>
        </article>
        <aside class="card pad">
          <h3>Hoạt động gần đây</h3>
          <div class="list">
            ${activity("school", `${stats.chapters} chương trong ${stats.courses} khóa`, "Bài/mục/đoạn được người dùng tự nhập trong từng chương.")}
            ${activity("edit_calendar", `${state.contentPlans.length} kế hoạch content`, "Plan Content được đưa vào Calendar theo ngày.")}
            ${activity("campaign", "Ads Tool đã liên kết khóa học", "Dropdown khóa học lấy từ Courses.")}
          </div>
        </aside>
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
  const selected = selectedCourse();
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("campaign")} Ads Tool</span>
          <h1 class="headline">Công cụ <span class="highlight">Marketing</span></h1>
          <p class="subhead">Tên khóa học được lấy trực tiếp từ Courses.</p>
        </div>
      </div>
      <div class="grid two-col">
        <form class="card pad form-grid" id="adsForm">
          ${field("Ngày", "adsDate", "date", "2026-05-15")}
          <div class="field">
            <label for="adsCourse">Khóa học</label>
            <select id="adsCourse">${state.courses.map((course) => `<option value="${escapeHtml(course.title)}" ${course.id === selected?.id ? "selected" : ""}>${escapeHtml(course.title)}</option>`).join("")}</select>
          </div>
          ${field("Content", "adsContent", "text", "Video-Viral-01")}
          ${field("Tệp", "adsAudience", "text", "LAL-1-3")}
          <button class="primary-button" type="button" id="copyAdName">${icon("content_copy")} Copy tên Ads</button>
        </form>
        <aside class="card pad">
          <h3>Tên quảng cáo</h3>
          <div class="preview-box" id="adPreview"></div>
          <p class="muted">Đổi khóa học bên Courses thì danh sách này tự cập nhật.</p>
        </aside>
      </div>
    </section>
  `;
}

function field(label, id, type, value) {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${escapeHtml(value)}" /></div>`;
}

function normalizeAdPart(value = "") {
  return String(value).trim().replace(/\s+/g, "_").replace(/_+/g, "_");
}

function renderContentPlan() {
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("edit_calendar")} Plan Content</span>
          <h1 class="headline">Kế hoạch <span class="highlight">Content</span></h1>
          <p class="subhead">Lên topic theo ngày, kênh và khóa học. Calendar sẽ lấy dữ liệu từ đây.</p>
        </div>
      </div>
      <div class="grid two-col">
        <div class="list">${state.contentPlans.filter((plan) => matchesSearch(plan.topic, plan.channel, courseName(plan.courseId))).map(planCard).join("")}</div>
        <form class="card pad form-grid" id="contentPlanForm">
          <h3>Thêm kế hoạch</h3>
          ${field("Ngày", "planDate", "date", "2026-05-20")}
          ${field("Topic", "planTopic", "text", "")}
          <div class="field"><label for="planChannel">Kênh</label><select id="planChannel"><option>Facebook</option><option>TikTok</option><option>LinkedIn</option><option>Email</option><option>Blog</option></select></div>
          <div class="field"><label for="planCourse">Khóa học</label><select id="planCourse"><option value="">Không gắn khóa</option>${state.courses.map((course) => `<option value="${course.id}">${escapeHtml(course.title)}</option>`).join("")}</select></div>
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
        <p>${new Date(plan.date).toLocaleDateString("vi-VN")} · ${escapeHtml(courseName(plan.courseId) || "Không gắn khóa")}</p>
        <div class="item-actions task-actions">
          <button class="icon-button" type="button" data-copy-plan="${plan.id}" aria-label="Copy">${icon("content_copy")}</button>
          <button class="icon-button danger-button" type="button" data-delete-plan="${plan.id}" aria-label="Xóa">${icon("delete")}</button>
        </div>
      </div>
    </article>
  `;
}

function courseName(courseId) {
  return state.courses.find((course) => course.id === courseId)?.title || "";
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
            <p>${escapeHtml(plan.channel)} · ${escapeHtml(courseName(plan.courseId) || "Content chung")}</p>
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
      <button class="primary-button" type="button" data-copy-prompt="${prompt.id}">${icon("content_copy")} Copy Prompt</button>
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
      const value = [adsDate.value, adsCourse.value, adsContent.value, adsAudience.value].map(normalizeAdPart).filter(Boolean).join("_");
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
      courseId: document.querySelector("#planCourse").value,
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
}

searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  render();
});

document.querySelector("#menuButton").addEventListener("click", () => {
  document.body.classList.toggle("menu-open");
});

render();
(async () => {
  if (await initSupabase()) {
    render();
    await loadRemoteState();
  }
})();
