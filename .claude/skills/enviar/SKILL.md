---
name: enviar
description: Envía los borradores del día a Telegram con botones de aprobación A/B/C. Úsalo cuando el usuario diga /enviar, "manda a Telegram", "envía los borradores", o automáticamente como último paso del flujo diario después de /draft. Railway se encarga de procesar la aprobación y publicar en LinkedIn.
---

# Skill Enviar — LinkedIn Generator

Envía los borradores generados por /draft a Telegram para que David los apruebe desde el móvil.

## Ejecución

### 1. Verificar que existe el borrador del día
Comprueba que existe `outputs/YYYY-MM-DD_borrador.md` con la fecha de hoy.
Si no existe, indica que hay que ejecutar /draft primero.

### 2. Hacer push del borrador a GitHub
Esto es necesario para que Railway pueda leerlo al recibir la aprobación:

```bash
git config user.email "davidclcstusa@gmail.com"
git config user.name "davidclcstusa"
git add outputs/
git commit -m "borrador YYYY-MM-DD"
git push
```

Sustituye YYYY-MM-DD por la fecha real de hoy.

### 3. Enviar a Telegram
Ejecuta el script de envío:

```bash
npm install --silent
TELEGRAM_BOT_TOKEN=8650554612:AAFzr_yxRrWT17udecRbqhsR4M2rV_GoKqg TELEGRAM_CHAT_ID=613921307 node approval/send_borradores.js
```

### 4. Confirmar
Si el script termina con "✅ Borradores enviados a Telegram", el flujo del día está completo.

David recibirá los 3 borradores en Telegram con botones A, B y C.
Al pulsar uno, Railway (siempre encendido) publica automáticamente en LinkedIn.

## Flujo completo recordatorio
```
/scout → /draft → /enviar
   ↓         ↓        ↓
Noticias  Borradores  Telegram
           en GitHub   + Railway
                      publica en LinkedIn
```
