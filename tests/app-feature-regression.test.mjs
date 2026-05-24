import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const server = readFileSync(new URL("../dev-server.js", import.meta.url), "utf8");
const vercelConfig = readFileSync(new URL("../vercel.json", import.meta.url), "utf8");
const knowledgeSeeds = readFileSync(new URL("../knowledge-seeds.js", import.meta.url), "utf8");

test("documents and ideas are first-class app pages", () => {
  assert.match(app, /id:\s*"documents"/);
  assert.match(app, /id:\s*"ideas"/);
  assert.match(app, /documents:\s*mergeKnowledgeDocuments\(readStore\("ta\.documents"/);
  assert.match(app, /ideas:\s*readStore\("ta\.ideas"/);
  assert.match(app, /renderDocuments/);
  assert.match(app, /renderIdeas/);
});

test("navigation is organized into module spaces with calendar as home", () => {
  assert.match(app, /moduleSpaces/);
  assert.match(app, /Không gian nội dung/);
  assert.match(app, /Không gian vận hành/);
  assert.match(app, /path:\s*"\/noi-dung"/);
  assert.match(app, /path:\s*"\/van-hanh"/);
  assert.match(app, /pageFromPath/);
  assert.match(app, /routeForPage/);
  assert.match(app, /canonicalPathForCurrentRoute/);
  assert.match(app, /history\.pushState/);
  assert.match(app, /history\.replaceState/);
  assert.match(app, /popstate/);
  assert.doesNotMatch(app, /renderModuleSpace/);
  assert.match(app, /id:\s*"calendar",\s*label:\s*"Home"/);
  assert.match(app, /home-page-link/);
  assert.match(app, /nav-section/);
  assert.match(app, /pageId:\s*"noi-dung"/);
  assert.match(app, /pageId:\s*"van-hanh"/);
  assert.match(app, /data-page="\$\{space\.pages\[0\]\}"/);
  assert.match(styles, /\.home-page-link/);
  assert.match(styles, /\.nav-section/);
  assert.doesNotMatch(styles, /\.module-space-page/);
  assert.doesNotMatch(styles, /\.module-launch-grid/);
  assert.match(server, /index\.html/);
  assert.match(server, /fallback/);
  assert.match(vercelConfig, /rewrites/);
  assert.match(vercelConfig, /index\.html/);
});

test("document modules open inline and support rich editing", () => {
  assert.match(app, /data-open-document/);
  assert.match(app, /data-document-content/);
  assert.match(app, /contenteditable="true"/);
  assert.match(app, /data-document-color/);
  assert.match(app, /documentTocItems/);
  assert.match(app, /data-document-heading/);
  assert.match(styles, /\.document-toc/);
  assert.match(styles, /\.document-color-blue/);
  assert.match(app, /data-doc-format="bold"/);
  assert.match(app, /data-doc-format="italic"/);
  assert.match(app, /data-doc-format="underline"/);
  assert.match(app, /data-doc-format="insertUnorderedList"/);
  assert.match(app, /data-doc-format="insertOrderedList"/);
  assert.match(app, /data-doc-block="h2"/);
  assert.match(app, /data-doc-block="blockquote"/);
  assert.match(app, /showDocumentSelectionMenu/);
});

test("document dashboard stays as a board with folders", () => {
  assert.doesNotMatch(app, /has-active-document/);
  assert.doesNotMatch(app, /document-reader/);
  assert.match(app, /document-board/);
  assert.match(app, /document-folder-bar/);
  assert.match(app, /document-folder-form/);
  assert.match(app, /newDocumentFolderButton/);
  assert.match(app, /documentFolderFormOpen/);
  assert.match(app, /documentFolderForm/);
  assert.doesNotMatch(app, /prompt\("Tên thư mục tài liệu"/);
  assert.match(app, /data-document-folder/);
  assert.match(styles, /\.document-board/);
  assert.match(styles, /\.document-folder-bar/);
  assert.match(styles, /\.document-folder-form/);
});

test("document editor supports tables, mind maps, and pasted images", () => {
  assert.match(app, /data-doc-table/);
  assert.match(app, /data-doc-mindmap/);
  assert.match(app, /insertDocumentTable/);
  assert.match(app, /insertDocumentMindMap/);
  assert.match(app, /handleDocumentPaste/);
  assert.match(app, /sanitizeDocumentContent/);
  assert.match(app, /data-doc-ephemeral-image/);
  assert.match(app, /FileReader/);
  assert.match(styles, /\.document-table/);
  assert.match(styles, /\.document-mindmap/);
});

test("idea cards include link thumbnails", () => {
  assert.doesNotMatch(app, /id="ideaThumbnail"/);
  assert.doesNotMatch(app, /data-idea-thumbnail/);
  assert.match(app, /ideaThumbnailUrl/);
  assert.match(app, /idea-thumbnail/);
  assert.match(app, /idea-card-actions/);
  assert.doesNotMatch(app, /Copy link<\/button>/);
  assert.match(styles, /\.idea-thumbnail/);
  assert.match(styles, /\.idea-card-actions/);
});

test("remote sync success toast is not shown after loading database state", () => {
  assert.doesNotMatch(app, /Da dong bo du lieu tu Supabase/);
});

test("sidebar shows a persistent clock", () => {
  assert.match(html, /id="sidebarClock"/);
  assert.match(html, /id="sidebarClockDate"/);
  assert.match(app, /#sidebarClock/);
  assert.match(app, /#sidebarClockDate/);
  assert.match(styles, /\.sidebar-clock/);
});

test("auth screen hides app chrome and keeps login card readable", () => {
  assert.match(app, /auth-focus/);
  assert.match(app, /Bản quyền The Anh Marketing/);
  assert.doesNotMatch(app, /Supabase Auth/);
  assert.match(app, /data-auth-action="login"/);
  assert.match(app, /data-auth-action="register"/);
  assert.match(app, /emailRedirectTo/);
  assert.doesNotMatch(app, /toggleAuthMode/);
  assert.match(styles, /body\.auth-focus \.sidebar/);
  assert.match(styles, /body\.auth-focus \.topbar/);
  assert.match(styles, /body\.auth-focus \.shell/);
  assert.match(styles, /\.auth-card \.headline/);
  assert.match(styles, /letter-spacing:\s*0/);
});

test("dashboard reports counts and ratios for core modules", () => {
  assert.match(app, /function countBy/);
  assert.match(app, /function ideaCategory/);
  assert.match(app, /function ratioRows/);
  assert.match(app, /function reportCard/);
  assert.match(app, /Notes/);
  assert.match(app, /Tài liệu/);
  assert.match(app, /Idea/);
  assert.match(app, /Prompt/);
  assert.match(app, /Task/);
  assert.match(styles, /\.dashboard-reports/);
  assert.match(styles, /\.ratio-track/);
});

test("document content can expand into full-page focus mode", () => {
  assert.match(app, /documentFocusMode/);
  assert.match(app, /document-focus-page/);
  assert.match(app, /data-exit-document-focus/);
  assert.match(app, /document-focus/);
  assert.match(styles, /body\.document-focus \.sidebar/);
  assert.match(styles, /\.document-focus-page/);
  assert.match(styles, /\.document-focus-editor/);
});

test("AI Master knowledge documents are bundled into the document library", () => {
  assert.match(html, /knowledge-seeds\.js/);
  assert.match(app, /TA_KNOWLEDGE_DOCUMENTS/);
  assert.match(app, /mergeKnowledgeDocuments/);
  assert.match(app, /knowledgeDocumentsChanged/);
  assert.match(knowledgeSeeds, /Master Plan - Hệ phễu khóa học AI Growth/);
  assert.match(knowledgeSeeds, /Outline khóa học theo 3 tầng phễu/);
  assert.match(knowledgeSeeds, /Spec landing page - AI Master x10/);
  assert.match(knowledgeSeeds, /Outline quay khóa - AI Master x10 Hiệu Suất/);
  assert.match(knowledgeSeeds, /knowledge-tiktok-38-cach-mo-dau/);
  assert.match(knowledgeSeeds, /knowledge-quy-trinh-dua-du-lieu-len-app/);
  assert.match(knowledgeSeeds, /document-table/);
});
