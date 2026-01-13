# TP #2 — Red Social (Frontend / Client) — Programación IV

Aplicación web tipo **“Red Social”** desarrollada como Trabajo Práctico de **Programación IV**.  
El objetivo es que los usuarios puedan **registrarse / iniciar sesión**, interactuar con un **feed de publicaciones** (crear, ver, likear y comentar), navegar **perfiles** y que un **administrador** pueda gestionar usuarios y consultar **estadísticas** desde un dashboard.

> Este repositorio contiene únicamente el **frontend (Angular)**.  
> La parte **backend (NestJS)** se encuentra en:  
> https://github.com/JoaquinCarbonaro/Joaquin-Carbonaro-TP2-PROG4-2025-C2-SERVER.git

## 🚀 Demo (Deploy)
- Vercel (Frontend): https://joaquin-carbonaro-tp-2-prog-4-2025.vercel.app/
- Render (API): https://joaquin-carbonaro-tp2-prog4-2025-c2.onrender.com

---

## ✨ Funcionalidades principales

### 🔐 Autenticación y control de acceso (JWT)
- Registro e inicio de sesión contra la API.
- Manejo de sesión con **JWT** (expira a los **15 minutos**).
- Renovación de sesión desde el frontend (sin cortar la navegación).
- Rutas protegidas y control por **roles** (usuario / administrador).
- **Interceptor HTTP** para adjuntar automáticamente el token y manejar respuestas **401** (sesión vencida / no autorizado).

### 📝 Publicaciones (Feed)
- Ver publicaciones en un feed.
- Ordenamiento (por fecha / por likes).
- Crear publicación (texto + imagen opcional).
- Dar / quitar **like**.
- Eliminar publicaciones propias (y como admin, de cualquier usuario).

### 💬 Comentarios
- Ver comentarios de una publicación.
- Agregar comentarios.
- Editar comentario propio (marcando que fue modificado).
- Paginación de comentarios con “cargar más”.

### 👤 Perfiles
- “Mi perfil” con información del usuario y sus publicaciones.
- Visualización de perfiles de otros usuarios desde el feed/publicaciones.

### 🧑‍💼 Dashboard Admin (solo administrador)
- Gestión de usuarios:
  - listado
  - alta (usuario/admin)
  - habilitar/deshabilitar (baja lógica)
- Dashboard de **estadísticas** con gráficos (ECharts).

### 🧩 Extras del TP
- **PWA** (instalable).
- **Pipes propias** para reutilización y transformación de datos en la UI.
- **Directivas propias** para comportamiento/estilos reutilizables.

---

## 🧰 Tecnologías usadas
- Angular + TypeScript (frontend)
- HTML / CSS
- ng-bootstrap (componentes UI)
- ECharts (gráficos)
- JWT (autenticación)

---

## ✅ Contexto del TP
El trabajo se organizó por sprints e incluye: autenticación con expiración/renovación de sesión, CRUD de publicaciones con interacción social (likes y comentarios), perfiles, panel administrador y estadísticas, además de reutilización mediante pipes y directivas.

---

## 💡 Lo que demuestra este proyecto
- **Autenticación y seguridad en frontend**: rutas protegidas, manejo de JWT, interceptor y control de roles.
- **Consumo de API REST**: integración completa con backend (login, publicaciones, comentarios, usuarios, estadísticas).
- **Arquitectura y reutilización en Angular**: separación clara por módulos/componentes/servicios + pipes y directivas propias.
- **UI/UX consistente**: uso de componentes visuales y feedback de sesión (manejo de expiración).
- **Visualización de datos**: dashboard con métricas y gráficos.

---

## 👤 Autor
Joaquín Carbonaro
