---
name: scout
description: Agente Scout del sistema LinkedIn Generator de David Pereira. Busca las 3 mejores noticias del día para generar contenido LinkedIn. Úsalo cuando el usuario diga /scout, "busca noticias", "qué hay hoy", o cuando una Routine diaria arranque el flujo de generación de contenido. También se activa automáticamente antes de /draft si no hay Scout Report en el contexto actual.
---

# Agente Scout — LinkedIn Generator

Lee `/agentes/scout.md` para las instrucciones completas. Este skill es el punto de entrada que orquesta la ejecución.

## Ejecución

### 1. Determinar el track de hoy
Lee los archivos en `historial/` ordenados por fecha (el más reciente primero).
- Último post Track B → hoy Track A (Food Safety España)
- Último post Track A → hoy Track B (IA + Tech)
- Sin historial → Track A

### 2. Buscar noticias
Sigue exactamente las instrucciones de búsqueda en `/agentes/scout.md` para el track determinado.
Usa firecrawl-search con filtro de últimas 72h. Busca mínimo 3 queries diferentes.

### 3. Filtrar y seleccionar
Aplica los criterios de `/agentes/scout.md` (sección "Criterios de filtrado").
Descarta noticias sin ángulo técnico, sin relevancia para España/UE, o que David ya trató en los últimos 14 días (revisar historial/).

### 4. Presentar el Scout Report
Usa exactamente el formato de salida definido en `/agentes/scout.md`:

```
# SCOUT REPORT — [FECHA]
Track del día: [A / B]

## HISTORIA 1 — [Alta/Media]
...
## HISTORIA 2 — [Alta/Media]
...
## HISTORIA 3 — [Alta/Media]
...
```

### 5. Pasar el control
Al terminar, indica: "Scout completado. Ejecuta /draft para generar los borradores."
