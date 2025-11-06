//entorno local de desarrollo (localhost)
export const environment = {
  //indica que no es version de produccion
  production: false,

  //url base del backend nest local
  apiBaseUrl: 'http://localhost:3000',

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
    //credenciales de usuario normal
    user: {
      identifier: 'user@rumbo.com',
      password: 'RumboTest123'
    }
  }
}
