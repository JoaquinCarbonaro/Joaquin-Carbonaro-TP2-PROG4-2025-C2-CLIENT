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

  //inyecto el servicio de perfil para obtener datos del usuario
  private readonly perfilService = inject(PerfilService)
  //inyecto el servicio de publicaciones para operar sobre publicaciones del usuario
  private readonly publicacionesService = inject(PublicacionesService)
  //inyecto el servicio de autenticacion para conocer el usuario actual
  private readonly authService = inject(Auth)

  //perfil del usuario actualmente autenticado
  protected perfil: Perfil | null = null
  //todas las publicaciones cargadas en memoria del usuario
  protected publicaciones: Publicacion[] = []
  //sublista de publicaciones visibles segun la paginacion local
  protected ultimas: Publicacion[] = []
  //indica si se esta cargando el perfil o las publicaciones iniciales
  protected cargando = true
  //mensaje de error a mostrar en la vista cuando falla alguna carga
  protected mensajeError = ''
  //url base del backend para armar rutas absolutas de recursos
  protected readonly baseUrl = environment.apiBaseUrl
  //ruta al placeholder de imagen de perfil calculada en base a la url del backend
  protected readonly placeholderPerfil = this.calcularPlaceholder()
  //uuid del usuario actual obtenido desde el servicio de autenticacion
  protected readonly usuarioActualId = this.authService.obtenerIdUsuario()
  //cantidad total de publicaciones del usuario segun el backend
  protected totalPublicaciones = 0
  //cantidad de publicaciones ya solicitadas al backend
  protected offsetActual = 0
  //limite de publicaciones a pedir por cada carga al backend
  protected readonly limitePorCarga = 3
  //indica si todavia hay publicaciones pendientes de mostrar
  protected hayMas = false
  //indica si se esta realizando una llamada activa para cargar publicaciones
  protected cargandoPublicaciones = false

  //cantidad de publicaciones que se muestran actualmente en la vista
  private cantidadVisible = this.limitePorCarga
  //buffer para almacenar publicaciones precargadas antes de que el usuario las solicite
  private bufferPublicaciones: Publicacion[] = []
  //indica si ya se esta precargando una pagina adicional
  private precargando = false

  //al inicializar el componente solicito el perfil y sus publicaciones
  ngOnInit(): void {
    this.cargarPerfil()
  }

  //resuelve la url absoluta de una imagen de perfil o publicacion
  protected resolverImagen(imagen: string): string {
    //si no viene imagen devuelvo cadena vacia
    if (!imagen) {
      return ''
    }
    //si es una url absoluta la reutilizo sin cambios
    if (imagen.startsWith('http')) {
      return imagen
    }
    //normalizo la base eliminando barra final si existe
    const base = this.baseUrl.replace(/\/$/, '')
    //armo la ruta relativa respetando si ya comienza con barra
    const ruta = imagen.startsWith('/') ? imagen : `/images/${imagen}`
    //devuelvo la ruta absoluta combinando base y ruta relativa
    return `${base}${ruta}`
  }

  //maneja el error al cargar la imagen de avatar del perfil
  protected onAvatarPerfilError(evento: Event): void {
    const elemento = evento.target as HTMLImageElement | null

    //si no se puede obtener el elemento no hago nada
    if (!elemento) {
      return
    }

    //si ya esta usando el placeholder evito entrar en un bucle
    if (elemento.src.includes('placeholder.png')) {
      return
    }

    //reemplazo la imagen fallida por el placeholder de perfil
    elemento.src = this.placeholderPerfil
  }

  //devuelve las iniciales a mostrar cuando no hay imagen de perfil
  protected inicialesPerfil(): string {
    const nombre = this.perfil?.userName ?? ''
    //si no hay nombre muestro iniciales del proyecto
    if (nombre === '') {
      return 'RC'
    }
    //obtengo la primera letra del nombre sin espacios y la paso a mayuscula
    const primeraLetra = nombre.trim().charAt(0)
    return primeraLetra.toUpperCase()
  }

  //maneja el evento de dar like sobre una publicacion del perfil
  protected onDarLike(publicacion: Publicacion): void {
    this.publicacionesService.darLike(publicacion._id).subscribe({
      //si el backend devuelve la publicacion actualizada la reemplazo en la lista
      next: (actualizada) => {
        this.reemplazarPublicacion(actualizada)
      },
      //si ocurre un error muestro un mensaje al usuario
      error: () => {
        mostrarSwal(
          'no se pudo registrar el me gusta',
          'intentalo nuevamente en unos instantes',
          'error'
        )
      }
    })
  }

  //maneja el evento de quitar like sobre una publicacion del perfil
  protected onQuitarLike(publicacion: Publicacion): void {
    this.publicacionesService.quitarLike(publicacion._id).subscribe({
      //si el backend devuelve la publicacion actualizada la reemplazo en la lista
      next: (actualizada) => {
        this.reemplazarPublicacion(actualizada)
      },
      //si ocurre un error muestro un mensaje al usuario
      error: () => {
        mostrarSwal(
          'no se pudo quitar el me gusta',
          'intentalo nuevamente en unos instantes',
          'error'
        )
      }
    })
  }

  //maneja la eliminacion de una publicacion del perfil
  protected onEliminar(publicacion: Publicacion): void {
    this.publicacionesService.eliminarPublicacion(publicacion._id).subscribe({
      next: () => {
        //remuevo la publicacion eliminada de la lista local
        this.publicaciones = this.publicaciones.filter((item) => item._id !== publicacion._id)
        //actualizo el total local de publicaciones evitando numeros negativos
        this.totalPublicaciones = this.totalPublicaciones > 0 ? this.totalPublicaciones - 1 : 0
        //actualizo el offset para que coincida con la cantidad actual en memoria
        this.offsetActual = this.publicaciones.length
        //ajusto la cantidad visible para no exceder el tamaño de la lista
        this.cantidadVisible = Math.min(this.cantidadVisible, this.publicaciones.length)
        //limpio el buffer de publicaciones precargadas ya que la lista cambio
        this.bufferPublicaciones = []
        //refresco la lista de publicaciones visibles
        this.actualizarUltimas()
        //informo al usuario que la publicacion fue eliminada
        mostrarSwal(
          'publicacion eliminada',
          'tu publicacion ya no aparece en el listado',
          'success'
        )
        //verifico si aun faltan publicaciones por traer desde el servidor
        const faltaEnServidor = this.offsetActual < this.totalPublicaciones
        //si faltan publicaciones y no estoy cargando pido una pagina mas
        if (faltaEnServidor && !this.cargandoPublicaciones) {
          this.cargarPublicacionesUsuario(false, false)
        }
      },
      error: () => {
        //si falla la eliminacion informo el problema al usuario
        mostrarSwal(
          'no pudimos eliminarla',
          'revisa tu conexion e intenta otra vez',
          'error'
        )
      }
    })
  }

  //carga los datos del perfil del usuario y luego sus publicaciones
  private cargarPerfil(): void {
    //marco que estoy cargando y limpio errores previos
    this.cargando = true
    this.mensajeError = ''

    this.perfilService.obtenerPerfil().subscribe({
      //si la llamada es exitosa guardo el perfil y cargo las publicaciones
      next: (respuesta) => {
        this.perfil = respuesta.usuario
        this.cargarPublicacionesUsuario(true, false)
      },
      //si falla la llamada muestro mensaje de error y detengo el estado de carga
      error: () => {
        this.cargando = false
        this.mensajeError = 'no pudimos cargar tu perfil en este momento'
        mostrarSwal('sin conexion', this.mensajeError, 'error')
      }
    })
  }

  //reset -> reinicia listas, expandVisible -> aumenta cantidadVisible en +3
  //carga publicaciones del usuario aplicando offset y limite para paginacion
  private cargarPublicacionesUsuario(reset: boolean = false, expandVisible: boolean = false): void {
    const usuarioId = this.usuarioActualId

    //si no hay usuario autenticado limpio datos y salgo
    if (usuarioId === '') {
      this.publicaciones = []
      this.ultimas = []
      this.totalPublicaciones = 0
      this.offsetActual = 0
      this.hayMas = false
      this.cargando = false
      this.cargandoPublicaciones = false
      this.cantidadVisible = this.limitePorCarga
      this.bufferPublicaciones = []
      this.precargando = false
      return
    }

    //si ya hay una carga de publicaciones en curso no disparo otra
    if (this.cargandoPublicaciones) {
      return
    }

    //si no es un reset y ya traje todas las publicaciones no vuelvo a pedir
    if (!reset && this.totalPublicaciones > 0 && this.offsetActual >= this.totalPublicaciones) {
      return
    }

    //si es un reset reinicio todo el estado relacionado a publicaciones
    if (reset) {
      this.publicaciones = []
      this.ultimas = []
      this.totalPublicaciones = 0
      this.offsetActual = 0
      this.hayMas = true
      this.mensajeError = ''
      this.cargando = true
      this.cantidadVisible = this.limitePorCarga
      this.bufferPublicaciones = []
      this.precargando = false
    }

    //marco que se esta realizando una carga de publicaciones
    this.cargandoPublicaciones = true

    //defino el offset a usar segun sea un reset o una carga incremental
    const offset = reset ? 0 : this.offsetActual

    this.publicacionesService
      .listarPublicaciones(offset, this.limitePorCarga, 'recientes', usuarioId)
      .subscribe({
        next: (respuesta) => {
          //obtengo las nuevas publicaciones o una lista vacia por defecto
          const nuevas = respuesta.publicaciones ?? []
          //si es reset reemplazo la lista, si no agrego al final
          this.publicaciones = reset ? nuevas : [...this.publicaciones, ...nuevas]

          //determino el total remoto si viene del backend, si no uso el largo local
          const totalRemoto =
            typeof respuesta.total === 'number'
              ? respuesta.total
              : this.publicaciones.length

          this.totalPublicaciones = totalRemoto
          //el offset pasa a ser la cantidad total de publicaciones en memoria
          this.offsetActual = this.publicaciones.length

          //total de referencia usado para decidir visibilidad y si hay mas
          const totalReferencia =
            this.totalPublicaciones > 0 ? this.totalPublicaciones : this.publicaciones.length

          //si es reset fijo la cantidad visible inicial
          if (reset) {
            this.cantidadVisible = Math.min(this.limitePorCarga, this.publicaciones.length)
          //si se pidio expandir visibles aumento el tope respetando total y largo local
          } else if (expandVisible) {
            const maxVisibles = Math.min(this.publicaciones.length, totalReferencia)
            const nuevoLimite = Math.min(
              this.cantidadVisible + this.limitePorCarga,
              maxVisibles
            )
            this.cantidadVisible = nuevoLimite
          //si no se expanden visibles solo ajusto el valor para no superar el largo
          } else {
            this.cantidadVisible = Math.min(this.cantidadVisible, this.publicaciones.length)
          }

          //actualizo la lista de publicaciones que realmente se muestran
          this.actualizarUltimas()
          //marco fin de la carga de publicaciones
          this.cargandoPublicaciones = false

          //si venia de un reset tambien termino el estado de carga general
          if (reset) {
            this.cargando = false
          }

          //si aun faltan publicaciones en el servidor inicio precarga de la siguiente pagina
          const faltaEnServidor = this.offsetActual < totalReferencia
          if (faltaEnServidor) {
            this.precargarSiguientePagina()
          }
        },
        error: () => {
          //si falla la carga de publicaciones marco que no se esta cargando
          this.cargandoPublicaciones = false
          //si era un reset muestro error general y detengo el estado de carga
          if (reset) {
            this.cargando = false
            this.mensajeError = 'no pudimos cargar tus publicaciones en este momento'
            mostrarSwal('sin conexion', this.mensajeError, 'error')
          //si era una carga incremental solo informo que no se pudieron traer mas
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

  //maneja el flujo al presionar el boton de cargar mas publicaciones
  protected cargarMasPublicaciones(): void {
    //si ya hay una carga en curso no hago nada
    if (this.cargandoPublicaciones) {
      return
    }

    //obtengo el total de publicaciones locales y el total de referencia
    const totalLocales = this.publicaciones.length
    const totalReferencia =
      this.totalPublicaciones > 0 ? this.totalPublicaciones : totalLocales

    //si aun hay publicaciones locales ocultas aumento la cantidad visible
    if (this.cantidadVisible < totalLocales) {
      const nuevoLimite = Math.min(
        this.cantidadVisible + this.limitePorCarga,
        totalLocales,
        totalReferencia
      )
      this.cantidadVisible = nuevoLimite
      this.actualizarUltimas()

      //si faltan publicaciones en el servidor intento precargar la siguiente pagina
      const faltaEnServidor = this.offsetActual < totalReferencia
      if (faltaEnServidor && !this.precargando && this.bufferPublicaciones.length === 0) {
        this.precargarSiguientePagina()
      }
      return
    }

    //si no hay mas locales ocultas pero el buffer tiene publicaciones las agrego
    if (this.bufferPublicaciones.length > 0) {
      this.publicaciones = [...this.publicaciones, ...this.bufferPublicaciones]
      this.offsetActual = this.publicaciones.length
      this.bufferPublicaciones = []

      const nuevoLimite = Math.min(
        this.cantidadVisible + this.limitePorCarga,
        this.publicaciones.length,
        totalReferencia
      )
      this.cantidadVisible = nuevoLimite
      this.actualizarUltimas()

      //si aun faltan en el servidor disparo una nueva precarga
      const faltaEnServidor = this.offsetActual < totalReferencia
      if (faltaEnServidor) {
        this.precargarSiguientePagina()
      }
      return
    }

    //si no hay mas locales ni en buffer reviso si todavia faltan en el servidor
    const faltaEnServidor = this.offsetActual < totalReferencia
    if (!faltaEnServidor) {
      return
    }

    //si faltan en el servidor pido una nueva pagina y aumento visibles
    this.cargarPublicacionesUsuario(false, true)
  }

  //reemplaza una publicacion en la lista local por su version actualizada
  private reemplazarPublicacion(actualizada: Publicacion): void {
    this.publicaciones = this.publicaciones.map((item) => {
      if (item._id === actualizada._id) {
        return actualizada
      }
      return item
    })
    //despues de reemplazar recalculo la lista de publicaciones visibles
    this.actualizarUltimas()
  }

  //actualiza la sublista de publicaciones visibles y si hay mas para mostrar
  private actualizarUltimas(): void {
    const lista = this.publicaciones

    //determino el total de referencia para visibilidad y flag de hayMas
    const totalReferencia =
      this.totalPublicaciones > 0 ? this.totalPublicaciones : lista.length

    //calculo cuantas publicaciones puedo mostrar respetando limites y lista
    const maxVisibles = Math.min(
      this.cantidadVisible,
      lista.length,
      totalReferencia
    )

    //tomo las primeras publicaciones segun el maximo visible
    this.ultimas = lista.slice(0, maxVisibles)
    //marco si todavia quedan publicaciones por mostrar mas adelante
    this.hayMas = maxVisibles < totalReferencia
  }

  //precarga la siguiente pagina de publicaciones para mejorar la experiencia
  private precargarSiguientePagina(): void {
    //si ya estoy precargando evito lanzar otra segunda llamada
    if (this.precargando) {
      return
    }

    const usuarioId = this.usuarioActualId

    //si no hay usuario autenticado no tiene sentido precargar
    if (usuarioId === '') {
      return
    }

    //si ya se alcanzo el total de publicaciones no pido mas
    if (this.totalPublicaciones > 0 && this.offsetActual >= this.totalPublicaciones) {
      return
    }

    //uso el offset actual como inicio de la siguiente pagina
    const offset = this.offsetActual
    this.precargando = true

    this.publicacionesService
      .listarPublicaciones(offset, this.limitePorCarga, 'recientes', usuarioId)
      .subscribe({
        next: (respuesta) => {
          //guardo la pagina precargada en el buffer para uso futuro
          const nuevas = respuesta.publicaciones ?? []
          this.bufferPublicaciones = nuevas

          //actualizo el total de publicaciones usando el dato remoto si existe
          const totalRemoto =
            typeof respuesta.total === 'number'
              ? respuesta.total
              : this.totalPublicaciones > 0
              ? this.totalPublicaciones
              : this.offsetActual + nuevas.length

          this.totalPublicaciones = totalRemoto
          this.precargando = false

          //si no vinieron nuevas publicaciones actualizo hayMas segun la referencia
          if (nuevas.length === 0) {
            const totalReferencia =
              this.totalPublicaciones > 0 ? this.totalPublicaciones : this.offsetActual
            this.hayMas = this.cantidadVisible < totalReferencia
          }
        },
        error: () => {
          //si falla la precarga limpio el buffer y libero el flag de precargando
          this.precargando = false
          this.bufferPublicaciones = []
        }
      })
  }

  //calcula la ruta al placeholder de imagen en base a la url del backend
  private calcularPlaceholder(): string {
    //elimino barra final de la base para evitar duplicados
    const base = this.baseUrl.replace(/\/$/, '')

    //si no hay base uso la ruta relativa por defecto
    if (base === '') {
      return '/images/placeholder.png'
    }

    //si hay base compongo la ruta absoluta al placeholder
    return `${base}/images/placeholder.png`
  }
}
