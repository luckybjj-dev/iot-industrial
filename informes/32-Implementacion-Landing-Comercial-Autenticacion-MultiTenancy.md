# Informe 32 — Implementación de Landing Page Comercial, Autenticación Empresarial Dual y Arquitectura Multi-Tenancy

**Fecha:** 29 de Agosto de 2026  
**Módulo:** SCADA Frontend React, Firebase Auth & RTDB Security Rules  
**Archivos Creados/Modificados:** LandingPage.tsx, AuthModal.tsx, NoDevicesView.tsx, AuthContext.tsx, App.tsx, cultivo.ts, database.rules.json

---

## 1. Objetivos del Sprint

1. **Transformación a Producto Comercial:** Dotar a la plataforma de una **Landing Page pública** moderna para presentación del sistema ciberfísico AgriEdge OS, showcase de hardware y captación de clientes.
2. **Sistema de Autenticación Empresarial:** Habilitar acceso seguro con **Email/Contraseña** y **Google Workspace**, incluyendo flujos de registro y recuperación de credenciales.
3. **Aislamiento Multi-Tenancy & Roles:** Garantizar que los nuevos clientes/operadores solo vean los nodos que les pertenecen (ssignedDevices), protegiendo los datos de producción de otras cámaras.

---

## 2. Componentes Implementados

### 2.1 Landing Page Comercial (LandingPage.tsx)
- **Navbar:** Marca institucional con badge 2.4 INDUSTRIAL, navegación suave por anclas (#features, #hardware, #biology, #architecture, #contact) y botón de **Acceso a Clientes**.
- **Hero Section & HMI Preview:** Titular de alto impacto y demostración reactiva de las tarjetas telemétricas (Temperatura, Humedad, VPD, Zona Raíz/Sustrato, CO2 NDIR y Matriz de Actuadores).
- **Métricas Industriales:** .99\%$ Uptime autónomo, $<50\text{ms}$ latencia, $\pm 0.2^\circ\text{C}$ precisión PID, \%$ resiliencia offline.
- **Showcase de Hardware:** ESP32 Dual-Core (FreeRTOS Core 0/Core 1), Dual DHT22 redundante, sonda NTC con calibración eFuse Two-Point, sensor CO2 NDIR SCD30 y relés con *Anti-Short-Cycle* (180s).
- **Ecosistema Biológico Fungi & Plantae:** Modelos interactivos para micología (+3°C termogénesis, niebla ultrasónica) y horticultura (Frutilla Monterey, fotoperiodo, temperatura radicular anti-Pythium).
- **Arquitectura PLC 3 Capas & Formulario Comercial:** Captura de requerimientos y cotizaciones.

### 2.2 Modal de Autenticación Dual (AuthModal.tsx)
- Tri-modal: **Iniciar Sesión**, **Registrarse** y **Recuperar Contraseña**.
- Validación de contraseñas ($\ge 6$ caracteres) y mapeo descriptivo de códigos de error de Firebase en español.

### 2.3 Onboarding de Operadores sin Nodos (NoDevicesView.tsx)
- Pantalla de bienvenida limpia para usuarios registrados que aún no tienen dispositivos asignados.
- Formulario de vinculación rápida mediante ID de nodo (deviceId) o código de activación.

### 2.4 Arquitectura Multi-Tenancy (AuthContext.tsx & App.tsx)
- **Super Administrador:** Lista blanca estricta (lagos.bryan@gmail.com, Agrovicespa@gmail.com). Tienen visibilidad global de todos los nodos en tiempo real.
- **Operador / Cliente:** Cuentas estándar filtradas de forma reactiva por ssignedDevices.
- **Sincronización No-Bloqueante:** Perfil optimista instantáneo en memoria para carga inmediata sin bloqueos de red.

### 2.5 Reglas de Seguridad (database.rules.json)
- Habilitación de lectura y escritura protegida en /users/ condicionada a uth != null.

---

## 3. Verificación y Resultados

- ✅ **Compilación TypeScript & Vite:** 	sc -b && vite build $\rightarrow$ 0 errores, 0 warnings.
- ✅ **Validación Super Administrador (Tier 2):** Usuario lagos.bryan@gmail.com validó acceso directo con badge 👑 Super Administrador y telemetría en vivo.
- ✅ **Validación Operador Aislado (Tier 2):** Cuenta alternativa validó restricción de acceso y pantalla de vinculación sin fugas de datos.

---

## 4. Estado en Roadmap
- [x] **Landing Page Comercial Pública** ✅ COMPLETADO ([Informe 32](./32-Implementacion-Landing-Comercial-Autenticacion-MultiTenancy.md))
- [x] **Autenticación Dual (Email/Password + Google Auth)** ✅ COMPLETADO ([Informe 32](./32-Implementacion-Landing-Comercial-Autenticacion-MultiTenancy.md))
- [x] **Aislamiento Multi-Tenancy & Gestión de Roles** ✅ COMPLETADO ([Informe 32](./32-Implementacion-Landing-Comercial-Autenticacion-MultiTenancy.md))
