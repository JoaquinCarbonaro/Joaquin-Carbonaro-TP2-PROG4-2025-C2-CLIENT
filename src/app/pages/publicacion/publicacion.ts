import { Component, OnInit, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { PublicacionesService } from '../../services/publicaciones'
import { Publicacion } from '../../models/publicacion'
import { Auth } from '../../services/auth'
import { mostrarSwal } from '../../utils/swal'
import { environment } from '../../../environments/environment'
import { PublicacionCardComponent } from '../../components/publicacion-card/publicacion-card'

@Component({
  standalone: true,
  selector: 'app-publicacion-detalle',
  templateUrl: './publicacion.html',
  styleUrl: './publicacion.css',
  imports: [CommonModule, RouterLink, PublicacionCardComponent]
})
export class PublicacionDetalle implements OnInit {
  //inyecto la ruta activada para leer el id de la publicacion
  private readonly route = inject(ActivatedRoute)
  //inyecto el router para poder navegar cuando hay errores
  private readonly router = inject(Router)
  //inyecto el servicio de publicaciones para obtener el detalle
  private readonly publicacionesService = inject(PublicacionesService)
  //inyecto el servicio de autenticacion para conocer el usuario actual
  private readonly authService = inject(Auth)

  //guardo el detalle de la publicacion seleccionada
  protected publicacion: Publicacion | null = null
  //controlo el estado de carga del detalle
  protected cargandoPublicacion = false
  //almaceno el mensaje de error a mostrar en la pagina
  protected mensajeError = ''

  //guardo la url base del backend para armar rutas absolutas de imagenes
  protected readonly baseUrl = environment.apiBaseUrl
  //guardo el uuid del usuario actual obtenido desde autenticacion
  protected readonly usuarioActualId = this.authService.obtenerIdUsuario()
  //indica si el usuario actual posee permisos de administrador
  protected readonly usuarioEsAdmin = this.authService.esUsuarioAdmin()

  //guardo el id interno de la publicacion actual tomada desde la ruta
  private publicacionId = ''

  //inicializo el componente y preparo la carga del detalle
  ngOnInit(): void {
    //obtengo el id de la publicacion desde la ruta
    const id = this.route.snapshot.paramMap.get('id') ?? ''

    //si no hay id valido vuelvo al listado
    if (id === '') {
      mostrarSwal('publicacion inexistente', 'te llevamos al listado general', 'error')
      this.router.navigate(['/publicaciones'])
      return
    }

    //guardo el id y disparo la carga del detalle
    this.publicacionId = id
    this.cargarPublicacion()
  }

  //traigo el detalle de la publicacion desde el backend
  private cargarPublicacion(): void {
    //activo el estado de carga y limpio mensajes anteriores
    this.cargandoPublicacion = true
    this.mensajeError = ''

    //me suscribo al servicio para obtener el detalle desde el backend
    this.publicacionesService.obtenerPublicacion(this.publicacionId).subscribe({
      next: (publicacion) => {
        //guardo el detalle recibido y desactivo el estado de carga
        this.publicacion = publicacion
        this.cargandoPublicacion = false
      },
      error: () => {
        //desactivo el estado de carga y preparo mensaje de error
        this.cargandoPublicacion = false
        this.mensajeError = 'no pudimos cargar la publicacion solicitada'
        //muestro modal de aviso y redirijo al listado principal
        mostrarSwal('publicacion no disponible', 'volvemos al listado principal', 'error')
        this.router.navigate(['/publicaciones'])
      }
    })
  }

  //manejo el evento de dar like cuando estoy en la vista detalle
  protected onDarLike(publicacion: Publicacion): void {
    //llamo al servicio para registrar el me gusta
    this.publicacionesService.darLike(publicacion._id).subscribe({
      next: (actualizada) => {
        //actualizo el detalle local con la publicacion devuelta
        this.publicacion = actualizada
      },
      error: () => {
        //muestro mensaje de error si no pude registrar el like
        mostrarSwal('no pudimos registrar el me gusta', 'intentalo nuevamente', 'error')
      }
    })
  }

  //manejo el evento de quitar like cuando estoy en detalle
  protected onQuitarLike(publicacion: Publicacion): void {
    //llamo al servicio para quitar el me gusta
    this.publicacionesService.quitarLike(publicacion._id).subscribe({
      next: (actualizada) => {
        //actualizo el detalle local con la publicacion devuelta
        this.publicacion = actualizada
      },
      error: () => {
        //muestro mensaje de error si no pude quitar el like
        mostrarSwal('no pudimos quitar el me gusta', 'intentalo nuevamente', 'error')
      }
    })
  }

  //manejo la eliminacion de la publicacion desde el detalle
  protected onEliminar(publicacion: Publicacion): void {
    //llamo al servicio para eliminar la publicacion actual
    this.publicacionesService.eliminarPublicacion(publicacion._id).subscribe({
      next: () => {
        //informo que se elimino y vuelvo al listado general
        mostrarSwal('publicacion eliminada', 'la quitamos del listado general', 'success')
        this.publicacion = null
        this.router.navigate(['/publicaciones'])
      },
      error: () => {
        //muestro error si no pude completar la eliminacion
        mostrarSwal('no pudimos eliminarla', 'intenta nuevamente en unos instantes', 'error')
      }
    })
  }
}
