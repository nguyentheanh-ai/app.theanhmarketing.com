import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sourceRoot = "E:/Kinh doanh/AI_Growth_Course_Funnel";
const docs = [
  {
    id: "knowledge-ai-growth-master-plan",
    title: "Master Plan - Hệ phễu khóa học AI Growth",
    type: "Kế hoạch",
    color: "blue",
    summary: "Kế hoạch tổng thể cho hệ khóa học, thang giá, phễu sản phẩm và thứ tự triển khai.",
    sourcePath: `${sourceRoot}/00_MASTER_PLAN.md`,
  },
  {
    id: "knowledge-outline-khoa-hoc-3-tang",
    title: "Outline khóa học theo 3 tầng phễu",
    type: "Outline",
    color: "green",
    summary: "Danh sách khóa học, lời hứa, module chính và logic upsell giữa các sản phẩm.",
    sourcePath: `${sourceRoot}/02_OUTLINE_KHOA_HOC.md`,
  },
  {
    id: "knowledge-spec-landing-ai-master-x10",
    title: "Spec landing page - AI Master x10",
    type: "Tài liệu",
    color: "yellow",
    summary: "Mô tả chi tiết để designer/dev dựng landing page AI Master x10 theo mẫu tham chiếu.",
    sourcePath: `${sourceRoot}/docs/SPEC_LANDING_PAGE_AI_MASTER_X10.md`,
  },
  {
    id: "knowledge-outline-quay-ai-master-x10",
    title: "Outline quay khóa - AI Master x10 Hiệu Suất",
    type: "Giáo trình",
    color: "pink",
    summary: "Giáo án quay từng bài: mục tiêu, nội dung cần nói, demo, bài tập và đầu ra học viên.",
    sourcePath: `${sourceRoot}/docs/OUTLINE_QUAY_KHOA_AI_MASTER_X10.md`,
  },
  {
    id: "knowledge-tiktok-38-cach-mo-dau",
    title: "Bảng tổng hợp 38 cách mở đầu TikTok",
    type: "Content",
    color: "purple",
    summary: "Bảng thực chiến gồm 38 cách mở đầu TikTok, tâm lý kích hoạt, công thức hook, ví dụ và gợi ý áp dụng.",
    sourcePath: `${sourceRoot}/docs/BANG_TONG_HOP_CACH_MO_DAU_TIKTOK.md`,
  },
];

function readMarkdown(path) {
  return readFileSync(path, "utf8").replace(/^\uFEFF/, "");
}

function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(value = "") {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function parseTableCells(line) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line) {
  return /^\|?[\s:|-]+\|[\s:|-]+/.test(line);
}

function renderMarkdownTable(rows) {
  const [headerLine, separatorLine, ...bodyLines] = rows;
  const header = parseTableCells(headerLine);
  const body = isTableSeparator(separatorLine) ? bodyLines : [separatorLine, ...bodyLines];
  return [
    '<div class="document-table-wrap"><table class="document-table">',
    `<thead><tr>${header.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead>`,
    `<tbody>${body
      .filter((line) => !isTableSeparator(line))
      .map((line) => `<tr>${parseTableCells(line).map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`)
      .join("")}</tbody>`,
    "</table></div>",
  ].join("\n");
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith("# ")) {
      closeList();
      html.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("### ")) {
      closeList();
      html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("- ")) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }
    if (line.startsWith("|")) {
      closeList();
      const tableRows = [line];
      while (lines[index + 1]?.trim().startsWith("|")) {
        index += 1;
        tableRows.push(lines[index].trim());
      }
      html.push(renderMarkdownTable(tableRows));
      continue;
    }
    closeList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  closeList();
  return html.join("\n");
}

function buildDocument(doc) {
  const markdown = readMarkdown(doc.sourcePath);
  const content = markdownToHtml(markdown);
  return {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    color: doc.color,
    summary: doc.summary,
    sourceUrl: "",
    content,
    updatedAt: "2026-05-24T00:00:00.000Z",
  };
}

const output = `// Generated by scripts/build-knowledge-seeds.mjs. Do not edit by hand.
window.TA_KNOWLEDGE_DOCUMENTS = ${JSON.stringify(docs.map(buildDocument), null, 2)};
`;

writeFileSync(resolve("knowledge-seeds.js"), output, "utf8");
console.log(`Generated ${docs.length} knowledge documents into knowledge-seeds.js`);
