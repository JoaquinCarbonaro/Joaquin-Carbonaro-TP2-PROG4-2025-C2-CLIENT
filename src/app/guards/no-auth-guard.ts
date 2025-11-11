import { Injectable, inject } from '@angular/core'
import { CanActivate, Router, UrlTree } from '@angular/router'
import { jwtDecode } from 'jwt-decode'
import { Auth } from '../services/auth'

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {

  //inyecto el servicio de autenticacion
  private readonly authService = inject(Auth)
  //inyecto el router para redirigir si ya esta logueado
  private readonly router = inject(Router)

  //metodo que decide si se puede acceder a login o registro
  canActivate(): boolean | UrlTree {
    //obtengo el token almacenado o null si no existe
    const token = this.authService.obtenerToken?.() ?? null

    //si no hay token dejo acceder libremente a login o registro
    if (!token) {
      return true
    }

    try {
      //decodifico el token para obtener su payload
      const payload: any = jwtDecode(token as string)
      //obtengo el tiempo actual en segundos
      const ahora = Math.floor(Date.now() / 1000)

      //si el token sigue vigente redirijo a publicaciones
      if (payload?.exp && payload.exp > ahora) {
        return this.router.parseUrl('/publicaciones')
      }

      //si el token esta vencido cierro sesion y permito acceso a login o registro
      if (this.authService.cerrarSesion) {
        //cierro sesion por token vencido
        this.authService.cerrarSesion()
      }
      return true
    } catch (error) {
      //si ocurre error al decodificar el token lo considero invalido
      console.error('token invalido', error)
      //cierro sesion por token invalido y permito el acceso
      if (this.authService.cerrarSesion) {
        this.authService.cerrarSesion()
      }
      return true
    }
  }
}
