import { $, html, raw, errText } from "../lib/ui.js";
import { signIn } from "../lib/sb.js";

export function renderLogin(root, onDone) {
  root.innerHTML = html`
    <main class="login">
      <div class="login-card">
        <img src="images/floreon-logo.webp" alt="" width="64" height="64">
        <h1>Floreon staff</h1>
        <p class="lead">Log in to edit the website.</p>
        <form id="loginForm" class="stack" novalidate>
          <label>Email<input name="email" type="email" autocomplete="username" required autofocus></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
          <p class="err" id="loginErr" role="alert"></p>
          <button class="btn wide" type="submit">Log in</button>
        </form>
        <p class="fine">Accounts are created by the owner in Supabase.</p>
      </div>
    </main>`;
  $("#loginForm", root).addEventListener("submit", async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const btn = e.target.querySelector("button");
    const err = $("#loginErr", root);
    if (!f.email || !f.password) { err.textContent = "Enter your email and password."; return; }
    btn.disabled = true; btn.textContent = "Logging in…"; err.textContent = "";
    try { onDone(await signIn(f.email.trim(), f.password)); }
    catch (er) { err.textContent = errText(er); btn.disabled = false; btn.textContent = "Log in"; }
  });
}
