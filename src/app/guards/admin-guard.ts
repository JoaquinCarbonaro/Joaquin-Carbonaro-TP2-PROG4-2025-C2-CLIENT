import { Injectable, inject } from '@angular/core' 
import { CanActivate, Router, UrlTree } from '@angular/router'
import { Auth } from '../services/auth'
import { mostrarSwal } from '../utils/swal'

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  //inyecto el servicio de autenticacion para revisar el perfil
  private readonly auth = inject(Auth)
  //inyecto el router para redirigir si no tiene permisos
  private readonly router = inject(Router)

  //valido que el usuario actual tenga perfil administrador
  canActivate(): boolean | UrlTree {
    //consulto al servicio de auth si el usuario logueado es administrador
    const esAdmin = this.auth.esUsuarioAdmin?.() ?? false
    //si el usuario tiene perfil administrador permito el acceso a la ruta
    if (esAdmin) {
      return true
    }
    //si no tiene perfil administrador lo redirijo a la pagina de publicaciones
    return this.router.parseUrl('/publicaciones')
  }
}
