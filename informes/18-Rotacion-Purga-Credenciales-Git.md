# 79 — Saneamiento y Purga Definitiva de Credenciales en Git

> **Fecha:** 2026-08-14  
> **Área:** Seguridad / Gestión de Repositorio / CI/CD / Firebase RTDB  
> **Estado:** ✅ Completado, Historial Purga Verificado y Sincronizado en Remoto (GitHub)  
> **Referencia:** [Auditoría Integral V3](../docs/AUDITORIA_INTEGRAL_V3_2026-08-14.md) | [Informe 78](./78-Optimizacion-ADC-NDIR-VPD-Persistencia-Atomica.md) | [Checklist de Deuda Técnica](../docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md)

---

## 1. Justificación Técnica y Planteamiento del Problema

Durante los sprints iniciales del proyecto (fase de prototipado), el archivo `edge_esp32/src/Secrets.h` fue incluido en dos commits históricos (`7261d57` y `b9bce33`). Aunque posteriormente el archivo fue añadido a `.gitignore`, los blobs permanecían almacenados en la base de objetos de Git y eran recuperables inspeccionando el historial completo del árbol.

Esta condición representaba una vulnerabilidad de seguridad de nivel crítico (Hallazgo #3 de la Auditoría Integral V3).

---

## 2. Descripción de la Solución e Implementación

### A. Creación de Plantilla Segura y Configuración Desacoplada
- Se implementó [`edge_esp32/src/Secrets.h.template`](../edge_esp32/src/Secrets.h.template) con valores de marcador de posición para que nuevos desarrolladores o entornos de compilación configuren sus credenciales locales sin riesgo de fuga.
- Se desacopló la contraseña de flasheo inalámbrico mediante la macro `OTA_PASSWORD`.

### B. Blindaje Global de `.gitignore`
Se añadieron reglas estrictas de exclusión para evitar cualquier futura indexación accidental:
```gitignore
# Variables de Entorno y Secretos (NUNCA commitear)
.env
*.env
.env.*
Secrets.h
*Secrets.h
**/Secrets.h
edge_esp32/src/Secrets.h

# PlatformIO & Herramientas de Compilación
.pio/
.vscode/
```

### C. Reescritura y Purga Histórica de Objetos Git
- Se ejecutó `git filter-branch` a lo largo de todos los commits, ramas y tags:
  ```bash
  git filter-branch --force --index-filter "git rm --cached --ignore-unmatch edge_esp32/src/Secrets.h Secrets.h **/Secrets.h" --prune-empty --tag-name-filter cat -- --all
  ```
- Se eliminaron todas las referencias en `refs/original/`.
- Se expiraron todos los reflogs y se ejecutó la recolección agresiva de basura:
  ```bash
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive
  ```

### D. Sincronización Forzada y Saneada en GitHub
- Se sincronizaron todas las ramas y tags reescritos con el repositorio remoto `luckybjj-dev/iot-industrial.git`:
  ```bash
  git push origin --force --all
  git push origin --force --tags
  ```

---

## 3. Matriz de Archivos Modificados

| Archivo | Cambio Realizado |
| :--- | :--- |
| [`.gitignore`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/.gitignore) | Reglas de exclusión reforzadas para credenciales, variables `.env` y directorios `.pio`/`.vscode`. |
| [`edge_esp32/src/Secrets.h.template`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/Secrets.h.template) | Plantilla formal con variables `FIREBASE_API_KEY`, `FIREBASE_DATABASE_URL`, `FIREBASE_USER_EMAIL`, `FIREBASE_USER_PASSWORD` y `OTA_PASSWORD`. |
| [`docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md) | **100% de cumplimiento alcanzado (18 / 18 ítems resueltos)**. |
| [`ROADMAP.md`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/ROADMAP.md) | Actualización del estado de deuda técnica. |

---

## 4. Estado de Validación y Verificación

1. **Inspección de Historial Completo:**
   ```bash
   git log --all --full-history -- "**/Secrets.h"
   # Salida: 0 commits (Árbol 100% limpio y saneado)
   ```
2. **Compilación de Firmware:**
   - PlatformIO compiló exitosamente el target `esp32dev` (0 errores, 0 warnings).
3. **Suite de Pruebas Empíricas:**
   - `test_safe_mode_verification.py` pasó al 100% (7/7 pruebas).
