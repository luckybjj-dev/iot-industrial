# Plan de Implementación: Rediseño UX, Creador Custom y Enciclopedia

El usuario ha propuesto una visión de producto brillante: transformar el modal en una plataforma comunitaria y educativa. No solo se permitirá a los agricultores definir especies no listadas (Community Catalog), sino que el propio SCADA actuará como una **Enciclopedia Agronómica** entregando valor educativo al usuario.

## 1. Enciclopedia Integrada (Valor Educativo)
Se añadirá una capa educativa a la interfaz:
- En `CropProfiles.ts`, cada especie oficial recibirá un nuevo campo `description` que contendrá un resumen agronómico (nivel de dificultad, valor comercial, morfología, riesgos).
- Al hacer clic en un perfil en la UI, aparecerá una tarjeta estilo "Wikipedia" (Enciclopedia) que enseñará al usuario los fundamentos biológicos de la especie antes de inyectar las reglas.

## 2. Nuevo Sistema de Navegación (Tabs)
La UI contará con tres grandes pestañas:
1. **🍄 Reino Fungi** (Catálogo Oficial)
2. **🌿 Reino Plantae** (Catálogo Oficial)
3. **🛠️ Mis Perfiles (El Creador)**

## 3. Buscador y Filtro
Dentro de los catálogos oficiales:
- Barra de búsqueda (`<input>`) por nombre común o científico.
- Renderizado dinámico de los botones para encontrar rápidamente cualquier especie entre cientos de opciones.

## 4. Modo Ajuste (Tuning de Recetas)
La biología no es binaria.
- Al seleccionar una fase oficial (Ej: Tomate - Vegetativo), se mostrará un botón **"Ajustar Valores"**.
- El usuario podrá modificar el "SetPoint" sugerido por la receta oficial empíricamente antes de presionar "Inyectar", sin corromper la biblioteca base.

## 5. Creador de Perfiles (Mis Perfiles)
Si la especie no existe en el sistema:
- El usuario entra a **Mis Perfiles** y presiona **"Crear Nueva Especie"**.
- Podrá construir desde cero: Nombre, Reino, Fases Fenológicas y Metas Climáticas.
- **Persistencia Local:** Se guardará en el navegador (`localStorage`) como la semilla de un futuro sistema de descargas comunitarias.

## 6. Modificaciones de Código
- **`CropProfiles.ts`**:
  - Extender la interfaz `CropProfile` para añadir el campo `description`.
  - Poblar las 10 especies actuales con las introducciones científicas investigadas previamente.
- **`CropProfileSelectorModal.tsx`**: 
  - Rediseñar el layout: añadir panel de navegación, barra de búsqueda, cuadro de texto de enciclopedia, y el formulario dinámico para perfiles personalizados.

## 7. Verificación Estricta
- Se ejecutará obligatoriamente `npm run build` al finalizar la tarea para verificar que no existan errores TypeScript en el nuevo estado complejo de React.

> [!IMPORTANT]
> **Aprobación Final**
> El plan ahora incluye la Enciclopedia, el Buscador, el Ajuste Fino y el Creador de Perfiles Custom. ¡Es un rediseño enorme pero transformará tu MVP en un producto de clase mundial! Si apruebas el documento, iniciaré la programación de todas estas capas.
