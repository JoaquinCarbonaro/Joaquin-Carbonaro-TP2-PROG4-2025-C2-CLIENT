# Rumbo Criollo — Red Social Frontend

Frontend de una aplicación web tipo **red social** desarrollada con **Angular y TypeScript**.

Este proyecto fue realizado como **Trabajo Práctico N.º 2 de la materia Programación IV**. El objetivo es que los usuarios puedan registrarse, iniciar sesión, interactuar con publicaciones, comentar, dar likes, navegar perfiles y que un administrador pueda gestionar usuarios y consultar estadísticas desde un dashboard.

Este repositorio contiene únicamente el **frontend** de la aplicación.

Backend/API:

https://github.com/JoaquinCarbonaro/Rumbo-Criollo-red-social-nestjs-api

---

## 🚀 Demo

El frontend se encuentra desplegado en Vercel y puede visualizarse desde el siguiente enlace:

https://joaquin-carbonaro-tp-2-prog-4-2025.vercel.app

> Nota: algunas funcionalidades, como autenticación, publicaciones, comentarios, likes o carga de datos, pueden no estar disponibles actualmente porque dependen de la API y la base de datos utilizadas para el trabajo práctico. De todas formas, el deploy permite visualizar la interfaz y la estructura general del frontend.

Repositorio frontend:

https://github.com/JoaquinCarbonaro/Rumbo-Criollo-red-social-angular-frontend

Repositorio backend/API:

https://github.com/JoaquinCarbonaro/Rumbo-Criollo-red-social-nestjs-api

---

## ✨ Funcionalidades principales

### 🔐 Autenticación y control de acceso

- Registro de usuarios.
- Inicio de sesión contra API backend.
- Manejo de sesión mediante JWT.
- Renovación de sesión desde el frontend.
- Rutas protegidas.
- Control de acceso por roles: usuario y administrador.
- Interceptor HTTP para adjuntar el token automáticamente.
- Manejo de respuestas 401 para sesión vencida o acceso no autorizado.

---

## 📝 Feed de publicaciones

- Visualización de publicaciones.
- Ordenamiento por fecha o likes.
- Creación de publicaciones.
- Publicaciones con texto e imagen opcional.
- Dar y quitar like.
- Eliminación de publicaciones propias.
- Eliminación de publicaciones por parte de administrador.

---

## 💬 Comentarios

- Visualización de comentarios por publicación.
- Creación de comentarios.
- Edición de comentarios propios.
- Marcado visual de comentarios editados.
- Paginación con opción de cargar más comentarios.

---

## 👤 Perfiles

- Pantalla de perfil propio.
- Visualización de datos del usuario.
- Visualización de publicaciones propias.
- Acceso a perfiles de otros usuarios desde el feed.

---

## 🧑‍💼 Dashboard administrador

Funcionalidad disponible solo para usuarios con rol administrador.

Incluye:

- Listado de usuarios.
- Alta de usuarios.
- Alta de administradores.
- Habilitación y deshabilitación de usuarios.
- Visualización de estadísticas.
- Gráficos mediante ECharts.

---

## 🧩 Extras del proyecto

- PWA instalable.
- Pipes propias.
- Directivas propias.
- Reutilización de componentes.
- Feedback visual para acciones del usuario.
- Manejo de expiración de sesión.

---

## 🧰 Tecnologías usadas

- Angular
- TypeScript
- HTML
- CSS
- Bootstrap
- ng-bootstrap
- ECharts
- JWT
- API REST
- Git
- GitHub

---

## 🔗 Integración con backend

Este frontend consume una API REST desarrollada con **NestJS y MongoDB**.

El backend se encarga de:

- Autenticación.
- Emisión y renovación de JWT.
- Usuarios.
- Publicaciones.
- Comentarios.
- Likes.
- Estadísticas.
- Control de roles.

Repositorio backend/API:

https://github.com/JoaquinCarbonaro/Rumbo-Criollo-red-social-nestjs-api

---

## ✅ Contexto académico

Este proyecto fue desarrollado como parte de **Programación IV**.

El trabajo se organizó por etapas e incluye:

- Autenticación con JWT.
- CRUD de publicaciones.
- Interacción social con likes y comentarios.
- Perfiles de usuario.
- Panel administrador.
- Estadísticas.
- Pipes y directivas propias.
- Integración completa con backend.

---

## 💡 Lo que demuestra este proyecto

- Desarrollo frontend con Angular y TypeScript.
- Consumo de API REST.
- Manejo de autenticación con JWT.
- Rutas protegidas.
- Interceptor HTTP.
- Control de roles.
- Arquitectura por componentes y servicios.
- Reutilización mediante pipes y directivas.
- Visualización de datos con gráficos.
- Construcción de una interfaz tipo red social.

---

## 👤 Autor

**Joaquín Carbonaro**

GitHub: https://github.com/JoaquinCarbonaro  
LinkedIn: https://www.linkedin.com/in/joaquin-carbonaro
