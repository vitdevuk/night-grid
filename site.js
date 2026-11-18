// Shared by index.html and race.html: theme (light / dark / system), language (11 languages) and the entry form.
(() => {
  const root = document.documentElement, $$ = (s) => document.querySelectorAll(s);
  const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const store = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  // Header controls are built here so both pages share one copy.
  const LANGS = { en: "English", fr: "Français", de: "Deutsch", es: "Español", it: "Italiano", ru: "Русский", ja: "日本語", zh: "中文", ar: "العربية", fa: "فارسی", he: "עברית" };
  const THEMES = [
    ["light", "Light", "thL", '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
    ["dark", "Dark", "thD", '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'],
    ["system", "System", "thS", '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'],
  ];
  document.querySelector(".tools").innerHTML =
    '<select id="lang" aria-label="Language" data-i18n-aria="lang">' + Object.entries(LANGS).map(([c, n]) => `<option value="${c}">${n}</option>`).join("") + "</select>" +
    '<div class="theme" role="group" aria-label="Theme" data-i18n-aria="theme">' +
    THEMES.map(([v, label, key, icon]) => `<button type="button" data-set="${v}" aria-label="${label}" data-i18n-aria="${key}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg></button>`).join("") + "</div>";

  // Theme: "system" follows the device and reacts when the device setting changes.
  const sysDark = matchMedia("(prefers-color-scheme: dark)");
  let pref = read("ng-theme") || "system";
  function applyTheme() {
    root.dataset.theme = pref === "system" ? (sysDark.matches ? "dark" : "light") : pref;
    $$(".theme button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.set === pref));
  }
  sysDark.addEventListener("change", applyTheme);
  $$(".theme button").forEach((b) => b.addEventListener("click", () => { pref = b.dataset.set; store("ng-theme", pref); applyTheme(); }));
  applyTheme();

  // On the home page the header sits over the night scene, then over the themed sections below it.
  const story = document.querySelector(".story"), nav = document.querySelector(".nav");
  if (story) {
    const overStory = () => nav.classList.toggle("night", story.getBoundingClientRect().bottom > 70);
    addEventListener("scroll", overStory, { passive: true }); overStory();
  }

  // Language: English is read from the page's own markup; the other ten live in i18n.js.
  const I18N = window.I18N || {}, RTL = ["ar", "fa", "he"], langSel = document.getElementById("lang"), titleKey = root.dataset.title;
  const EN = { [titleKey]: document.title, eEmail: "Please enter an email like you@example.com.", eFill: "Please fill in: {field}.", done: "{name}, you are entered for {night}. This is a sample page, nothing was sent." };
  $$("[data-i18n]").forEach((el) => { EN[el.dataset.i18n] = el.innerHTML; });
  $$("[data-i18n-aria]").forEach((el) => { EN[el.dataset.i18nAria] = el.getAttribute("aria-label"); });
  $$("[data-i18n-ph]").forEach((el) => { EN[el.dataset.i18nPh] = el.placeholder; });
  $$("[data-date]").forEach((el) => { el.dataset.en = el.textContent; });
  I18N.en = EN;
  let T = EN;
  // Dates are formatted by the browser for each language: Gregorian calendar, Western digits, to match the times on the page.
  const fmtDate = (iso, code) => new Date(iso + "T12:00:00").toLocaleDateString((code === "zh" ? "zh-Hans" : code) + "-u-nu-latn-ca-gregory", { weekday: "long", day: "numeric", month: "long" });
  function setLang(code) {
    if (!I18N[code]) code = "en";
    T = { ...EN, ...I18N[code] };
    root.lang = code === "zh" ? "zh-Hans" : code; root.dir = RTL.includes(code) ? "rtl" : "ltr";
    $$("[data-i18n]").forEach((el) => { el.innerHTML = T[el.dataset.i18n]; }); // our own strings, never user input
    $$("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", T[el.dataset.i18nAria]); });
    $$("[data-i18n-ph]").forEach((el) => { el.placeholder = T[el.dataset.i18nPh]; });
    $$("[data-date]").forEach((el) => { el.textContent = code === "en" ? el.dataset.en : fmtDate(el.dataset.date, code) + (el.dataset.tail || ""); });
    $$(".theme button").forEach((b) => { b.title = b.getAttribute("aria-label"); });
    const out = document.querySelector(".join output"); if (out) out.textContent = "";
    document.title = T[titleKey]; langSel.value = code;
    return code;
  }
  langSel.addEventListener("change", () => store("ng-lang", setLang(langSel.value)));
  setLang(read("ng-lang") || (navigator.languages || [navigator.language || "en"]).map((l) => l.slice(0, 2).toLowerCase()).find((l) => I18N[l]) || "en");

  // Sample entry form (home page only): checked here, sent nowhere.
  const form = document.querySelector(".join form");
  if (form) form.addEventListener("submit", (e) => {
    e.preventDefault();
    const out = document.querySelector(".join output");
    const bad = [form.driver, form.email, form.car].find((f) => !f.checkValidity());
    if (bad) { out.textContent = bad === form.email ? T.eEmail : T.eFill.replace("{field}", bad.closest("label").firstElementChild.textContent.trim()); bad.focus(); return; }
    out.textContent = T.done.replace("{name}", form.driver.value.trim()).replace("{night}", form.night.value);
    form.reset();
  });

  // One runnable check: every string this page uses exists in every language.
  window.i18nChecks = () => {
    const bad = [], keys = Object.keys(EN);
    for (const [code, dict] of Object.entries(I18N)) { const miss = keys.filter((k) => !dict[k]); if (miss.length) bad.push(code + ": missing [" + miss + "]"); }
    return bad.length ? bad : "checks done: " + Object.keys(I18N).length + " languages, " + keys.length + " strings on this page";
  };
})();
