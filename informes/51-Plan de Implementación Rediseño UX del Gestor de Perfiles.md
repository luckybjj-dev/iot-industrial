# Plan de Implementación: Rediseño UX del Gestor de Perfiles

El usuario ha solicitado una mejora sustancial en la experiencia de usuario (UX) del `CropProfileSelectorModal` para manejar decenas o cientos de especies sin fricción, además de la capacidad de ajustar variables empíricamente.

## 1. Nuevo Sistema de Navegación (Tabs)
Se implementará una barra de navegación principal para seleccionar el modo de operación:
- **🍄 Reino Fungi**
- **🌿 Reino Plantae**
- **⚙️ Modo Manual**

## 2. Buscador Integrado (Filtro Inteligente)
Dentro de las pestañas Fungi y Plantae:
- Se añadirá una barra de búsqueda (`<input type="text">` con ícono de Lupa `Search`).
- El filtro buscará coincidencias tanto en el `commonName` (Ej: Tomate) como en el `scientificName` (Ej: Solanum).
- La lista de especies se renderizará dinámicamente en base a este filtro, eliminando el scroll infinito.

## 3. Modo Edición (Ajuste Biológico)
"La biología no es binaria". Para permitir ajustes finos:
- Al seleccionar una fase de un perfil predefinido (Ej: Tomate - Vegetativo), se mostrarán las metas climáticas.
- Se añadirá un botón **"Editar"** (`Edit3` icon).
- Al presionarlo, los valores (Temp Min, Temp Max, Humedad, etc.) se convertirán en campos de texto editables (`<input type="number">`).
- El usuario podrá modificar el "SetPoint" sugerido por la receta antes de presionar "Inyectar".

## 4. Modo Manual Absoluto
Si el usuario selecciona la pestaña **⚙️ Modo Manual**:
- Se ocultará la lista de especies y fases.
- Se mostrará un lienzo en blanco (formulario) con todos los parámetros climáticos (Temperatura, Humedad, FAE, Fotoperiodo, PPFD).
- El usuario podrá crear una regla termodinámica desde cero y enviarla directamente al ESP32.

## 5. Modificaciones de Código Requeridas
- **`CropProfileSelectorModal.tsx`**: 
  - Añadir estados: `activeTab`, `searchQuery`, `isEditing`, `customTargets`.
  - Importar íconos de `lucide-react`: `Search`, `Settings`, `Edit3`, `Save`.
  - Refactorizar el renderizado del cuerpo del modal en componentes/funciones más pequeñas.
- **`CropProfiles.ts`**:
  - Ajustar `generateRulesFromProfile` para aceptar un objeto `ClimateTargets` modificado (sobrescribiendo temporalmente la base de datos estática) y generar las reglas en base al input del usuario.

## 6. Verificación (Estricta)
- Al finalizar, se ejecutará `npm run build` para garantizar la ausencia de errores TypeScript derivados del nuevo estado complejo.

> [!IMPORTANT]
> **Aprobación Requerida**
> Por favor, revisa estas características. ¿El "Modo Edición" sobre una receta predefinida cubre tu requerimiento de "elegir a conveniencia" o prefieres únicamente el "Modo Manual Absoluto"? Puedes aprobar el plan para implementar ambas opciones.
