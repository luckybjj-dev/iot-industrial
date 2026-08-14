# Sprint 11: Documentación Educativa y Sincronización (Git)

Has solicitado comentar y explicar cada línea del código fuente antes de subirlo al repositorio, con el objetivo de usarlo como material de estudio. Además, realizaremos un `git commit` y `git push`.

## User Review Required

> [!CAUTION]  
> **¡Peligro en Git! (Rebase en progreso):** Al revisar el estado de tu repositorio, noté que actualmente estás "atrapado" en medio de un `git rebase` inconcluso (`You are currently rebasing. all conflicts fixed`). Si intentamos hacer un commit normal ahora mismo, podríamos dañar tu historial de ramas. Necesito tu permiso para ejecutar `git add .` seguido de `git rebase --continue` para salir de ese estado antes de hacer el push final. ¿Me autorizas a arreglar el estado de git de esta forma?

> [!IMPORTANT]  
> **Estrategia de Comentarios:** "Comentar cada línea" literalmente (ej. `int a = 0; // declara a como 0`) hace que el código sea muy difícil de leer y mantener. Mi propuesta es aplicar **Comentarios de Bloque Educativos (Estilo Tutorial)**. Esto significa que comentaré exhaustivamente el propósito de cada función, cada bloque lógico (if/else), y el flujo de datos (ej. "Aquí calculamos el VPD usando la fórmula de Tetens..."), dejando el código súper claro para estudiar sin volverlo ilegible. ¿Estás de acuerdo con este nivel de detalle?

## Proposed Changes

### 1. Documentación del Código C++ (edge_esp32/src/)
Modificaremos los siguientes archivos para inyectar comentarios educativos profundos en español:
- `main.cpp` (Explicación del bucle no bloqueante y FreeRTOS).
- `HardwareController.cpp / .h` (Explicación de la termodinámica, VPD, y máquina de estados).
- `NetworkManager.cpp / .h` (Explicación del NTP, Core 0 y Portal Cautivo).
- `FileManager.cpp / .h` (Explicación de punteros JSON y LittleFS).
- `FirebaseManager.cpp / .h` (Explicación del SDK, tareas asíncronas).
- `DisplayManager.cpp` (Explicación de renderizado TFT).

### 2. Sincronización con el Repositorio
- `git add .`
- `git rebase --continue` (Para salir del estado corrupto actual).
- `git commit -m "feat: Migración a Firebase, Refactor Agnóstico y Documentación Educativa"`
- `git push origin main`

## Verification Plan
1. Validaré que el código compile localmente después de insertar los cientos de comentarios para asegurar que no rompimos ninguna sintaxis.
2. Te entregaré un enlace al commit en GitHub para que comiences tu estudio.
