# Generación de Perfiles con Etapas Fenológicas Automáticas

Este plan detalla la reestructuración del flujo de "Crear Perfil" para permitir al usuario elegir el reino biológico y pre-cargar automáticamente todas sus etapas fenológicas listas para ser editadas.

## Requisitos
- Al hacer clic en "Crear", el sistema debe preguntar: "¿A qué reino pertenece?".
- Opción 1: 🍄 Reino Fungi.
- Opción 2: 🌿 Reino Plantae.
- Al elegir, se debe generar un perfil con las **fases completas pre-estructuradas** según el reino.

---

> [!IMPORTANT]  
> **Revisión del Usuario Requerida**  
> Por favor revisa las preguntas abiertas a continuación y aprueba el plan si estás de acuerdo con el enfoque propuesto.

## Preguntas Abiertas (Open Questions)
1. **Valores Iniciales:** Al crear las 5 etapas fenológicas automáticamente, ¿prefieres que todos los valores (Temperatura, Humedad, etc.) inicien en `0`, o prefieres que inicie con **"Valores Promedio/Seguros"** (ej. 20°C y 80% de humedad) para que sea más rápido editarlos sin partir totalmente de cero? *Propongo usar valores promedio seguros.*
2. **Nombres de Etapas Plantae:** Propongo usar: *1. Germinación, 2. Plántula, 3. Crecimiento Vegetativo, 4. Floración, 5. Maduración/Fructificación*. ¿Estás de acuerdo con estos nombres?
3. **Nombres de Etapas Fungi:** Propongo usar: *1. Incubación, 2. Consolidación, 3. Inducción de Primordios, 4. Fructificación, 5. Descanso*. ¿Estás de acuerdo?

## Cambios Propuestos

### [MODIFY] `CropProfileSelectorModal.tsx`

#### 1. Nuevo Estado UI
Añadir una variable de estado para controlar la pantalla de selección de reino:
```typescript
const [isSelectingKingdom, setIsSelectingKingdom] = useState(false);
```

#### 2. Lógica de Plantillas (Templates)
Modificar `handleCreateProfile` para que abra el modal de selección en lugar de crear directamente el perfil.
Crear una nueva función `generateProfileForKingdom(kingdom: 'FUNGI' | 'PLANTAE')`:
- Generará un ID único.
- Inyectará un array de 5 `CropPhase` (Etapas) basándose en la elección.
- Guardará el perfil en `localStorage`.
- Seleccionará automáticamente la fase 1 del nuevo perfil y cerrará el modal de selección.

#### 3. Interfaz Gráfica (Modal de Selección)
Añadir un componente modal superpuesto (similar al modal de borrado actual) que aparezca cuando `isSelectingKingdom === true`.
Tendrá dos botones grandes:
- **🍄 Cultivo Fungi** (Inyecta las 5 etapas de hongos)
- **🌿 Cultivo Plantae** (Inyecta las 5 etapas de plantas)

## Plan de Verificación
### Pruebas Manuales
1. Presionar "Crear". Verificar que sale el menú de elección de Reino.
2. Elegir "Fungi". Verificar que el perfil se crea y el panel central muestra las 5 etapas de hongos en la barra superior.
3. Elegir "Plantae". Verificar que el perfil se crea con las 5 etapas de plantas.
4. Editar la Fase 3, guardar, cambiar a la Fase 4 y volver a la 3 para asegurar que la inyección de datos funciona individualmente para cada etapa generada.
