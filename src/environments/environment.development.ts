//entorno local de desarrollo (localhost)
export const environment = {
  //indica que no es version de produccion
  production: false,

  //url base del backend nest local
  apiBaseUrl: 'http://localhost:3000',

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
