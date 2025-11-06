//entorno de produccion (vercel)
export const environment = {
  //indica que la app esta en modo produccion
  production: true,

  //url del backend desplegado en render
  apiBaseUrl: 'https://joaquin-carbonaro-tp2-prog4-2025-c2.onrender.com',

  //por ahora false
  useCookies: false,

  //tiempo antes de expirar token para avisar
  tokenWarningMs: 60000,

  //usuarios predefinidos para accesos rapidos
  quickLogins: {
    //credenciales de administrador
    admin: {
      identifier: 'admin@rumbo.com',
      password: 'RumboAdmin123'
    },
    //credenciales de usuario comun
    user: {
      identifier: 'user@rumbo.com',
      password: 'RumboTest123'
    }
  }
}
