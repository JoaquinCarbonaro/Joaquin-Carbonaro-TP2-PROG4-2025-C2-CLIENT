import { Component, inject } from '@angular/core'
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { AsyncPipe } from '@angular/common'

import { AuthService } from './services/auth'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {

  //estado del menu en mobile
  isMenuOpen = false

  //servicio de autenticacion
  private readonly authService = inject(AuthService)

  //router para navegar
  private router = inject(Router)

  //flujo de usuario logueado
  usuario$ = this.authService.usuarioLogueado$

  //nombre observable del usuario
  nombreUsuario$ = this.authService.nombreUsuario$

  constructor() {
    //se inicia la vigilancia de la sesion guardada
    this.authService.iniciarVigilanciaToken()
  }

  //abre o cierra el menu
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen
  }

  //cierra el menu al navegar
  closeMenu() {
    this.isMenuOpen = false
  }

  //logout con redireccion al login
  logout() {
    //cierro sesion en el servicio
    this.authService.cerrarSesion()

    //cierro menu y voy al login
    this.closeMenu()
    this.router.navigateByUrl('/login')
  }

  //links para anonimos
  get linksAnonimos() {
    return [
      { label: 'Login', path: '/login' },
      { label: 'Registro', path: '/registro' },
    ] as const
  }

  //links para logueados
  get linksPrivados() {
    return [
      { label: 'Publicaciones', path: '/publicaciones' },
      { label: 'Mi perfil', path: '/mi-perfil' },
    ] as const
  }

  //año actual para el footer
  currentYear = new Date().getFullYear()
}
