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
  //offset actual usado para la paginacion basada en offset
  protected offsetActual = 0
  //limite de publicaciones por pagina
  protected readonly limitePorPagina = 4
  //cantidad total de publicaciones en el sistema
  protected total = 0
  //indica si todavia hay mas publicaciones para cargar
  protected hayMas = true
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

  //al iniciar el componente cargo las publicaciones por defecto
  ngOnInit(): void {
    //cargo la primera tanda de publicaciones cuando se monta el componente
    this.cargarPublicaciones(true)
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
        next: (publicacionNueva) => {
          //inserto la publicacion nueva al inicio de la lista actual
          this.publicaciones = [publicacionNueva, ...this.publicaciones]
          //actualizo el total de publicaciones
          this.total = this.total + 1
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
    this.cargarPublicaciones(true)
  }

  //cargo la siguiente pagina de publicaciones si hay mas disponibles
  protected cargarMas(): void {
    //si no hay mas publicaciones o estoy cargando salgo
    if (!this.hayMas || this.cargando) {
      return
    }
    //pido la siguiente tanda de publicaciones
    this.cargarPublicaciones()
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
        //elimino la publicacion del array actual
        this.publicaciones = this.publicaciones.filter(
          (item) => item._id !== publicacion._id
        )
        //actualizo el total asegurando que no baje de cero
        this.total = this.total > 0 ? this.total - 1 : 0
        //muestro un mensaje de exito
        mostrarSwal(
          'publicacion eliminada',
          'tu publicacion ya no aparece en el listado',
          'success'
        )
        //si no quedan publicaciones pero hay mas, cargo la siguiente pagina
        if (this.publicaciones.length === 0 && this.hayMas) {
          this.cargarPublicaciones()
        }
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

  //verifico si el boton de orden esta activo
  protected estaActivo(orden: 'recientes' | 'likes'): boolean {
    //comparo el orden recibido con el orden actual
    return this.orden === orden
  }

  //funcion privada para cargar publicaciones desde el backend
  private cargarPublicaciones(reset: boolean = false): void {
    //si ya estoy cargando no hago otra peticion
    if (this.cargando) {
      return
    }

    //si el parametro reset es true, reinicio los valores
    if (reset) {
      //borro las publicaciones actuales
      this.publicaciones = []
      //reinicio el offset al inicio
      this.offsetActual = 0
      //reinicio el total
      this.total = 0
      //marco que otra vez hay mas publicaciones para traer
      this.hayMas = true
    }

    //activo el estado de carga
    this.cargando = true
    //limpio mensajes de error anteriores
    this.mensajeError = ''
    //guardo el offset actual en una constante local
    const offset = this.offsetActual

    //solicito las publicaciones al servicio
    this.publicacionesService
      .listarPublicaciones(
        offset,
        this.limitePorPagina,
        this.orden,
        null //ya no filtramos por autor, siempre traemos todas
      )
      .subscribe({
        next: (respuesta) => {
          //guardo las publicaciones nuevas y actualizo datos de paginacion
          const nuevas = respuesta.publicaciones ?? []
          //concateno las publicaciones anteriores con las nuevas
          this.publicaciones = [...this.publicaciones, ...nuevas]
          //actualizo el total recibido desde el backend
          this.total = respuesta.total
          //marco si todavia hay mas publicaciones para cargar
          this.hayMas = respuesta.hasMore
          //actualizo el offset usando la cantidad actual en memoria
          this.offsetActual = this.publicaciones.length
          //desactivo el estado de carga
          this.cargando = false
          //si no hay publicaciones marco que no hay mas para cargar
          if (this.publicaciones.length === 0) {
            this.hayMas = false
          }
        },
        error: () => {
          //desactivo el estado de carga si hubo error
          this.cargando = false
          //guardo un mensaje de error amigable
          this.mensajeError = 'no pudimos traer las publicaciones en este momento'
          //muestro mensaje de error con sweetalert
          mostrarSwal('sin conexion', this.mensajeError, 'error')
        }
      })
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
