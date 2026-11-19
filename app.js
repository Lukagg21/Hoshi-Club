/* Hoshi Clubb · lógica de la página: muestra datos de respaldo al instante y luego los de Airtable. */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const star = '<svg class="star" aria-hidden="true"><use href="#s"/></svg>';
const empty = (m) => `<div class="empty">${star}${m}</div>`;
const fmt = (d) => /^\d{4}-\d{2}-\d{2}/.test(d || "") ? new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : (d || "");
const precio = (p) => /^\d+(\.\d+)?$/.test(String(p || "")) ? "$" + Number(p).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : (p || "");
const safeUrl = (u) => /^https?:\/\//i.test(u || "") ? u : "";
const safeImg = (u) => (/^https?:\/\//i.test(u || "") || /^imagenes\/[\w\-./]+$/i.test(u || "")) ? u : "";
const igUrl = (v) => { v = String(v || "").trim(); if (!v) return ""; return /^https?:/i.test(v) ? v : "https://instagram.com/" + v.replace(/^@/, ""); };
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
const img = (src, alt, cls) => { const u = safeImg(src); return u ? `<img class="${cls}" src="${esc(u)}" alt="${esc(alt)}" loading="lazy">` : ""; };

const VACIO = { artistas: [], noticias: [], conciertos: [], lanzamientos: [], merch: [] };
let DB = { ...VACIO, ...(window.FALLBACK || {}) };
let pais = "Todos";

function drawNews() {
  const list = [...DB.noticias].sort((a, b) => String(b.f).localeCompare(String(a.f)));
  $("#newsList").innerHTML = list.length ? list.map((x) => `<article>${img(x.imagen, "", "cover")}<div class="body">
    <p class="src">${esc([x.categoria, fmt(x.f)].filter(Boolean).join(" · "))}</p><h3>${esc(x.t)}</h3>
    ${x.resumen ? `<p>${esc(x.resumen)}</p>` : ""}
    ${x.contenido ? `<details><summary>Leer más</summary><p>${esc(x.contenido)}</p></details>` : ""}
    ${x.artistas && x.artistas.length ? `<p class="src">Artistas: ${esc(x.artistas.join(", "))}</p>` : ""}</div></article>`).join("") : empty("Aún no hay noticias publicadas.");
}
function drawChips() {
  const ps = ["Todos", ...new Set(DB.artistas.map((a) => a.pais).filter(Boolean))];
  $("#chips").innerHTML = ps.map((p) => `<button class="chip" aria-pressed="${p === pais}" data-p="${esc(p)}">${esc(p)}</button>`).join(" ");
}
function drawArtists() {
  const q = $("#q").value.trim().toLowerCase();
  const list = DB.artistas.filter((a) => (pais === "Todos" || a.pais === pais) && [a.n, a.ciudad, a.genero, a.pais].join(" ").toLowerCase().includes(q));
  $("#artistGrid").innerHTML = list.length ? list.map((a) => { const ig = igUrl(a.instagram);
    return `<div class="card">${img(a.foto, "Foto de " + a.n, "foto") || `<div class="mono" aria-hidden="true">${esc((a.n || "").replace(/[^\p{L}]/gu, "").slice(0, 1))}</div>`}
    <h3>${esc(a.n)}</h3><p class="meta">${esc([a.pais, a.ciudad].filter(Boolean).join(" · "))}</p><p class="gen">${esc(a.genero)}</p>
    ${a.bio ? `<p class="bio">${esc(a.bio)}</p>` : ""}${ig ? `<a class="ig" href="${esc(ig)}" target="_blank" rel="noopener">Instagram</a>` : ""}</div>`; }).join("") : empty("No hay artistas con esa búsqueda. Prueba con otro nombre o país.");
}
function drawRest() {
  const cs = [...DB.conciertos].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  $("#concertList").innerHTML = cs.length ? `<div class="grid">${cs.map((c) => { const u = safeUrl(c.boletos);
    return `<div class="card"><p class="meta">${esc(fmt(c.fecha))}</p><h3>${esc(c.artista)}</h3><p class="gen">${esc(c.evento)}</p>
    <p class="gen">${esc([c.ciudad, c.recinto].filter(Boolean).join(" · "))}</p>
    ${c.estatus ? `<p><span class="pill ${/cancel/i.test(c.estatus) ? "bad" : ""}">${esc(cap(c.estatus))}</span></p>` : ""}
    ${u ? `<a class="ig" href="${esc(u)}" target="_blank" rel="noopener">Boletos</a>` : c.boletos ? `<p class="gen">${esc(c.boletos)}</p>` : ""}</div>`; }).join("")}</div>` : empty("Aún no hay conciertos publicados.");
  $("#relList").innerHTML = DB.lanzamientos.length ? DB.lanzamientos.map((r) => { const u = safeUrl(r.enlace);
    return `<div class="card"><h3>${esc(r.titulo)}</h3><p class="meta">${esc([cap(r.tipo), r.artista].filter(Boolean).join(" · "))}</p>
    ${r.fecha ? `<p class="gen">${esc(fmt(r.fecha))}</p>` : ""}${u ? `<a class="ig" href="${esc(u)}" target="_blank" rel="noopener">Escuchar</a>` : ""}</div>`; }).join("") : empty("Aún no hay lanzamientos publicados.");
  $("#merchList").innerHTML = DB.merch.length ? `<div class="grid">${DB.merch.map((m) => { const u = safeUrl(m.enlace);
    return `<div class="card">${img(m.imagen, m.producto, "prod")}<h3>${esc(m.producto)}</h3><p class="meta">${esc(precio(m.precio))}</p>
    <p class="gen">${esc([m.artista, m.existencias ? m.existencias + " disponibles" : ""].filter(Boolean).join(" · "))}</p>
    ${u ? `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">Comprar</a>` : ""}</div>`; }).join("")}</div>` : empty("Aún no hay productos publicados.");
}
function drawAll() { drawNews(); drawChips(); drawArtists(); drawRest(); }

$("#chips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; pais = b.dataset.p; document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === b)); drawArtists(); });
$("#q").addEventListener("input", drawArtists);
drawAll();

/* Datos en vivo desde Airtable (a través de la función de Netlify). */
fetch("/.netlify/functions/airtable").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((d) => {
  DB = { ...VACIO, ...d }; drawAll();
}).catch((err) => console.warn("Sin conexión con Airtable; se muestran los datos de respaldo.", err));
