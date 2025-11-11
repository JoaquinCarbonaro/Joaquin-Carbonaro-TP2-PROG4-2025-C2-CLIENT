//entorno de produccion (vercel)
export const environment = {
  //indica que la app esta en modo produccion
  production: true,

  //url del backend desplegado en render
  apiBaseUrl: 'https://joaquin-carbonaro-tp2-prog4-2025-c2.onrender.com',

  //tiempo de vida del token: 15 minutos -> SERVER/src/auth/auth.module.ts
  //tiempo en el que avisa, antes de expirar el token 
  tokenWarningMs: 300000, //300.000 milisegundos = 5 minutos

  //usuarios predefinidos para accesos rapidos
  quickLogins: {
    //credenciales de usuario administrador
    admin: {
      identifier: 'admin@rumbo.com',
      password: 'RumboAdmin123'
    },
    //credenciales de usuario normal
    user: {
      identifier: 'user@rumbo.com',
      password: 'RumboTest123'
    }
  }
}