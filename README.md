# caprichosostudio.com

Web de Caprichoso Studio. HTML, CSS y JS estáticos, sin paso de build.

- `index.html`, `styles.css`, `main.js`: la página (incluye el sonido al pasar el ratón, apagado por defecto).(incluye el sonido al pasar el ratón, apagado por defecto).
- `hero3d.js`: el hero (cristal líquido con láseres, Three.js r128 desde cdnjs).
- Las reservas abren el Calendly `hola-caprichosostudio/30min` en otra pestaña.

## Publicar

Vercel: importar este repositorio, Framework Preset "Other", sin comando de build. Cada push a `main` se publica solo.

DNS en IONOS: registro A de `@` a `76.76.21.21` y CNAME de `www` a `cname.vercel-dns.com` (o los valores que muestre Vercel en Settings → Domains).
