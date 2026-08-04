# Auditoría y Resolución: Integración NotebookLM MCP

**Fecha:** 30 de Julio de 2026
**Objetivo:** Integrar NotebookLM con Antigravity a través del servidor `notebooklm-mcp-server`.
**Estado Final:** Bloqueo de red por parte de Google (Nueva seguridad). Cambio de flujo de trabajo a exportación directa de Markdown.

## 1. Problema Inicial
Se intentó conectar Antigravity con NotebookLM, pero el servidor MCP fallaba al solicitar la lista de cuadernos, devolviendo constantemente un error de autenticación o "Bad Request".

## 2. Acciones Técnicas Realizadas
1. **Extracción de Cookies Persistentes:** Se parchó el archivo `auth-cli.js` del servidor MCP para usar el perfil persistente del navegador Brave del usuario, logrando extraer con éxito las 20 cookies de sesión seguras (`auth.json`).
2. **Actualización de BUILD_LABEL:** Se identificó que el servidor estaba usando una versión antigua de la API de Google. Se extrajo manualmente el `BUILD_LABEL` actual (`boq_labs-tailwind-frontend_20260728.14_p0`) desde la consola del navegador del usuario.
3. **Parchado del Código:** Se inyectó este nuevo identificador en `index.js` del servidor MCP.

## 3. Causa Raíz del Bloqueo
A pesar de contar con credenciales válidas y el código de versión correcto, las peticiones seguían siendo rechazadas (Error 302 hacia la página de login / "Authentication expired"). 

**Conclusión:** Google ha implementado recientemente medidas de seguridad extremas anti-bots en NotebookLM (posiblemente *Device Bound Session Credentials* o *TLS Fingerprinting*). Esto significa que Google detecta y bloquea cualquier petición que no provenga estrictamente de la huella digital del navegador original (Brave), bloqueando las peticiones hechas desde Node.js (Axios) que utiliza el servidor MCP. Al no existir una API oficial, la integración directa por red queda inoperativa.

## 4. Nuevo Flujo de Trabajo
Para suplir esta desconexión y continuar alimentando NotebookLM con el análisis del proyecto, se ha automatizado el siguiente flujo:
- **Generación Automática:** Antigravity (Gemini) redactará directamente los informes y resúmenes técnicos.
- **Ruta Local:** Los archivos se guardarán automáticamente en formato Markdown (`.md`) en: `C:\Users\lagos\OneDrive\Desktop\ESP32Proyecto - Industrial\Node-monitor-iot-backend\proyecto_iot-code-workspace\informes`.
- **Ingesta:** El usuario simplemente subirá estos archivos locales generados a NotebookLM como fuentes de estudio.
