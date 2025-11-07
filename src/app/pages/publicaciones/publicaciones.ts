import { Component, OnInit, inject } from '@angular/core'
import { CommonModule, NgClass } from '@angular/common'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { PublicacionesService } from '../../services/publicaciones'
import { Publicacion } from '../../models/publicacion'
import { PublicacionCardComponent } from '../../components/publicacion-card/publicacion-card'
import { mostrarSwal } from '../../utils/swal'
import { environment } from '../../../environments/environment'
import { Auth } from '../../services/auth'

@Component({
  standalone: true,
  selector: 'app-publicaciones-page',
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.css',
  imports: [CommonModule, NgClass, ReactiveFormsModule, PublicacionCardComponent]
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

  //al iniciar el componente cargo las publicaciones por defecto
  ngOnInit(): void {
    //cargo la primera tanda de publicaciones cuando se monta el componente
    this.cargarPublicaciones(1)
  }

  //manejo del envio del formulario de nueva publicacion
  protected enviarFormulario(): void {
    //si ya estoy creando una publicacion evito enviar otra vez
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

    //me aseguro de castear a string para evitar valores no esperados
    const titulo = typeof tituloControl?.value === 'string' ? tituloControl.value : ''
    const descripcion =
      typeof descripcionControl?.value === 'string' ? descripcionControl.value : ''

    //activo el estado de creacion para deshabilitar acciones repetidas
    this.creando = true

    //envio la peticion al servicio para crear la publicacion nueva
    this.publicacionesService
      .crearPublicacion({
        titulo,
        descripcion,
        imagen: this.imagenSeleccionada,
      })
      .subscribe({
        next: () => {
          //programo la recarga de la primera pagina para reflejar la nueva publicacion
          this.programarRecarga(1)
          //desactivo el estado de creacion
          this.creando = false
          //reinicio el formulario y los datos de la imagen
          this.formulario.reset({ titulo: '', descripcion: '', imagen: null })
          this.imagenSeleccionada = null
          this.nombreImagen = ''
          //muestro un mensaje de exito con sweetalert
          mostrarSwal(
            'publicacion creada',
            'tu historia ya aparece en el listado',
            'success'
          )
        },
        error: () => {
          //en caso de error desactivo el estado de creacion
          this.creando = false
          //muestro un mensaje de error generico
          mostrarSwal(
            'no pudimos crearla',
            'revisa los datos e intenta nuevamente',
            'error'
          )
        },
      })
  }

  //actualizo el archivo seleccionado cuando el usuario carga una imagen nueva
  protected onArchivoSeleccionado(evento: Event): void {
    //obtengo el input desde el evento nativo
    const input = evento.target as HTMLInputElement
    //obtengo la lista de archivos seleccionados
    const archivos = input?.files ?? null
    //me quedo con el primer archivo si existe
    const archivo = archivos && archivos.item(0) ? archivos.item(0) : null
    //guardo el archivo seleccionado en la propiedad del componente
    this.imagenSeleccionada = archivo
    //guardo el nombre del archivo para mostrarlo en la interfaz
    this.nombreImagen = archivo ? archivo.name : ''
    //actualizo el control imagen del formulario
    this.formulario.patchValue({ imagen: archivo })
  }

  //verifico si un campo del formulario es invalido y fue tocado
  protected campoEsInvalido(nombre: 'titulo' | 'descripcion'): boolean {
    //busco el control por nombre
    const control = this.formulario.get(nombre)
    //veo si el usuario ya interactuo con el control
    const fueTocado = control?.touched || control?.dirty
    //verifico si el control no cumple las validaciones
    const esInvalido = control?.invalid
    //retorno true solo si esta invalido y el usuario ya lo toco
    return Boolean(esInvalido && fueTocado)
  }

  //cambio el tipo de orden y recargo las publicaciones desde el inicio
  protected cambiarOrden(nuevoOrden: 'recientes' | 'likes'): void {
    //si el nuevo orden es igual al actual no hago nada
    if (this.orden === nuevoOrden) {
      return
    }
    //actualizo el tipo de orden
    this.orden = nuevoOrden
    //recargo las publicaciones desde cero respetando el nuevo orden
    this.programarRecarga(1)
  }

  //manejo del evento al dar me gusta a una publicacion
  protected onDarLike(publicacion: Publicacion): void {
    //llamo al servicio para registrar el like de la publicacion
    this.publicacionesService.darLike(publicacion._id).subscribe({
      next: (actualizada) => {
        //reemplazo la publicacion actualizada en la lista
        this.reemplazarPublicacion(actualizada)
      },
      error: () => {
        //muestro mensaje de error si no se pudo registrar el like
        mostrarSwal(
          'no se pudo registrar el me gusta',
          'intentalo nuevamente en unos instantes',
          'error'
        )
      }
    })
  }

  //manejo del evento al quitar un me gusta
  protected onQuitarLike(publicacion: Publicacion): void {
    //llamo al servicio para quitar el like de la publicacion
    this.publicacionesService.quitarLike(publicacion._id).subscribe({
      next: (actualizada) => {
        //actualizo la lista con la publicacion modificada
        this.reemplazarPublicacion(actualizada)
      },
      error: () => {
        //muestro un mensaje de error si no pude quitar el like
        mostrarSwal(
          'no se pudo quitar el me gusta',
          'intentalo nuevamente en unos instantes',
          'error'
        )
      }
    })
  }

  //manejo del evento cuando se elimina una publicacion
  protected onEliminar(publicacion: Publicacion): void {
    //solicito al servicio eliminar la publicacion seleccionada
    this.publicacionesService.eliminarPublicacion(publicacion._id).subscribe({
      next: () => {
        //recargo la pagina actual para mantener la paginacion consistente
        this.programarRecarga(this.paginaActual)
        //muestro un mensaje de exito
        mostrarSwal(
          'publicacion eliminada',
          'tu publicacion ya no aparece en el listado',
          'success'
        )
      },
      error: () => {
        //muestro mensaje de error cuando no se pudo eliminar
        mostrarSwal(
          'no pudimos eliminarla',
          'revisa tu conexion e intenta otra vez',
          'error'
        )
      }
    })
  }

  //navego a una pagina especifica de la paginacion
  protected irAPagina(pagina: number): void {
    //normalizo la pagina recibida para evitar valores invalidos
    const paginaSolicitada = pagina < 1 ? 1 : pagina

    //determino la pagina destino considerando el total actual conocido
    const paginaDestino =
      this.totalPaginas > 0 && paginaSolicitada > this.totalPaginas
        ? this.totalPaginas
        : paginaSolicitada

    //si hay una peticion en curso programo la recarga y salgo
    if (this.cargando) {
      this.programarRecarga(paginaDestino)
      return
    }

    //si ya estoy en la pagina destino no hago nada
    if (this.paginaActual === paginaDestino) {
      return
    }

    this.cargarPublicaciones(paginaDestino)
  }

  //voy a la pagina anterior si existe
  protected paginaAnterior(): void {
    if (this.paginaActual <= 1) {
      return
    }
    this.irAPagina(this.paginaActual - 1)
  }

  //voy a la pagina siguiente si existe
  protected paginaSiguiente(): void {
    if (this.paginaActual >= this.totalPaginas) {
      return
    }
    this.irAPagina(this.paginaActual + 1)
  }

  //verifico si el boton de orden esta activo
  protected estaActivo(orden: 'recientes' | 'likes'): boolean {
    //comparo el orden recibido con el orden actual
    return this.orden === orden
  }

  //funcion privada para cargar publicaciones desde el backend segun la pagina
  private cargarPublicaciones(pagina: number): void {
    //si ya estoy cargando no hago otra peticion
    if (this.cargando) {
      return
    }

    //activo el estado de carga y limpio mensajes anteriores
    this.cargando = true
    this.mensajeError = ''

    //normalizo la pagina solicitada para evitar valores invalidos
    const paginaSegura = pagina < 1 ? 1 : pagina
    //actualizo la pagina actual para reflejar el pedido del usuario
    this.paginaActual = paginaSegura

    //calculo el desplazamiento usando la pagina segura
    const offset = (paginaSegura - 1) * this.limitePorPagina

    //solicito las publicaciones al servicio usando offset y limite
    this.publicacionesService
      .listarPublicaciones(
        offset,
        this.limitePorPagina,
        this.orden,
        null
      )
      .subscribe({
        next: (respuesta) => {
          //guardo las publicaciones recibidas para la pagina solicitada
          const nuevas = respuesta.publicaciones ?? []
          this.publicaciones = nuevas
          //actualizo el total informado por el backend
          this.total = respuesta.total

          //calculo la cantidad total de paginas
          const totalCalculado = Math.ceil(this.total / this.limitePorPagina)
          this.totalPaginas = totalCalculado > 0 ? totalCalculado : 1

          //determino la pagina valida final considerando el total actualizado
          const paginaValida =
            this.total === 0
              ? 1
              : paginaSegura > this.totalPaginas
              ? this.totalPaginas
              : paginaSegura
          this.paginaActual = paginaValida

          //actualizo la lista de paginas disponibles
          this.actualizarPaginasDisponibles()

          //desactivo el estado de carga
          this.cargando = false

          //si la pagina solicitada ya no existe recargo la ultima disponible
          const necesitaAjuste =
            this.total > 0 && paginaSegura > this.totalPaginas
          if (necesitaAjuste) {
            this.cargarPublicaciones(this.totalPaginas)
          } else {
            //hago scroll al inicio de la pagina despues de cambiar de pagina
            this.scrollAlInicio()
          }

          //intento ejecutar alguna recarga pendiente acumulada
          this.intentarRecargaPendiente()
        },
        error: () => {
          //desactivo el estado de carga si hubo error
          this.cargando = false
          //guardo un mensaje de error amigable
          this.mensajeError = 'no pudimos traer las publicaciones en este momento'
          //muestro mensaje de error con sweetalert
          mostrarSwal('sin conexion', this.mensajeError, 'error')

          //si habia una recarga pendiente vuelvo a intentarla
          this.intentarRecargaPendiente()
        }
      })
  }

  //programo una recarga para ejecutarla cuando no haya otra peticion en curso
  private programarRecarga(pagina: number): void {
    const paginaSegura = pagina < 1 ? 1 : pagina
    this.paginaPendiente = paginaSegura
    this.intentarRecargaPendiente()
  }

  //si no estoy cargando ejecuto la recarga pendiente programada
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

  //actualizo la lista auxiliar de paginas para mostrar en la vista
  private actualizarPaginasDisponibles(): void {
    const totalPaginas = this.totalPaginas
    this.paginasDisponibles = Array.from(
      { length: totalPaginas },
      (_, indice) => indice + 1
    )
  }

  //hago scroll suave al inicio de la pagina
  private scrollAlInicio(): void {
    if (typeof window === 'undefined') {
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  //reemplazo una publicacion existente por su version actualizada
  private reemplazarPublicacion(actualizada: Publicacion): void {
    //recorro las publicaciones y reemplazo solo la que coincide por id
    this.publicaciones = this.publicaciones.map((item) => {
      if (item._id === actualizada._id) {
        //si coincide el id retorno la version actualizada
        return actualizada
      }
      //si no coincide mantengo la publicacion original
      return item
    })
  }
}
