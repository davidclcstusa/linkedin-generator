# LinkedIn Generator — Script de ejecucion diaria
# Se lanza automaticamente por Task Scheduler a las 10:00h

$ProjectDir = "c:\Users\david\Desktop\PROYECTOS IA\3. Linkedin Generator"
$ClaudePath = "C:\Users\david\.local\bin\claude.exe"
$LogFile = "$ProjectDir\logs\$(Get-Date -Format 'yyyy-MM-dd').log"
$Today = Get-Date -Format "yyyy-MM-dd"

Set-Location $ProjectDir

"[$Today 10:00] Iniciando LinkedIn Generator..." | Out-File $LogFile -Append

$Prompt = @"
Ejecuta el flujo completo del LinkedIn Generator para hoy $Today.

PASO 1 - AGENTE SCOUT:
Sigue las instrucciones de agentes/scout.md al pie de la letra.
Usa firecrawl para buscar noticias en las fuentes de config/fuentes.md.
Determina el track del dia leyendo historial/ y presenta las 3 mejores historias.

PASO 2 - AGENTE COPYWRITER:
Sigue las instrucciones de agentes/copywriter.md al pie de la letra.
Usa firecrawl-scrape sobre https://www.linkedin.com/in/davidpereiraconejo/ para leer posts recientes.
Lee historial/ para anti-repeticion de formatos.
Genera exactamente 3 borradores (A, B, C) basados en la Historia 1 del Scout.
Guarda el resultado en outputs/${Today}_borrador.md

Al terminar, confirma que el archivo ha sido creado.
"@

& $ClaudePath --print $Prompt >> $LogFile 2>&1

"[$Today] Flujo completado. Revisa outputs\${Today}_borrador.md" | Out-File $LogFile -Append
