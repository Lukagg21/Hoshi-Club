# Hoshi Clubb

Sitio de noticias y entretenimiento de música urbana. Lee sus datos en vivo desde Airtable (10 tablas de la Actividad 4.2). Si Airtable no responde, muestra los datos de respaldo de `data.js`.

```
index.html                       Estructura (HTML)
style.css                        Estilos (CSS)
app.js                           Lógica (JS)
data.js                          Datos de respaldo, generados de tu Excel
logo.webp                        Logotipo
imagenes/                        Fotos de artistas, noticias y merch
netlify/functions/airtable.js    Lee Airtable de forma segura
netlify.toml · package.json      Configuración
datos-airtable/                  Excel listo para importar a Airtable
```

## 1. Airtable
1. **Add a base → Import data → Microsoft Excel** y sube `datos-airtable/Base_de_datos_Hoshi_Clubb_para_Airtable.xlsx`.
2. Las pestañas deben quedar con estos nombres: `artistas`, `noticias`, `noticia_artista`, `categorias`, `conciertos`, `lanzamientos`, `productos_merch` (además de `usuarios`, `comentarios` y `suscriptores`, que el sitio nunca lee).
3. Las columnas `foto`, `imagen_portada` y la de imagen en merch llevan una ruta como `imagenes/artistas/feid.jpeg`. Déjalas como texto: la página muestra la imagen de la carpeta `imagenes/` de tu sitio. (Los adjuntos de Airtable generan enlaces que caducan en pocas horas.)
4. Las relaciones por número (`id_artista`) funcionan tal cual. Si las conviertes a *Link to another record*, también funcionan.

## 2. Token de Airtable (solo lectura)
1. https://airtable.com/create/tokens → **Create new token**.
2. Permiso: `data.records:read`. Acceso: solo tu base.
3. El **Base ID** es el texto que empieza con `app` en la URL de tu base.

## 3. GitHub y Netlify
1. Sube **toda** esta carpeta (incluida `imagenes/`) a un repositorio de GitHub.
2. En Netlify: **Add new site → Import an existing project → GitHub**.
3. En **Site configuration → Environment variables** agrega `AIRTABLE_TOKEN` y `AIRTABLE_BASE_ID`. Luego **Deploys → Trigger deploy**.

## 4. Comprueba
Abre `https://TU-SITIO.netlify.app/.netlify/functions/airtable`. Debes ver tus datos en JSON. Si aparece `errores`, el nombre de esa tabla no coincide.

## Opciones (variables de entorno)
- `SOLO_PUBLICADAS=true`: oculta las noticias con estatus distinto de “publicada”. Por ahora todas están en “borrador”, así que está apagado.
- `CACHE_SEGUNDOS`: cuánto tiempo guarda los datos antes de volver a consultar Airtable (por defecto 21600 = 6 horas). Un cambio en Airtable puede tardar hasta ese tiempo en verse.

## Probar en tu computadora
```
npm install -g netlify-cli
cp .env.example .env     # pega tu token y Base ID
netlify dev
```
