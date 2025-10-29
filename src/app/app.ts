import { Component, inject } from '@angular/core'
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { AsyncPipe } from '@angular/common'
import { of } from 'rxjs'

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

  //placeholder de usuario hasta implementar auth real
  usuario$ = of(true) //simulo logeo

  //router para navegar
  private router = inject(Router)

  //abre o cierra el menu
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen
  }

  //cierra el menu al navegar
  closeMenu() {
    this.isMenuOpen = false
  }

  //logout placeholder con redireccion al login
  logout() {
    //borro posibles rastros de sesion
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')

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
