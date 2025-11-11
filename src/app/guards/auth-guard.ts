import { Injectable, inject } from '@angular/core'
import { CanActivate, Router, UrlTree } from '@angular/router'
import { jwtDecode } from 'jwt-decode'
import { Auth } from '../services/auth'

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  //inyecto el servicio de autenticacion
  private readonly authService = inject(Auth)
  //inyecto el router para navegar si no hay acceso
  private readonly router = inject(Router)

  //metodo principal que determina si se puede activar una ruta protegida
  canActivate(): boolean | UrlTree {
    //obtengo el token del servicio de autenticacion o null si no existe
    const token = this.authService.obtenerToken?.() ?? null

    //si no hay token, limpio sesion y redirijo al login
    if (!token) {
      if (this.authService.cerrarSesion) {
        //cierro sesion del usuario
        this.authService.cerrarSesion()
      }
      //redirijo al login
      return this.router.parseUrl('/login')
    }

    try {
      //decodifico el token para obtener su payload
      const payload: any = jwtDecode(token as string)
      //obtengo el tiempo actual en segundos
      const ahora = Math.floor(Date.now() / 1000)

      //si el token esta vencido cierro sesion y redirijo al login
      if (!payload?.exp || payload.exp < ahora) {
        if (this.authService.cerrarSesion) {
          //cierro sesion por token vencido
          this.authService.cerrarSesion()
        }
        //redirijo al login
        return this.router.parseUrl('/login')
      }

      //si el token es valido permito el acceso
      return true
    } catch (error) {
      //si el token es invalido capturo el error
      console.error('token invalido', error)
      if (this.authService.cerrarSesion) {
        //cierro sesion por error al decodificar
        this.authService.cerrarSesion()
      }
      //redirijo al login
      return this.router.parseUrl('/login')
    }
  }
}
