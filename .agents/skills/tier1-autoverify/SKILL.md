---
name: tier1-autoverify
description: Protocolo de auto-verificación técnica previa (Tier 1) obligatorio antes de proponer pruebas empíricas al usuario. Usar tras cualquier modificación de código en frontend_react/ o edge_esp32/.
---

# 🛡️ Protocolo de Auto-Verificación Técnica Previa (Tier 1)

Este skill define la batería de pruebas internas obligatorias que el agente debe ejecutar de forma autónoma antes de solicitar al usuario la validación empírica en navegador o hardware (Tier 2).

---

## 1. Verificación de Compilación y Tipado Estricto (Frontend)

Para cualquier cambio en [frontend_react/](file:///C:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/):
1. **Ejecutar Typecheck y Build:**
   ```powershell
   cd "frontend_react"
   npm run build
   ```
2. **Criterio de Aceptación:**
   - Cero errores de TypeScript (`tsc -b`).
   - Cero imports rotos o tipos `any` injustificados.
   - Si la compilación falla, el agente **debe corregir internamente** sin traspasar el error al usuario.

---

## 2. Auditoría de Integridad y Null-Safety en UI

1. **Protección contra valores nulos o desconexiones:**
   - Verificar que todo acceso a propiedades de telemetría use encadenamiento opcional:
     ```typescript
     telemetria?.temp_promedio ?? '--'
     telemetria?.vpd?.toFixed(2) ?? '0.00'
     ```
2. **Prevención de Desbordamiento de Layout:**
   - Comprobar que los textos largos en tarjetas de cultivo o zonas usen clases seguras (`truncate`, `break-words`, `overflow-hidden`).
   - Mantener el estándar visual industrial (estilos oscuros, alto contraste, semáforos semánticos).

---

## 3. Matriz de No-Regresión Cruzada

1. **Aislamiento Quirúrgico:**
   - Comprobar que no se hayan eliminado métodos de respaldo (fallbacks REST, timers locales de seguridad, estados optimistas).
2. **Sincronización de Contratos:**
   - Si se muta una función en [firebaseService.ts](file:///C:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/services/firebaseService.ts), verificar que los componentes consumidores ([App.tsx](file:///C:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/App.tsx), etc.) sigan recibiendo y enviando los mismos tipos.

---

## 4. Transición a Validación Empírica (Tier 2)

Solo cuando **todas** las comprobaciones internas concluyan con éxito:
1. Resumir al usuario el cambio aplicado de manera concisa.
2. Indicar las rutas y botones exactos que el usuario debe probar en vivo.
3. Esperar confirmación explícita antes de proponer cualquier commit en Git.
