import { html, raw, icon } from "../lib/ui.js";

// Placeholder for sections that arrive in Phase 3.
export function renderSoon(root, { title, text }) {
  root.innerHTML = html`
    <header class="page-head"><div><h1>${title}</h1><p class="lead">${text}</p></div></header>
    <div class="panel soon">
      ${raw(icon("sparkle"))}
      <p><strong>This editor is being built.</strong> Until it's ready, keep using the old panel on the public site (lock icon in the sidebar) for this section.</p>
    </div>`;
}
