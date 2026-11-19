// Función de Netlify: lee las tablas de Airtable y devuelve JSON listo para la página.
// El token vive en las variables de entorno de Netlify, nunca en el navegador.
// Nunca se leen las tablas "usuarios" (contraseñas), "comentarios" ni "suscriptores" (correos).

const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = process.env.AIRTABLE_BASE_ID;
const SOLO_PUBLICADAS = process.env.SOLO_PUBLICADAS === "true"; // true = ocultar noticias en "borrador"
const CACHE = Number(process.env.CACHE_SEGUNDOS || 21600);      // 6 horas: cuida el límite gratis de Airtable

const TABLAS = {
  artistas: "artistas",
  noticias: "noticias",
  noticia_artista: "noticia_artista",
  categorias: "categorias",
  conciertos: "conciertos",
  lanzamientos: "lanzamientos",
  merch: "productos_merch",
};

const norm = (s) =>
  String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_]+/g, " ").trim();

async function leerTabla(nombre) {
  const out = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(nombre)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) throw new Error(`${nombre}: Airtable respondió ${r.status}`);
    const d = await r.json();
    out.push(...d.records);
    offset = d.offset;
  } while (offset);
  return out;
}

// Busca un campo por nombre (sin importar mayúsculas, acentos, guiones bajos ni "(PK)"/"(FK)").
function campo(fields, nombre) {
  const buscado = norm(nombre);
  for (const k of Object.keys(fields)) {
    if (norm(k).replace(/ \((pk|fk)\)$/, "") === buscado) return fields[k];
  }
  return undefined;
}

const texto = (v) => {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" && x ? x.name || x.url || "" : String(x))).filter(Boolean).join(", ");
  if (typeof v === "object") return v.name || v.url || "";
  return String(v).trim();
};

// Imagen: adjunto de Airtable, enlace, o ruta del sitio (por ejemplo imagenes/artistas/feid.jpeg).
const imagen = (v) => (Array.isArray(v) && v[0] && v[0].url ? v[0].url : typeof v === "string" ? v.trim() : "");

exports.handler = async () => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300",
    "Netlify-CDN-Cache-Control": `public, s-maxage=${CACHE}, stale-while-revalidate=86400`,
  };
  if (!TOKEN || !BASE) {
    return { statusCode: 500, headers: { "Content-Type": headers["Content-Type"] }, body: JSON.stringify({ error: "Faltan AIRTABLE_TOKEN o AIRTABLE_BASE_ID en Netlify." }) };
  }

  const crudo = {};
  const errores = {};
  await Promise.all(
    Object.entries(TABLAS).map(async ([clave, nombre]) => {
      try { crudo[clave] = await leerTabla(nombre); }
      catch (e) { errores[clave] = e.message; crudo[clave] = []; }
    })
  );
  if (Object.keys(errores).length === Object.keys(TABLAS).length) {
    return { statusCode: 502, headers: { "Content-Type": headers["Content-Type"] }, body: JSON.stringify({ error: "No se pudo leer ninguna tabla.", errores }) };
  }

  // Búsquedas para relacionar tablas: por id numérico (id_artista) o por ID interno de Airtable (campos vinculados).
  const artistaPorId = {}, artistaPorRec = {}, categoriaPorId = {}, categoriaPorRec = {};
  for (const r of crudo.artistas) {
    const n = texto(campo(r.fields, "nombre_artistico"));
    artistaPorRec[r.id] = n;
    artistaPorId[texto(campo(r.fields, "id_artista"))] = n;
  }
  for (const r of crudo.categorias) {
    const n = texto(campo(r.fields, "nombre"));
    categoriaPorRec[r.id] = n;
    categoriaPorId[texto(campo(r.fields, "id_categoria"))] = n;
  }
  const relacionar = (v, porId, porRec) => {
    if (v == null) return "";
    const lista = Array.isArray(v) ? v : [v];
    return lista.map((x) => porRec[x] || porId[String(x).trim()] || String(x).trim()).filter(Boolean).join(", ");
  };
  const artista = (v) => relacionar(v, artistaPorId, artistaPorRec);

  // noticia_artista: qué artistas aparecen en cada noticia.
  const artistasDeNoticia = {};
  for (const r of crudo.noticia_artista) {
    const n = texto(campo(r.fields, "id_noticia"));
    const a = artista(campo(r.fields, "id_artista"));
    if (n && a) (artistasDeNoticia[n] ||= []).push(a);
  }

  const res = {};
  res.artistas = crudo.artistas.map((r) => { const f = r.fields; return {
    n: texto(campo(f, "nombre_artistico")), pais: texto(campo(f, "pais")), ciudad: texto(campo(f, "ciudad")),
    genero: texto(campo(f, "genero_musical")), bio: texto(campo(f, "biografia")),
    foto: imagen(campo(f, "foto")), instagram: texto(campo(f, "instagram")) }; });

  res.noticias = crudo.noticias.map((r) => { const f = r.fields; const id = texto(campo(f, "id_noticia")); return {
    t: texto(campo(f, "titulo")), resumen: texto(campo(f, "resumen")), contenido: texto(campo(f, "contenido")),
    imagen: imagen(campo(f, "imagen_portada")), f: texto(campo(f, "fecha_publicacion")), estatus: texto(campo(f, "estatus")),
    categoria: relacionar(campo(f, "id_categoria"), categoriaPorId, categoriaPorRec), artistas: artistasDeNoticia[id] || [] }; })
    .filter((n) => !SOLO_PUBLICADAS || norm(n.estatus) === "publicada");

  res.conciertos = crudo.conciertos.map((r) => { const f = r.fields; return {
    evento: texto(campo(f, "nombre_evento")), artista: artista(campo(f, "id_artista")), fecha: texto(campo(f, "fecha_evento")),
    ciudad: texto(campo(f, "ciudad")), recinto: texto(campo(f, "recinto")), boletos: texto(campo(f, "enlace_boletos")),
    estatus: texto(campo(f, "estatus")) }; });

  res.lanzamientos = crudo.lanzamientos.map((r) => { const f = r.fields; return {
    titulo: texto(campo(f, "titulo")), tipo: texto(campo(f, "tipo")), fecha: texto(campo(f, "fecha_lanzamiento")),
    artista: artista(campo(f, "id_artista")), enlace: texto(campo(f, "enlace")) }; });

  // En tu Excel la imagen del producto está en la columna "nombre" y el nombre en "descripcion".
  res.merch = crudo.merch.map((r) => { const f = r.fields; return {
    producto: texto(campo(f, "descripcion")), imagen: imagen(campo(f, "nombre")), precio: texto(campo(f, "precio")),
    existencias: texto(campo(f, "existencias")), artista: artista(campo(f, "id_artista")), enlace: texto(campo(f, "enlace_compra")) }; });

  for (const k of Object.keys(res)) res[k] = res[k].filter((x) => Object.values(x).some((v) => (Array.isArray(v) ? v.length : v)));
  if (Object.keys(errores).length) res.errores = errores;
  return { statusCode: 200, headers, body: JSON.stringify(res) };
};
