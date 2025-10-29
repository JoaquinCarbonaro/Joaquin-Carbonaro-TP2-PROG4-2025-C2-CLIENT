import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideRouter } from '@angular/router'

import { routes } from './app.routes'

export const appConfig: ApplicationConfig = {
  providers: [
    //captura errores globales del navegador
    provideBrowserGlobalErrorListeners(),

    //mejora el rendimiento de deteccion de cambios
    provideZoneChangeDetection({ eventCoalescing: true }),

    //habilita el sistema de enrutamiento con las rutas definidas
    provideRouter(routes),

    //habilita el cliente http para peticiones al backend
    provideHttpClient()
  ]
}
