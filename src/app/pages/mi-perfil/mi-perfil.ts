import { Component, OnInit, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { PerfilService } from '../../services/perfil'
import { Perfil } from '../../models/perfil'
import { Publicacion } from '../../models/publicacion'
import { mostrarSwal } from '../../utils/swal'
import { environment } from '../../../environments/environment'
import { PublicacionCardComponent } from '../../components/publicacion-card/publicacion-card'
import { PublicacionesService } from '../../services/publicaciones'
import { Auth } from '../../services/auth'

@Component({
  standalone: true,
  selector: 'app-mi-perfil-page',
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.css',
  imports: [CommonModule, PublicacionCardComponent]
})
export class MiPerfil implements OnInit {

  //inyecto el servicio de perfil para obtener los datos del usuario
  private readonly perfilService = inject(PerfilService)
  //inyecto el servicio de publicaciones para reutilizar acciones
  private readonly publicacionesService = inject(PublicacionesService)
  //inyecto el servicio de autenticacion para conocer el uuid del usuario
  private readonly authService = inject(Auth)

  //almaceno la informacion del perfil del usuario
  protected perfil: Perfil | null = null
  //almaceno la lista completa de publicaciones del usuario cargadas hasta el momento
  protected publicaciones: Publicacion[] = []
  //almaceno las publicaciones visibles (inicia con las tres ultimas y se expande)
  protected ultimas: Publicacion[] = []
  //marco si estoy cargando los datos de perfil o publicaciones
  protected cargando = true
  //guardo un mensaje de error para mostrar en la vista
  protected mensajeError = ''
  //guardo la url base del backend obtenida del archivo de entorno
  protected readonly baseUrl = environment.apiBaseUrl
  //obtengo el uuid del usuario actual para habilitar acciones sobre sus publicaciones
  protected readonly usuarioActualId = this.authService.obtenerIdUsuario()
  //cantidad total de publicaciones del usuario en el backend
  protected totalPublicaciones = 0
  //offset actual usado para la paginacion progresiva
  protected offsetActual = 0
  //cantidad de publicaciones que traigo en cada peticion
  protected readonly limitePorCarga = 3
  //indica si todavia quedan publicaciones para cargar
  protected hayMas = false
  //estado de carga especifico para el listado de publicaciones
  protected cargandoPublicaciones = false
  //se implementara en el sprint 3 habilito la edicion del perfil desde esta vista

  //inicio la carga del perfil cuando se inicia el componente
  ngOnInit(): void {
    this.cargarPerfil()
  }

  //construyo la ruta completa de una imagen recibida
  protected resolverImagen(imagen: string): string {
    //si no hay imagen devuelvo cadena vacia
    if (!imagen) {
      return ''
    }
    //si la imagen ya tiene una ruta completa http la retorno
    if (imagen.startsWith('http')) {
      return imagen
    }
    //elimino barra final de la url base si existe
    const base = this.baseUrl.replace(/\/$/, '')
    //armo la ruta relativa dentro del directorio images
    const ruta = imagen.startsWith('/') ? imagen : `/images/${imagen}`
    //retorno la ruta combinada entre base y ruta relativa
    return `${base}${ruta}`
  }

  //devuelvo las iniciales del perfil para usar en el avatar si no hay imagen
  protected inicialesPerfil(): string {
    const nombre = this.perfil?.userName ?? ''
    //si no hay nombre devuelvo las iniciales del proyecto
    if (nombre === '') {
      return 'RC'
    }
    //tomo la primera letra del nombre y la convierto en mayuscula
    const primeraLetra = nombre.trim().charAt(0)
    return primeraLetra.toUpperCase()
  }

  //manejo el evento cuando el usuario da me gusta a una publicacion
  protected onDarLike(publicacion: Publicacion): void {
    this.publicacionesService.darLike(publicacion._id).subscribe({
      //si la accion fue exitosa reemplazo la publicacion en memoria
      next: (actualizada) => {
        this.reemplazarPublicacion(actualizada)
      },
      //si falla aviso al usuario con un modal
      error: () => {
        mostrarSwal(
          'no se pudo registrar el me gusta',
          'intentalo nuevamente en unos instantes',
          'error'
        )
      }
    })
  }

  //manejo el evento cuando el usuario quita su me gusta
  protected onQuitarLike(publicacion: Publicacion): void {
    this.publicacionesService.quitarLike(publicacion._id).subscribe({
      //si la accion fue exitosa reemplazo la publicacion en memoria
      next: (actualizada) => {
        this.reemplazarPublicacion(actualizada)
      },
      //si falla aviso al usuario con un modal
      error: () => {
        mostrarSwal(
          'no se pudo quitar el me gusta',
          'intentalo nuevamente en unos instantes',
          'error'
        )
      }
    })
  }

  //manejo el evento cuando el usuario elimina una de sus publicaciones
  protected onEliminar(publicacion: Publicacion): void {
    this.publicacionesService.eliminarPublicacion(publicacion._id).subscribe({
      //si la eliminacion fue exitosa actualizo las listas locales
      next: () => {
        this.publicaciones = this.publicaciones.filter((item) => item._id !== publicacion._id)
        this.totalPublicaciones = this.totalPublicaciones > 0 ? this.totalPublicaciones - 1 : 0
        this.offsetActual = this.publicaciones.length
        this.hayMas = this.offsetActual < this.totalPublicaciones
        this.actualizarUltimas()
        mostrarSwal(
          'publicacion eliminada',
          'tu publicacion ya no aparece en el listado',
          'success'
        )
        if (this.hayMas && !this.cargandoPublicaciones) {
          this.cargarPublicacionesUsuario()
        }
      },
      //si falla aviso al usuario con un mensaje de error
      error: () => {
        mostrarSwal(
          'no pudimos eliminarla',
          'revisa tu conexion e intenta otra vez',
          'error'
        )
      }
    })
  }

  //obtengo los datos del perfil desde el servicio de perfil
  private cargarPerfil(): void {
    //activo el estado de carga y limpio mensajes anteriores
    this.cargando = true
    this.mensajeError = ''
    //solicito los datos al servicio de perfil
    this.perfilService.obtenerPerfil().subscribe({
      //manejo la respuesta exitosa del perfil
      next: (respuesta) => {
        //guardo la informacion del usuario
        this.perfil = respuesta.usuario
        //una vez que tengo el perfil cargo las publicaciones del usuario
        this.cargarPublicacionesUsuario(true)
      },
      //manejo el error si la peticion de perfil falla
      error: () => {
        this.cargando = false
        this.mensajeError = 'no pudimos cargar tu perfil en este momento'
        //muestro una alerta modal con sweetalert
        mostrarSwal('sin conexion', this.mensajeError, 'error')
      }
    })
  }

  //obtengo las publicaciones usando el filtro por usuario del backend
  private cargarPublicacionesUsuario(reset: boolean = false): void {
    const usuarioId = this.usuarioActualId

    //si no tengo usuario actual limpio las listas y corto el flujo
    if (usuarioId === '') {
      this.publicaciones = []
      this.ultimas = []
      this.totalPublicaciones = 0
      this.offsetActual = 0
      this.hayMas = false
      this.cargando = false
      this.cargandoPublicaciones = false
      return
    }

    //si ya estoy cargando publicaciones evito peticiones duplicadas
    if (this.cargandoPublicaciones) {
      return
    }

    //si no quedan publicaciones para cargar y no es un reset salgo
    if (!this.hayMas && !reset && this.publicaciones.length > 0) {
      return
    }

    //si piden reiniciar la lista vuelvo a los valores iniciales
    if (reset) {
      this.publicaciones = []
      this.ultimas = []
      this.totalPublicaciones = 0
      this.offsetActual = 0
      this.hayMas = true
      this.mensajeError = ''
      this.cargando = true
    }

    this.cargandoPublicaciones = true

    //calculo el offset segun la cantidad ya cargada
    const offset = reset ? 0 : this.offsetActual

    //solicito las publicaciones del usuario al servicio de publicaciones
    this.publicacionesService
      .listarPublicaciones(offset, this.limitePorCarga, 'recientes', usuarioId)
      .subscribe({
        //si la consulta es exitosa actualizo las listas locales
        next: (respuesta) => {
          const nuevas = respuesta.publicaciones ?? []
          this.publicaciones = reset ? nuevas : [...this.publicaciones, ...nuevas]
          const totalRemoto =
            typeof respuesta.total === 'number'
              ? respuesta.total
              : this.publicaciones.length
          this.totalPublicaciones = totalRemoto
          this.offsetActual = this.publicaciones.length
          this.hayMas = this.offsetActual < this.totalPublicaciones
          this.actualizarUltimas()
          this.cargandoPublicaciones = false
          if (reset) {
            this.cargando = false
          }
        },
        //si falla la consulta muestro mensaje de error segun el contexto
        error: () => {
          this.cargandoPublicaciones = false
          if (reset) {
            this.cargando = false
            this.mensajeError = 'no pudimos cargar tus publicaciones en este momento'
            mostrarSwal('sin conexion', this.mensajeError, 'error')
          } else {
            mostrarSwal(
              'sin conexion',
              'no pudimos cargar mas publicaciones en este momento',
              'error'
            )
          }
        }
      })
  }

  //cargo mas publicaciones del usuario cuando se presiona el boton cargar mas
  protected cargarMasPublicaciones(): void {
    //si ya estoy cargando o no quedan publicaciones salgo
    if (this.cargandoPublicaciones || !this.hayMas) {
      return
    }

    this.cargarPublicacionesUsuario()
  }

  //reemplazo una publicacion por su version actualizada en las listas locales
  private reemplazarPublicacion(actualizada: Publicacion): void {
    //recorro las publicaciones y reemplazo solo la que coincide por id
    this.publicaciones = this.publicaciones.map((item) => {
      if (item._id === actualizada._id) {
        return actualizada
      }
      return item
    })
    //despues de reemplazar recalculo las ultimas publicaciones
    this.actualizarUltimas()
  }

  //calculo las tres publicaciones mas recientes para mostrarlas en la seccion principal
  private actualizarUltimas(): void {
    //ordeno las publicaciones de mas reciente a mas antigua
    const ordenadas = [...this.publicaciones].sort((a, b) => {
      const fechaA = new Date(a.createdAt).getTime()
      const fechaB = new Date(b.createdAt).getTime()
      return fechaB - fechaA
    })
    //actualizo la lista visible con todas las publicaciones cargadas hasta el momento
    this.ultimas = ordenadas
  }
}
