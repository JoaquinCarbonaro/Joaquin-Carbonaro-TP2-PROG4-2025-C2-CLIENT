import { Component, OnInit, inject } from '@angular/core'
import { CommonModule, NgClass } from '@angular/common'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { PublicacionesService } from '../../services/publicaciones'
import { Publicacion } from '../../models/publicacion'
import { PublicacionCardComponent } from '../../components/publicacion-card/publicacion-card'
import { mostrarSwal } from '../../utils/swal'
import { environment } from '../../../environments/environment'
import { Auth } from '../../services/auth'
import { RouterLink } from '@angular/router'

@Component({
  standalone: true,
  selector: 'app-publicaciones-page',
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.css',
  imports: [CommonModule, NgClass, ReactiveFormsModule, PublicacionCardComponent, RouterLink]
})
export class Publicaciones implements OnInit {

  //inyecto el servicio de publicaciones para interactuar con el backend
  private readonly publicacionesService = inject(PublicacionesService)
  //inyecto el servicio de autenticacion para obtener el usuario actual
  private readonly authService = inject(Auth)
  //inyecto el formbuilder para crear el formulario reactivo
  private readonly formBuilder = inject(FormBuilder)

  //lista de publicaciones cargadas actualmente
  protected publicaciones: Publicacion[] = []
  //limite de publicaciones por pagina
  protected readonly limitePorPagina = 4
  //cantidad total de publicaciones en el sistema
  protected total = 0
  //numero actual de pagina que se esta mostrando
  protected paginaActual = 1
  //cantidad total de paginas disponibles segun el total del backend
  protected totalPaginas = 1
  //lista auxiliar con los numeros de pagina para pintar la paginacion
  protected paginasDisponibles: number[] = []
  //estado de carga (true mientras se hace la peticion)
  protected cargando = false
  //tipo de orden seleccionado (recientes o por likes)
  protected orden: 'recientes' | 'likes' = 'recientes'
  //mensaje de error si ocurre un problema con la peticion
  protected mensajeError = ''
  //url base del backend para construir rutas de imagenes
  protected readonly baseUrl = environment.apiBaseUrl
  //uuid del usuario actual obtenido del servicio de autenticacion
  protected readonly usuarioActualId = this.authService.obtenerIdUsuario()
  //formulario reactivo para crear nuevas publicaciones
  protected readonly formulario = this.formBuilder.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
    imagen: [null as File | null],
  })
  //archivo seleccionado para la nueva publicacion
  protected imagenSeleccionada: File | null = null
  //nombre del archivo seleccionado para mostrarlo al usuario
  protected nombreImagen = ''
  //indica si se esta enviando el formulario de creacion
  protected creando = false
  //almaceno una pagina pendiente para recargar cuando finalice la peticion actual
  private paginaPendiente: number | null = null
  //cache local de publicaciones por pagina para evitar parpadeos
  private cachePaginas = new Map<number, Publicacion[]>()
  //lista de paginas que se estan precargando en segundo plano
  private paginasEnPrefetch = new Set<number>()

  //al iniciar el componente cargo las publicaciones por defecto
  ngOnInit(): void {
    //cargo la primera tanda de publicaciones cuando se monta el componente
    this.cargarPublicaciones(1)
  }

  //manejo del envio del formulario de nueva publicacion
  protected enviarFormulario(): void {
    //si ya se esta creando una publicacion evito enviar nuevamente
    if (this.creando) {
      return
    }

    //si el formulario no es valido marco todos los campos y no envio
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched()
      return
    }

    //obtengo los controles de titulo y descripcion
    const tituloControl = this.formulario.get('titulo')
    const descripcionControl = this.formulario.get('descripcion')

    //me aseguro de que los valores sean strings antes de usarlos
    const titulo = typeof tituloControl?.value === 'string' ? tituloControl.value : ''
    const descripcion =
      typeof descripcionControl?.value === 'string' ? descripcionControl.value : ''

    //marco que se esta creando una publicacion
    this.creando = true

    //invoco al servicio para crear la nueva publicacion
    this.publicacionesService
      .crearPublicacion({
        titulo,
        descripcion,
        imagen: this.imagenSeleccionada,
      })
      .subscribe({
        next: () => {
          //si se crea correctamente limpio la cache y programo recarga de la pagina 1
          this.limpiarCache()
          this.programarRecarga(1)

          //restauro el estado del formulario y flags de creacion
          this.creando = false
          this.formulario.reset({ titulo: '', descripcion: '', imagen: null })
          this.imagenSeleccionada = null
          this.nombreImagen = ''

          //informo al usuario que la publicacion fue creada
          mostrarSwal(
            'publicacion creada',
            'tu historia ya aparece en el listado',
            'success'
          )
        },
        error: () => {
          //si falla la creacion desmarco el flag y muestro un mensaje
          this.creando = false
          mostrarSwal(
            'no pudimos crearla',
            'revisa los datos e intenta nuevamente',
            'error'
          )
        },
      })
  }

  //maneja el cambio de archivo cuando el usuario selecciona una imagen
  protected onArchivoSeleccionado(evento: Event): void {
    const input = evento.target as HTMLInputElement
    const archivos = input?.files ?? null
    const archivo = archivos && archivos.item(0) ? archivos.item(0) : null
    //guardo la referencia al archivo seleccionado y su nombre
    this.imagenSeleccionada = archivo
    this.nombreImagen = archivo ? archivo.name : ''
    //actualizo el control del formulario asociado a la imagen
    this.formulario.patchValue({ imagen: archivo })
  }

  //indica si un campo del formulario es invalido y ya fue tocado o modificado
  protected campoEsInvalido(nombre: 'titulo' | 'descripcion'): boolean {
    const control = this.formulario.get(nombre)
    const fueTocado = control?.touched || control?.dirty
    const esInvalido = control?.invalid
    return Boolean(esInvalido && fueTocado)
  }

  //cambia el tipo de orden de las publicaciones y recarga desde la pagina 1
  protected cambiarOrden(nuevoOrden: 'recientes' | 'likes'): void {
    //si el orden ya es el mismo no hago nada
    if (this.orden === nuevoOrden) {
      return
    }
    //actualizo el orden, limpio cache y programo recarga de la primera pagina
    this.orden = nuevoOrden
    this.limpiarCache()
    this.programarRecarga(1)
  }

  //maneja el evento de dar like sobre una publicacion del listado
  protected onDarLike(publicacion: Publicacion): void {
    this.publicacionesService.darLike(publicacion._id).subscribe({
      next: (actualizada) => {
        //reemplazo la publicacion actualizada en la lista y cache
        this.reemplazarPublicacion(actualizada)
      },
      error: () => {
        //si falla muestro un mensaje al usuario
        mostrarSwal(
          'no se pudo registrar el me gusta',
          'intentalo nuevamente en unos instantes',
          'error'
        )
      }
    })
  }

  //maneja el evento de quitar like sobre una publicacion del listado
  protected onQuitarLike(publicacion: Publicacion): void {
    this.publicacionesService.quitarLike(publicacion._id).subscribe({
      next: (actualizada) => {
        //reemplazo la publicacion actualizada en la lista y cache
        this.reemplazarPublicacion(actualizada)
      },
      error: () => {
        //si falla muestro un mensaje al usuario
        mostrarSwal(
          'no se pudo quitar el me gusta',
          'intentalo nuevamente en unos instantes',
          'error'
        )
      }
    })
  }

  //maneja la eliminacion de una publicacion desde la vista de publicaciones
  protected onEliminar(publicacion: Publicacion): void {
    this.publicacionesService.eliminarPublicacion(publicacion._id).subscribe({
      next: () => {
        //al eliminar limpio cache y recargo la pagina actual
        this.limpiarCache()
        this.programarRecarga(this.paginaActual)
        mostrarSwal(
          'publicacion eliminada',
          'tu publicacion ya no aparece en el listado',
          'success'
        )
      },
      error: () => {
        //si no se puede eliminar informo al usuario
        mostrarSwal(
          'no pudimos eliminarla',
          'revisa tu conexion e intenta otra vez',
          'error'
        )
      }
    })
  }

  //navega a la pagina indicada respetando limites y estado de carga
  protected irAPagina(pagina: number): void {
    //normalizo la pagina para que nunca sea menor a 1
    const paginaSolicitada = pagina < 1 ? 1 : pagina

    //si hay totalPaginas valido limito la pagina al maximo disponible
    const paginaDestino =
      this.totalPaginas > 0 && paginaSolicitada > this.totalPaginas
        ? this.totalPaginas
        : paginaSolicitada

    //si hay una carga en curso programo la recarga pendiente y salgo
    if (this.cargando) {
      this.programarRecarga(paginaDestino)
      return
    }

    //si ya estoy en la pagina de destino no hago nada
    if (this.paginaActual === paginaDestino) {
      return
    }

    //cargo las publicaciones de la pagina solicitada
    this.cargarPublicaciones(paginaDestino)
  }

  //navega a la pagina anterior si existe
  protected paginaAnterior(): void {
    if (this.paginaActual <= 1) {
      return
    }
    this.irAPagina(this.paginaActual - 1)
  }

  //navega a la pagina siguiente si no se supero el maximo
  protected paginaSiguiente(): void {
    if (this.paginaActual >= this.totalPaginas) {
      return
    }
    this.irAPagina(this.paginaActual + 1)
  }

  //indica si un tipo de orden esta actualmente activo
  protected estaActivo(orden: 'recientes' | 'likes'): boolean {
    return this.orden === orden
  }

  //carga publicaciones desde el backend aplicando paginacion y cache local
  private cargarPublicaciones(pagina: number): void {
    //si ya hay una carga en curso evito lanzar otra
    if (this.cargando) {
      return
    }

    //normalizo la pagina para que sea al menos 1
    const paginaSegura = pagina < 1 ? 1 : pagina
    this.paginaActual = paginaSegura
    this.mensajeError = ''

    //si la pagina ya esta en cache la uso directamente sin pedir al backend
    const paginaCacheada = this.cachePaginas.get(paginaSegura)

    if (paginaCacheada) {
      this.publicaciones = paginaCacheada
      this.cargando = false
      this.actualizarPaginasDisponibles()
      this.scrollAlInicio()
      //si hay mas paginas disponibles intento precargar la siguiente
      if (this.totalPaginas > paginaSegura) {
        this.prefetchPagina(paginaSegura + 1)
      }
      return
    }

    //marco que empezo una carga de publicaciones
    this.cargando = true

    //calculo el offset para la pagina solicitada
    const offset = (paginaSegura - 1) * this.limitePorPagina

    //solicito las publicaciones al backend segun offset, limite y orden
    this.publicacionesService
      .listarPublicaciones(
        offset,
        this.limitePorPagina,
        this.orden,
        null
      )
      .subscribe({
        next: (respuesta) => {
          //guardo las publicaciones recibidas y las cacheo por pagina
          const nuevas = respuesta.publicaciones ?? []
          this.publicaciones = nuevas
          this.cachePaginas.set(paginaSegura, nuevas)

          //actualizo el total segun el valor remoto
          this.total = respuesta.total

          //calculo la cantidad total de paginas segun el total y el limite
          const totalCalculado = Math.ceil(this.total / this.limitePorPagina)
          this.totalPaginas = totalCalculado > 0 ? totalCalculado : 1

          //valido que la pagina actual no supere el total de paginas disponibles
          const paginaValida =
            this.total === 0
              ? 1
              : paginaSegura > this.totalPaginas
              ? this.totalPaginas
              : paginaSegura
          this.paginaActual = paginaValida

          //si la pagina segura cambio ajusto la entrada en la cache
          if (paginaValida !== paginaSegura) {
            this.cachePaginas.delete(paginaSegura)
            this.cachePaginas.set(paginaValida, nuevas)
          }

          //refresco la lista de paginas para la paginacion visual
          this.actualizarPaginasDisponibles()
          this.cargando = false

          //si la pagina solicitada quedo fuera de rango ajusto la carga
          const necesitaAjuste =
            this.total > 0 && paginaSegura > this.totalPaginas
          if (necesitaAjuste) {
            this.cargarPublicaciones(this.totalPaginas)
          } else {
            this.scrollAlInicio()
          }

          //si el backend indica que hay mas resultados intento precargar la siguiente pagina
          if (respuesta.hasMore) {
            this.prefetchPagina(this.paginaActual + 1)
          }

          //si habia una pagina pendiente intento recargarla ahora
          this.intentarRecargaPendiente()
        },
        error: () => {
          //si falla la carga marco fin de la carga y muestro error
          this.cargando = false
          this.mensajeError = 'no pudimos traer las publicaciones en este momento'
          mostrarSwal('sin conexion', this.mensajeError, 'error')
          //intento procesar alguna recarga pendiente si existe
          this.intentarRecargaPendiente()
        }
      })
  }

  //guarda la pagina a recargar cuando termine la peticion actual
  private programarRecarga(pagina: number): void {
    const paginaSegura = pagina < 1 ? 1 : pagina
    this.paginaPendiente = paginaSegura
    this.intentarRecargaPendiente()
  }

  //si hay una pagina pendiente y no se esta cargando nada la recarga
  private intentarRecargaPendiente(): void {
    if (this.paginaPendiente === null) {
      return
    }

    if (this.cargando) {
      return
    }

    const pagina = this.paginaPendiente
    this.paginaPendiente = null
    this.cargarPublicaciones(pagina)
  }

  //actualiza el arreglo de paginas disponibles para el componente de paginacion
  private actualizarPaginasDisponibles(): void {
    const totalPaginas = this.totalPaginas
    this.paginasDisponibles = Array.from(
      { length: totalPaginas },
      (_, indice) => indice + 1
    )
  }

  //realiza un scroll suave hacia el inicio de la pagina
  private scrollAlInicio(): void {
    //si window no esta disponible (por ejemplo en renderizado del lado del servidor) no hago nada
    if (typeof window === 'undefined') {
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  //limpia la cache de paginas y el listado de paginas en prefetch
  private limpiarCache(): void {
    this.cachePaginas.clear()
    this.paginasEnPrefetch.clear()
  }

  //precarga una pagina de publicaciones en segundo plano para mejorar la experiencia
  private prefetchPagina(pagina: number): void {
    //si la pagina es invalida no hago nada
    if (pagina <= 0) {
      return
    }

    //si la pagina ya esta en cache no necesito precargar
    if (this.cachePaginas.has(pagina)) {
      return
    }

    //si la pagina ya esta siendo precargada no repito la llamada
    if (this.paginasEnPrefetch.has(pagina)) {
      return
    }

    //si la pagina supera el total de paginas no la precargo
    if (pagina > this.totalPaginas) {
      return
    }

    //calculo el offset de la pagina a precargar
    const offset = (pagina - 1) * this.limitePorPagina
    //guardo el orden actual para validar coherencia de respuesta
    const ordenSolicitado = this.orden
    this.paginasEnPrefetch.add(pagina)

    this.publicacionesService
      .listarPublicaciones(offset, this.limitePorPagina, ordenSolicitado, null)
      .subscribe({
        next: (respuesta) => {
          //si el orden cambio mientras tanto descarto el resultado
          if (this.orden !== ordenSolicitado) {
            this.paginasEnPrefetch.delete(pagina)
            return
          }

          //guardo las publicaciones precargadas en la cache
          const nuevas = respuesta.publicaciones ?? []
          this.cachePaginas.set(pagina, nuevas)

          //actualizo el total segun el dato remoto si esta disponible
          const totalRemoto =
            typeof respuesta.total === 'number' ? respuesta.total : this.total
          this.total = totalRemoto
          const totalCalculado = Math.ceil(this.total / this.limitePorPagina)
          this.totalPaginas = totalCalculado > 0 ? totalCalculado : 1
          this.actualizarPaginasDisponibles()

          //marco que termine de precargar esa pagina
          this.paginasEnPrefetch.delete(pagina)
        },
        error: () => {
          //si falla la precarga solo libero el flag de esa pagina
          this.paginasEnPrefetch.delete(pagina)
        }
      })
  }

  //reemplaza una publicacion por su version actualizada en la lista y en la cache
  private reemplazarPublicacion(actualizada: Publicacion): void {
    //actualizo la lista visible actual
    this.publicaciones = this.publicaciones.map((item) => {
      if (item._id === actualizada._id) {
        return actualizada
      }
      return item
    })

    //recorro todas las paginas cacheadas y actualizo la publicacion en cada una
    this.cachePaginas.forEach((lista, numero) => {
      const listaActualizada = lista.map((item) => {
        if (item._id === actualizada._id) {
          return actualizada
        }
        return item
      })
      this.cachePaginas.set(numero, listaActualizada)
    })
  }
}
