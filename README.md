# caprichosostudio.com

Web de Caprichoso Studio. HTML, CSS y JS estáticos, sin paso de build.

- `index.html`, `styles.css`, `main.js`: la página.
- `hero3d.js`: el hero (cristal líquido con láseres, Three.js r128 desde cdnjs).
- Las reservas abren el Calendly `hola-caprichosostudio/30min` dentro de una ventana.

## Publicar

Vercel: importar este repositorio, Framework Preset "Other", sin comando de build. Cada push a `main` se publica solo.

DNS en IONOS: registro A de `@` a `76.76.21.21` y CNAME de `www` a `cname.vercel-dns.com` (o los valores que muestre Vercel en Settings → Domains).
