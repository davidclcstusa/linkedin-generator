---
name: draft
description: Agente Copywriter del sistema LinkedIn Generator de David Pereira. Genera exactamente 3 borradores de posts LinkedIn listos para aprobar. Úsalo cuando el usuario diga /draft, "genera borradores", "redacta los posts", o automáticamente después de /scout en el flujo de la Routine diaria. Requiere un Scout Report en el contexto (lo genera /scout si no existe).
---

# Agente Copywriter — LinkedIn Generator

Lee `/agentes/copywriter.md` y `/config/voz.md` antes de redactar. Son tu referencia absoluta de voz y formato.

## Ejecución

### 1. Verificar input
Confirma que hay un Scout Report en el contexto con al menos una Historia.
Si no lo hay, ejecuta el skill /scout primero.

### 2. Revisar historial para anti-repetición
Lee los últimos archivos en `historial/` (máximo 7).
Extrae: formatos usados, palabras de apertura repetidas, temas recientes.

### 3. Asignar formatos (anti-repetición obligatoria)
| Borrador | Formato por defecto |
|---|---|
| A | Experto Directo |
| B | Storytelling / Caso Real |
| C | Dato + Implicación |

Si algún formato se usó en los últimos 3 posts → sustitúyelo por Formato D (Pregunta Provocadora) o E (Hilo de Contexto). Indica el motivo.

### 4. Redactar los 3 borradores
Para cada uno:
- Aplica el formato según `/config/voz.md`
- Ancla en experiencia de David cuando sea natural (FRUSANGAR, IFS, GLOBAL GAP, hortofrutícola)
- Evita palabras prohibidas de `/config/voz.md`
- Añade fuente con URL completa: `🔗 [Medio] → URL`
- Añade 3-5 hashtags del track correspondiente

### 5. Verificación pre-entrega
Antes de guardar, comprueba cada borrador:
- ¿Arranca con fuerza? (no con "En el mundo de hoy" ni "Es fundamental")
- ¿Tiene al menos 1 dato o hecho concreto?
- ¿Sin palabras prohibidas?
- ¿Dentro del rango de longitud del formato?
- ¿Voz de David, no voz genérica de LinkedIn?

### 6. Guardar y notificar
Guarda en `outputs/YYYY-MM-DD_borrador.md` con la fecha de hoy.
Usa el formato exacto definido en `/agentes/copywriter.md` (sección "Formato de Salida").

Al terminar: "Borradores guardados en outputs/YYYY-MM-DD_borrador.md. Ejecuta /enviar para mandarlos a Telegram."
