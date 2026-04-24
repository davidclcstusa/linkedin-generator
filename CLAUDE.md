# LinkedIn Content Generator — CLAUDE.md

## Identidad del Usuario

**David Pereira Conejo** — Responsable de Seguridad Alimentaria
Empresa: FRUSANGAR S.L. | Madrid (Navalcarnero)
Certificaciones: IFS Higher Level, GLOBAL GAP, Odoo ERP
Email: davidpereiracv@outlook.es
LinkedIn: linkedin.com/in/davidpereiraconejo
**Objetivo LinkedIn:** posicionarse como referente español en la intersección food safety × IA.

---

## Descripción del Sistema

Sistema multi-agente que automatiza la generación diaria de borradores de posts para LinkedIn. Combina dos agentes especializados (Scout + Copywriter) para pasar de noticias del día a borradores listos para revisar y publicar, manteniendo la voz auténtica de David y evitando repetición de formatos.

**Flujo principal:**
```
10:00h cron → Scout (busca + filtra) → Copywriter (3 borradores) → David aprueba uno → Auto-publicación en LinkedIn
```

**Decisiones de arquitectura confirmadas:**
- LinkedIn no abierto en Chrome → se usa firecrawl-scrape sobre perfil público para leer posts anteriores
- Ejecución: automática diaria a las 10:00h (cron)
- Publicación: auto-publicar con browser-use, SOLO tras aprobación explícita de David
- Idioma: solo español
- Dashboard: ficheros locales (sin Notion de momento)

---

## Tracks de Contenido

### Track A — Food Safety España
Seguridad alimentaria, alertas RASFF, legislación AESAN, auditorías IFS/GLOBAL GAP, trazabilidad, HACCP, novedades del sector.
Audiencia objetivo: técnicos de calidad, directivos agroalimentarios, consultores, inspectores.

### Track B — IA + Tech aplicada
IA aplicada a calidad alimentaria, automatización de procesos, computer vision en líneas de producción, LLMs para gestión documental HACCP, casos reales de digitalización.
Audiencia objetivo: el mismo perfil + early adopters del sector.

**Regla de alternancia:** no publicar el mismo track dos días seguidos.

---

## Instrucciones de Comportamiento del Agente

- Respuestas siempre en **español**
- Respuestas cortas y orientadas a acción
- Nunca preguntar más de una cosa a la vez
- Presentar opciones numeradas cuando haya decisiones que tomar
- No generar posts sin instrucción explícita del usuario
- Siempre mostrar el track asignado a cada borrador
- Al generar borradores, indicar: formato usado, track, longitud estimada

---

## Agentes del Sistema

### Agente 1 — Scout (Investigador)
**Archivo:** `/agentes/scout.md`
**Función:** Busca noticias relevantes del día en las fuentes configuradas, filtra por relevancia para el perfil de David, y presenta las 3 mejores historias en formato escaneable listo para pasar al Copywriter.

### Agente 2 — Copywriter (Redactor LinkedIn)
**Archivo:** `/agentes/copywriter.md`
**Función:** Recibe las 3 historias del Scout, consulta el historial de posts recientes, aplica anti-repetición de formatos, y genera exactamente 3 borradores (formato A, B y C) en la voz de David.

---

## Estructura de Carpetas

```
/
├── CLAUDE.md                  ← este archivo
├── config/
│   ├── fuentes.md             ← fuentes por track (RSS, LinkedIn, webs)
│   └── voz.md                 ← tono, formatos, reglas anti-repetición
├── agentes/
│   ├── scout.md               ← prompt maestro del Agente Scout
│   └── copywriter.md          ← prompt maestro del Agente Copywriter
├── historial/                 ← posts publicados (uno por archivo, YYYY-MM-DD.md)
└── outputs/                   ← borradores pendientes de revisión
```

---

## Comandos Disponibles

| Comando | Descripción |
|---|---|
| `/scout` | Ejecuta el Agente Scout: busca noticias del día y presenta las 3 mejores |
| `/draft` | Ejecuta el Agente Copywriter con las historias del Scout activo |
| `/aprobar [A/B/C]` | David aprueba un borrador → se auto-publica en LinkedIn via browser-use |
| `/post [fecha]` | Registra manualmente un post publicado en el historial |
| `/historial` | Muestra los últimos 7 posts publicados con formato y track |
| `/fuentes` | Lista todas las fuentes activas y su estado |
| `/voz` | Muestra las reglas de voz y formatos disponibles |

---

## Notas Técnicas

- Los borradores se guardan en `/outputs/YYYY-MM-DD_borrador.md`
- Los posts publicados van a `/historial/YYYY-MM-DD.md`
- El Scout usa firecrawl-search y firecrawl-scrape para buscar noticias
- El Copywriter usa firecrawl-scrape sobre linkedin.com/in/davidpereiraconejo para leer posts recientes + lee `/historial/` para anti-repetición
- La publicación final usa browser-use para abrir LinkedIn y publicar (solo tras /aprobar)
- Herramientas disponibles: firecrawl-search, firecrawl-scrape, browser-use, Read, Write, Glob
- Idioma de todos los posts: español exclusivamente
