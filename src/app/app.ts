import { Component, OnInit, inject } from '@angular/core'
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { AsyncPipe } from '@angular/common'
import { Auth } from './services/auth'
import { PerfilService } from './services/perfil'
import { environment } from '../environments/environment'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {

  //estado del menu en mobile (true cuando el menu desplegable esta abierto)
  isMenuOpen = false

  //servicio de autenticacion para manejar login, logout y estado del usuario
  private readonly authService = inject(Auth)

  //servicio de perfil para obtener y compartir los datos del usuario
  private readonly perfilService = inject(PerfilService)

  //instancia del router para navegar entre paginas de la aplicacion
  private router = inject(Router)

  //flujo reactivo que indica si hay un usuario logueado (true/false)
  usuario$ = this.authService.usuarioLogueado$

  //flujo reactivo con el nombre del usuario autenticado
  nombreUsuario$ = this.authService.nombreUsuario$

  //flujo reactivo con el perfil actual para usarlo en el navbar
  perfilNavbar$ = this.perfilService.perfilActual$

  //url base del backend para construir rutas completas
  protected readonly baseUrl = environment.apiBaseUrl

  //url final del avatar lista para mostrar en el navbar
  protected avatarNavbar = ''

  //anio actual calculado una sola vez para mostrar en el footer
  currentYear = new Date().getFullYear()

  //ciclo de vida: se ejecuta una sola vez al inicializar el componente raiz
  ngOnInit(): void {
    //inicio la vigilancia del token guardado (renovacion y cierre de sesion si expira)
    this.authService.iniciarVigilanciaToken()

    //cuando cambia el estado de login decido si cargo o limpio el perfil
    this.usuario$.subscribe((logueado) => {
      if (logueado) {
        //si hay usuario logueado pido el perfil inicial
        this.perfilService.obtenerPerfil().subscribe({
          error: () => {
            this.avatarNavbar = ''
          }
        })
      } else {
        //si no hay sesion limpio la imagen del navbar
        this.avatarNavbar = ''
      }
    })

    //me suscribo al perfil actual para mantener sincronizado el avatar del navbar
    this.perfilNavbar$.subscribe((perfil) => {
      if (!perfil) {
        this.avatarNavbar = ''
        return
      }
      this.avatarNavbar = this.resolverImagen(perfil.imagenPerfil ?? '')
    })
  }

  //abre o cierra el menu hamburguesa segun el estado actual
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen
  }

  //cierra el menu (se usa al navegar a otra pagina)
  closeMenu() {
    this.isMenuOpen = false
  }

  //logout con redireccion al login
  logout() {
    //cierro sesion en el servicio de autenticacion
    this.authService.cerrarSesion()

    //limpio el avatar del navbar para que no quede imagen previa
    this.avatarNavbar = ''

    //cierro el menu y navego a la pagina de login
    this.closeMenu()
    this.router.navigateByUrl('/login')
  }

  //links visibles para usuarios anonimos (no logueados)
  get linksAnonimos() {
    return [
      { label: 'Login', path: '/login' },
      { label: 'Registro', path: '/registro' },
    ] as const
  }

  //links visibles para usuarios logueados
  get linksPrivados() {
    return [
      { label: 'Publicaciones', path: '/publicaciones' },
      { label: 'Mi perfil', path: '/mi-perfil' },
    ] as const
  }

  //armo la ruta completa de la imagen a partir de la url relativa o absoluta
  protected resolverImagen(imagen?: string | null): string {
    //si no hay imagen devuelvo string vacio
    if (!imagen) {
      return ''
    }
    //si la imagen ya es una url absoluta la retorno sin cambios
    if (imagen.startsWith('http')) {
      return imagen
    }
    //normalizo la base para evitar doble barra al concatenar
    const base = this.baseUrl.replace(/\/$/, '')
    //si la ruta ya empieza con / la uso tal cual, sino asumo carpeta /images
    const ruta = imagen.startsWith('/') ? imagen : `/images/${imagen}`
    //devuelvo la url completa lista para usar en el src
    return `${base}${ruta}`
  }
}
