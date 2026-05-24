import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const knowledgeSeeds = readFileSync(new URL("../knowledge-seeds.js", import.meta.url), "utf8");

test("documents and ideas are first-class app pages", () => {
  assert.match(app, /id:\s*"documents"/);
  assert.match(app, /id:\s*"ideas"/);
  assert.match(app, /documents:\s*mergeKnowledgeDocuments\(readStore\("ta\.documents"/);
  assert.match(app, /ideas:\s*readStore\("ta\.ideas"/);
  assert.match(app, /renderDocuments/);
  assert.match(app, /renderIdeas/);
});

test("document modules open inline and support rich editing", () => {
  assert.match(app, /data-open-document/);
  assert.match(app, /documentPanelOpen/);
  assert.match(app, /state\.documentPanelOpen \? selectedDocument\(\) : null/);
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
  assert.match(app, /data-enter-document-focus/);
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
  assert.match(knowledgeSeeds, /document-table/);
});
