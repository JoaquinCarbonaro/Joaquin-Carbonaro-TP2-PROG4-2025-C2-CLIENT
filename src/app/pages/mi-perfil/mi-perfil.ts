import { Component, OnInit, OnDestroy, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { PerfilService } from '../../services/perfil'
import { Perfil } from '../../models/perfil'
import { Publicacion } from '../../models/publicacion'
import { mostrarSwal } from '../../utils/swal'
import { environment } from '../../../environments/environment'
import { PublicacionCardComponent } from '../../components/publicacion-card/publicacion-card'
import { PublicacionesService } from '../../services/publicaciones'
import { Auth } from '../../services/auth'
import { MENSAJE_FECHA_FUTURA, MENSAJE_MENOR_EDAD } from '../../utils/date-validators'
import { MENSAJE_IMAGEN_INVALIDA } from '../../utils/file-upload'
import {
  crearFormularioModalPerfil,
  prepararFormularioModalPerfil,
  restablecerFormularioModalPerfil,
  manejarCambioImagenModalPerfil,
  limpiarCamposTextoModalPerfil,
  obtenerMensajeErrorFechaModalPerfil,
  obtenerDatosActualizacionModalPerfil
} from '../../utils/perfil-modal'

@Component({
  standalone: true,
  selector: 'app-mi-perfil-page',
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.css',
  imports: [CommonModule, ReactiveFormsModule, PublicacionCardComponent]
})
export class MiPerfil implements OnInit, OnDestroy {

  //inyecto el servicio de perfil para obtener datos del usuario
  private readonly perfilService = inject(PerfilService)
  //inyecto el servicio de publicaciones para operar sobre publicaciones del usuario
  private readonly publicacionesService = inject(PublicacionesService)
  //inyecto el servicio de autenticacion para conocer el usuario actual
  private readonly authService = inject(Auth)
  //inyecto formbuilder para crear el formulario reactivo del modal
  private readonly fb = inject(FormBuilder)

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
  //indica si el modal de edicion esta visible
  protected mostrarModalEdicion = false
  //indica si se esta enviando la actualizacion del perfil
  protected editandoPerfil = false
  //nombre del archivo seleccionado para la imagen del perfil
  protected nombreArchivoSeleccionado = 'mantendras tu imagen actual'
  //vista previa local de la imagen seleccionada
  protected vistaPreviaImagen = ''
  //mensajes reutilizados en la plantilla para los errores de fecha
  protected readonly mensajeFechaFutura = MENSAJE_FECHA_FUTURA
  protected readonly mensajeMenorEdad = MENSAJE_MENOR_EDAD
  protected readonly mensajeImagenInvalida = MENSAJE_IMAGEN_INVALIDA

  //formulario reactivo utilizado dentro del modal para editar el perfil
  protected readonly perfilForm = crearFormularioModalPerfil(this.fb)

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

  //si el componente se destruye me aseguro de restaurar el estado del body
  ngOnDestroy(): void {
    this.actualizarClaseBodyModal(false)
  }

  //abre el modal de edicion precargando los datos actuales del perfil
  protected abrirModalEdicion(): void {
    //si todavia no tengo perfil aviso al usuario y corto el flujo
    if (!this.perfil) {
      mostrarSwal('perfil no disponible', 'intenta nuevamente mas tarde', 'error')
      return
    }

    //guardo una referencia al perfil actual para preparar el formulario
    const perfilActual = this.perfil
    //preparo el formulario del modal usando helpers reutilizables
    const estadoModal = prepararFormularioModalPerfil(
      this.perfilForm,
      perfilActual,
      (fecha) => this.formatearFechaParaInput(fecha ?? ''),
      (ruta) => this.resolverImagen(ruta)
    )

    //actualizo la vista previa de la imagen y el nombre del archivo mostrado
    this.vistaPreviaImagen = estadoModal.vistaPrevia
    this.nombreArchivoSeleccionado = estadoModal.nombreArchivo

    //muestro el modal y bloqueo el scroll del fondo
    this.mostrarModalEdicion = true
    this.actualizarClaseBodyModal(true)
  }

  //cierra el modal de edicion y limpia el formulario
  protected cerrarModalEdicion(): void {
    //oculto el modal y marco que ya no estoy editando
    this.mostrarModalEdicion = false
    this.editandoPerfil = false
    //restauro el formulario a su estado inicial
    restablecerFormularioModalPerfil(this.perfilForm)
    //restablezco el nombre del archivo y la vista previa
    this.nombreArchivoSeleccionado = 'mantendras tu imagen actual'
    this.vistaPreviaImagen = ''
    //restauro el scroll del fondo quitando la clase del body
    this.actualizarClaseBodyModal(false)
  }

  //maneja el cambio de archivo en el input de imagen del modal
  protected onImagenPerfilChange(evento: Event): void {
    //delego la logica de manejo de imagen al helper reutilizable
    const resultado = manejarCambioImagenModalPerfil(
      evento,
      this.perfilForm,
      this.perfil,
      (ruta) => this.resolverImagen(ruta),
      (valor) => {
        //actualizo la vista previa de la imagen cuando el helper lo indica
        this.vistaPreviaImagen = valor
      }
    )

    //actualizo el nombre del archivo que muestro en la interfaz
    this.nombreArchivoSeleccionado = resultado.nombreArchivo

    //si el helper indica error aviso al usuario con un swal
    if (resultado.error) {
      mostrarSwal('formato no soportado', this.mensajeImagenInvalida, 'warning')
    }
  }

  //envia los cambios del formulario al backend
  protected guardarCambiosPerfil(): void {
    //si ya estoy enviando una actualizacion evito duplicar la llamada
    if (this.editandoPerfil) {
      return
    }

    //defino que campos de texto quiero limpiar antes de validar
    const camposTexto = ['nombre', 'apellido', 'email', 'userName', 'descripcion']
    //normalizo espacios en los campos de texto usando el helper
    limpiarCamposTextoModalPerfil(this.perfilForm, camposTexto)
    //fuerzo recalculo de validaciones sin disparar eventos
    this.perfilForm.updateValueAndValidity({ emitEvent: false })

    //si el formulario no es valido marco todo como tocado y aviso
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched()
      //intento obtener un mensaje especifico relacionado con la fecha
      const mensajeFecha = obtenerMensajeErrorFechaModalPerfil(this.perfilForm, {
        futuro: this.mensajeFechaFutura,
        menorEdad: this.mensajeMenorEdad
      })
      //si tengo mensaje de fecha lo muestro con swal informativo
      if (mensajeFecha) {
        mostrarSwal(mensajeFecha.titulo, mensajeFecha.detalle, 'info')
      } else {
        //si no hay mensaje especifico aviso que revise el formulario en general
        mostrarSwal('revisa el formulario', 'hay datos pendientes de corregir', 'info')
      }
      return
    }

    //marco que estoy enviando la actualizacion al backend
    this.editandoPerfil = true

    //armo el payload de actualizacion usando el helper centralizado
    this.perfilService
      .actualizarPerfil(obtenerDatosActualizacionModalPerfil(this.perfilForm))
      .subscribe({
        next: (perfilActualizado) => {
          //actualizo el perfil en memoria con la respuesta del backend
          this.perfil = perfilActualizado
          //desmarco el estado de edicion y cierro el modal
          this.editandoPerfil = false
          this.mostrarModalEdicion = false
          //restauro el formulario para futuras ediciones
          restablecerFormularioModalPerfil(this.perfilForm)
          //reseteo el texto del archivo mostrado
          this.nombreArchivoSeleccionado = 'mantendras tu imagen actual'
          //actualizo la vista previa con la nueva imagen del perfil
          this.vistaPreviaImagen = this.resolverImagen(perfilActualizado.imagenPerfil)
          //restauro el scroll del body
          this.actualizarClaseBodyModal(false)
          //informo al usuario que el perfil se actualizo correctamente
          mostrarSwal('perfil actualizado', 'tus cambios se guardaron correctamente', 'success')
        },
        error: (error) => {
          //si algo falla libero el flag de edicion
          this.editandoPerfil = false
          //intento obtener el mensaje del backend o uso uno generico
          const mensaje = error?.error?.message ?? 'no pudimos actualizar tu perfil'
          const detalle = Array.isArray(mensaje) ? mensaje.join(', ') : String(mensaje)
          //muestro el mensaje de error al usuario
          mostrarSwal('sin cambios', detalle, 'error')
        }
      })
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
        this.totalPublicaciones = this.totalPubliciciones > 0 ? this.totalPublicaciones - 1 : 0
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
        //actualizo la vista previa con la imagen actual del perfil
        this.vistaPreviaImagen = this.resolverImagen(this.perfil.imagenPerfil)
        //despues de tener el perfil inicio la carga de publicaciones
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

  //formatea una fecha para que sea compatible con inputs tipo date
  private formatearFechaParaInput(fecha: Date | string | null | undefined): string {
    //si no viene fecha devuelvo cadena vacia
    if (!fecha) {
      return ''
    }

    //si viene como string desde el backend
    if (typeof fecha === 'string') {
      const trimmed = fecha.trim()

      //si ya esta en formato YYYY-MM-DD la uso tal cual
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed
      }

      //si llega en otro formato ISO, intento convertir una sola vez
      const posible = new Date(trimmed)
      if (!Number.isNaN(posible.getTime())) {
        const y = posible.getFullYear()
        const m = `${posible.getMonth() + 1}`.padStart(2, '0')
        const d = `${posible.getDate()}`.padStart(2, '0')
        return `${y}-${m}-${d}`
      }

      //si no puedo interpretarlo devuelvo vacio
      return ''
    }

    //si viene como Date
    const valorFecha = fecha
    //si la fecha no es valida devuelvo vacio
    if (!valorFecha || Number.isNaN(valorFecha.getTime())) {
      return ''
    }
    //armo el formato YYYY-MM-DD a partir del objeto Date
    const year = valorFecha.getFullYear()
    const month = `${valorFecha.getMonth() + 1}`.padStart(2, '0')
    const day = `${valorFecha.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
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
      //despues de cambiar el limite actualizo la lista visible
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
      //extiendo la lista local con lo que habia precargado
      this.publicaciones = [...this.publicaciones, ...this.bufferPublicaciones]
      //actualizo el offset para reflejar la nueva cantidad
      this.offsetActual = this.publicaciones.length
      //limpio el buffer ya consumido
      this.bufferPublicaciones = []

      //calculo el nuevo limite respetando listado y total de referencia
      const nuevoLimite = Math.min(
        this.cantidadVisible + this.limitePorCarga,
        this.publicaciones.length,
        totalReferencia
      )
      this.cantidadVisible = nuevoLimite
      //refresco la lista visible con las publicaciones actualizadas
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
    //recorro la lista y cuando encuentro el id coincidente uso la version nueva
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

  //agrega o quita la clase en el body para bloquear el scroll del fondo
  private actualizarClaseBodyModal(activo: boolean): void {
    //valido que document exista por si se ejecuta del lado del servidor
    if (typeof document === 'undefined') {
      return
    }
    const body = document.body
    //si no hay body corto la ejecucion
    if (!body) {
      return
    }
    //segun el flag agrego o quito la clase de modal abierto
    if (activo) {
      body.classList.add('modal-abierto')
    } else {
      body.classList.remove('modal-abierto')
    }
  }

  //devuelve la fecha en texto: "8 de agosto de 2005" a partir de "2005-08-08" o Date
  protected formatearFechaNacimientoTexto(fecha: string | Date | null | undefined): string {
    //si no hay fecha devuelvo cadena vacia
    if (!fecha) {
      return ''
    }

    let year: number
    let month: number
    let day: number

    //si viene como objeto Date
    if (fecha instanceof Date) {
      year = fecha.getFullYear()
      month = fecha.getMonth() + 1
      day = fecha.getDate()
    }
    //si viene como string "YYYY-MM-DD"
    else if (typeof fecha === 'string') {
      const trimmed = fecha.trim()
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)

      //si no coincide con el formato esperado, devuelvo el texto tal cual
      if (!match) {
        return trimmed
      }

      year = Number(match[1])
      month = Number(match[2])
      day = Number(match[3])
    }
    //si no es ni string ni Date
    else {
      return ''
    }

    const nombresMes = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre'
    ]

    //valido rango basico de mes
    if (month < 1 || month > 12) {
      return `${day}/${month}/${year}`
    }

    const nombreMes = nombresMes[month - 1]
    return `${day} de ${nombreMes} de ${year}`
  }

}
