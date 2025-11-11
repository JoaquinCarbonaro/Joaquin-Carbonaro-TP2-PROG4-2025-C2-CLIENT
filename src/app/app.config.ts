import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core'
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { provideRouter } from '@angular/router'
import { routes } from './app.routes'
import { authInterceptor } from './interceptors/auth.interceptor'

export const appConfig: ApplicationConfig = {
  providers: [
    //capturo errores globales del navegador
    provideBrowserGlobalErrorListeners(),

    //mejoro el rendimiento de deteccion de cambios con coalescencia de eventos
    provideZoneChangeDetection({ eventCoalescing: true }),

    //activo el sistema de enrutamiento usando las rutas definidas
    provideRouter(routes),

    //activo el cliente http con el interceptor de autenticacion
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
}
