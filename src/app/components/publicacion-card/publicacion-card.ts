import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject
} from '@angular/core'
import { CommonModule, DatePipe, NgClass } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { Publicacion } from '../../models/publicacion'
import { Comentario } from '../../models/comentario'
import { PublicacionesService } from '../../services/publicaciones'
import { mostrarSwal } from '../../utils/swal'

@Component({
  selector: 'app-publicacion-card',
  standalone: true,
  templateUrl: './publicacion-card.html',
  styleUrl: './publicacion-card.css',
  imports: [CommonModule, DatePipe, NgClass, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicacionCardComponent implements OnChanges {
  //recibo la publicacion que se va a mostrar en la tarjeta
  @Input({ required: true }) publicacion!: Publicacion

  //uuid del usuario actualmente logueado (necesario para verificar likes o autoria)
  @Input() usuarioActualId = ''

  //url base del backend para armar rutas absolutas de imagenes
  @Input() baseUrl = ''

  //indica si la tarjeta se muestra en la pagina de detalle
  @Input() modoDetalle = false

  //evento que se emite cuando el usuario da me gusta
  @Output() like = new EventEmitter<Publicacion>()

  //evento que se emite cuando el usuario quita el me gusta
  @Output() unlike = new EventEmitter<Publicacion>()

  //evento que se emite cuando el usuario elimina su publicacion
  @Output() eliminar = new EventEmitter<Publicacion>()

  //url calculada del avatar del autor
  protected avatarUrl = ''
  //url calculada de la imagen principal de la publicacion
  protected imagenUrl = ''
  //indica si el avatar ya se cargo y puede mostrarse
  protected avatarCargado = false
  //indica si la imagen principal ya se cargo y puede mostrarse
  protected imagenCargada = false
  //ruta local al placeholder por si la imagen no existe
  private placeholderUrl = ''

  //listado local de comentarios cuando estoy en modo detalle
  protected comentarios: Comentario[] = []
  //estado de carga de comentarios
  protected cargandoComentarios = false
  //indica si hay mas comentarios disponibles en backend
  protected hayMasComentarios = true
  //cantidad de comentarios a pedir por pagina
  protected readonly comentariosPorPagina = 3
  //pagina actual de comentarios en modo detalle
  protected paginaActual = 0
  //total de comentarios de la publicacion
  protected totalComentarios = 0
  //contenido del nuevo comentario a crear
  protected nuevoComentario = ''
  //estado de envio de nuevo comentario
  protected enviandoComentario = false
  //id del comentario que se esta editando
  protected comentarioEditandoId: string | null = null
  //texto temporal del comentario en edicion
  protected comentarioEditandoTexto = ''
  //estado de guardado de edicion
  protected guardandoEdicion = false
  //total de comentarios disponibles cuando se usa la vista compacta
  protected totalComentariosCompactos = 0
  //indica si quedan comentarios para mostrar en la vista compacta
  protected hayMasComentariosCompactos = false
  //indica si estoy cargando comentarios cuando la tarjeta es compacta
  protected cargandoComentariosCompactos = false
  //bandera interna para saber si ya inicialice comentarios en modo detalle
  private comentariosInicializados = false
  //id de la ultima publicacion usada para comentarios detalle
  private ultimaPublicacionId = ''
  //listado completo de comentarios usado en la vista compacta
  private comentariosCompactos: Comentario[] = []
  //cantidad de comentarios visibles actualmente en la vista compacta
  private comentariosVisibles = 0
  //marca si ya cargue los comentarios compactos de la publicacion actual
  private comentariosCompactosCargados = false
  //guarda el id de la publicacion asociada a los comentarios compactos
  private ultimaPublicacionCompactaId = ''

  //inyecto el servicio de publicaciones para gestionar likes y comentarios
  private readonly publicacionesService = inject(PublicacionesService)
  //inyecto change detector para actualizar la vista luego de operaciones asincronas
  private readonly cdr = inject(ChangeDetectorRef)
  //inyecto el router para navegar al detalle cuando estoy en modo listado
  private readonly router = inject(Router)

  //cada vez que cambia la publicacion recalculo urls y estados de carga
  ngOnChanges(): void {
    //actualizo urls de imagenes segun la publicacion actual
    this.actualizarRecursosVisuales()
    //si corresponde inicializo o recargo comentarios de detalle
    this.actualizarComentariosSiCorresponde()
    //ajusto comentarios para la vista compacta
    this.actualizarComentariosCompactos()
  }

  //getter que indica si el usuario actual ya dio me gusta
  protected get tieneLike(): boolean {
    const likes = this.publicacion?.likes ?? []
    const usuarioUuid = this.usuarioActualId

    //si no hay usuario logueado no puede haber like
    if (usuarioUuid === '') {
      return false
    }

    //si el uuid del usuario esta en la lista de likes retorno true
    if (likes.includes(usuarioUuid)) {
      return true
    }

    //caso contrario retorno false
    return false
  }

  //getter que indica si la publicacion pertenece al usuario actual
  protected get esPropia(): boolean {
    const autorUuid = this.publicacion?.autor?.uuid ?? ''
    const usuarioUuid = this.usuarioActualId

    //comparo por uuid si existen ambos valores
    if (autorUuid !== '' && usuarioUuid !== '') {
      return autorUuid === usuarioUuid
    }

    //si no hay uuid comparo por id del autor
    const autorId = this.publicacion?.autor?._id ?? ''
    return autorId !== '' && autorId === usuarioUuid
  }

  //devuelvo las iniciales del autor para usar en el avatar placeholder
  protected inicialesAutor(): string {
    const nombre = this.publicacion?.autor?.userName ?? ''

    //si no hay nombre muestro iniciales del proyecto
    if (nombre === '') {
      return 'RC'
    }

    //tomo la primera letra del nombre y la convierto en mayuscula
    const primeraLetra = nombre.trim().charAt(0)
    return primeraLetra.toUpperCase()
  }

  //manejo el click del boton me gusta alternando entre like y unlike
  protected onToggleLike(event?: Event): void {
    if (event) {
      //evito navegacion o propagacion cuando hago click en el boton
      event.preventDefault()
      event.stopPropagation()
    }
    //si ya tiene like lo quito
    if (this.tieneLike) {
      this.unlike.emit(this.publicacion)
      return
    }

    //si no lo tiene lo agrego
    this.like.emit(this.publicacion)
  }

  //emito el evento de eliminacion de la publicacion
  protected onEliminar(event?: Event): void {
    if (event) {
      //evito que el click dispare navegacion al detalle
      event.preventDefault()
      event.stopPropagation()
    }
    //emito la publicacion para que el padre maneje la eliminacion
    this.eliminar.emit(this.publicacion)
  }

  //marco que el avatar termino de cargar para mostrarlo con efecto fade
  protected onAvatarCargado(): void {
    this.avatarCargado = true
  }

  //marco que la imagen principal termino de cargar para mostrarla con efecto fade
  protected onImagenCargada(): void {
    this.imagenCargada = true
  }

  //manejo el error al cargar el avatar reemplazandolo por el placeholder
  protected onAvatarError(): void {
    const placeholder = this.placeholderUrl

    //si no tengo placeholder marco como cargado y salgo
    if (placeholder === '') {
      this.avatarCargado = true
      return
    }

    //si ya intente con el placeholder marco como cargado para evitar bucles
    if (this.avatarUrl === placeholder) {
      this.avatarCargado = true
      return
    }

    //reemplazo la imagen fallida por el placeholder
    this.avatarCargado = false
    this.avatarUrl = placeholder
  }

  //manejo el error al cargar la imagen principal reemplazandola por el placeholder
  protected onImagenError(): void {
    const placeholder = this.placeholderUrl

    //si no tengo placeholder marco como cargado igual
    if (placeholder === '') {
      this.imagenCargada = true
      return
    }

    //si ya intente con el placeholder marco como cargado para evitar bucles
    if (this.imagenUrl === placeholder) {
      this.imagenCargada = true
      return
    }

    //reemplazo la imagen principal por el placeholder
    this.imagenCargada = false
    this.imagenUrl = placeholder
  }

  //getter que devuelve el listado de comentarios asociados a la publicacion
  protected get listaComentarios(): Comentario[] {
    //en modo detalle uso la lista completa paginada
    if (this.modoDetalle) {
      return this.comentarios
    }
    //si aun no tengo comentarios compactos retorno lista vacia
    if (this.comentariosCompactos.length === 0) {
      return []
    }

    //si no defini cantidad visible calculo un maximo inicial
    if (this.comentariosVisibles === 0) {
      const maximos = Math.min(this.comentariosPorPagina, this.comentariosCompactos.length)
      return this.comentariosCompactos.slice(0, maximos)
    }

    //en vista compacta retorno solo la cantidad visible
    return this.comentariosCompactos.slice(0, this.comentariosVisibles)
  }

  //getter que indica si existen comentarios cargados
  protected get hayComentarios(): boolean {
    if (this.modoDetalle) {
      return this.comentarios.length > 0
    }

    return this.listaComentarios.length > 0
  }

  //permito mostrar un pequeno texto sobre la cantidad de comentarios
  protected get resumenComentarios(): string {
    const total = this.modoDetalle ? this.totalComentarios : this.totalComentariosCompactos

    if (total === 0) {
      return 'se el primero en comentar'
    }

    if (total === 1) {
      return '1 comentario'
    }

    return `${total} comentarios`
  }

  //verifico si un comentario pertenece al usuario logueado
  protected comentarioEsPropio(comentario: Comentario): boolean {
    const uuid = comentario.usuario?.uuid ?? ''
    //primero intento comparar por uuid si esta disponible
    if (uuid !== '' && this.usuarioActualId !== '') {
      return uuid === this.usuarioActualId
    }
    //si no hay uuid comparo por id del usuario
    const usuarioId = comentario.usuario?._id ?? ''
    return usuarioId !== '' && usuarioId === this.usuarioActualId
  }

  //envio el comentario escrito por el usuario en modo detalle
  protected enviarComentario(): void {
    const contenido = this.nuevoComentario.trim()

    //solo permito enviar cuando estoy en modo detalle
    if (!this.modoDetalle) {
      return
    }

    //si el contenido esta vacio o ya estoy enviando no hago nada
    if (contenido === '' || this.enviandoComentario) {
      return
    }

    const id = this.publicacion?._id ?? ''
    if (id === '') {
      return
    }

    this.enviandoComentario = true

    this.publicacionesService
      .crearComentario(id, contenido)
      .subscribe({
        next: (comentarioCreado) => {
          //limpio el textarea y actualizo contador y lista local
          this.nuevoComentario = ''
          this.enviandoComentario = false
          this.totalComentarios = this.totalComentarios + 1
          this.comentarios = [comentarioCreado, ...this.comentarios]
          this.cdr.markForCheck()
        },
        error: () => {
          //muestro error y marco el cambio para refrescar la vista
          this.enviandoComentario = false
          mostrarSwal('no pudimos guardar el comentario', 'intenta nuevamente', 'error')
          this.cdr.markForCheck()
        }
      })
  }

  //preparo la edicion del comentario seleccionado
  protected activarEdicion(comentario: Comentario): void {
    //solo habilito edicion en modo detalle
    if (!this.modoDetalle) {
      return
    }
    //guardo id y contenido actual para el formulario de edicion
    this.comentarioEditandoId = comentario._id
    this.comentarioEditandoTexto = comentario.contenido
  }

  //cancelo el modo edicion del comentario
  protected cancelarEdicion(): void {
    //solo aplico cambios si estoy en modo detalle
    if (!this.modoDetalle) {
      return
    }
    //restablezco el estado de edicion
    this.comentarioEditandoId = null
    this.comentarioEditandoTexto = ''
  }

  //guardo los cambios sobre el comentario en edicion
  protected guardarEdicion(): void {
    //solo permito guardar en modo detalle
    if (!this.modoDetalle) {
      return
    }

    const comentarioId = this.comentarioEditandoId
    const contenido = this.comentarioEditandoTexto.trim()

    //valido que haya comentario seleccionado, texto y que no este guardando ya
    if (!comentarioId || contenido === '' || this.guardandoEdicion) {
      return
    }

    const id = this.publicacion?._id ?? ''
    if (id === '') {
      return
    }

    this.guardandoEdicion = true

    this.publicacionesService
      .editarComentario(id, comentarioId, contenido)
      .subscribe({
        next: (comentarioActualizado) => {
          //reemplazo el comentario editado en la lista local
          this.comentarios = this.comentarios.map((comentario) =>
            comentario._id === comentarioActualizado._id ? comentarioActualizado : comentario
          )
          //restablezco flags de edicion y refresco la vista
          this.guardandoEdicion = false
          this.comentarioEditandoId = null
          this.comentarioEditandoTexto = ''
          this.cdr.markForCheck()
        },
        error: () => {
          //muestro error y desactivo flag de guardado
          this.guardandoEdicion = false
          mostrarSwal('no pudimos actualizar el comentario', 'intenta nuevamente', 'error')
          this.cdr.markForCheck()
        }
      })
  }

  //carga progresiva de comentarios en modo detalle
  protected cargarComentarios(): void {
    //solo cargo comentarios extra en modo detalle
    if (!this.modoDetalle) {
      return
    }

    //si ya estoy cargando o no hay mas no hago nada
    if (this.cargandoComentarios || !this.hayMasComentarios) {
      return
    }

    const id = this.publicacion?._id ?? ''
    if (id === '') {
      return
    }

    this.cargandoComentarios = true
    //calculo el skip segun la pagina actual
    const skip = this.paginaActual * this.comentariosPorPagina

    this.publicacionesService
      .listarComentarios(id, skip, this.comentariosPorPagina)
      .subscribe({
        next: (respuesta) => {
          //armo un set con ids existentes para evitar duplicados
          const existentes = new Set(this.comentarios.map((comentario) => comentario._id))
          const nuevos = respuesta.comentarios.filter(
            (comentario: Comentario) => !existentes.has(comentario._id)
          )

          //agrego los nuevos comentarios al final de la lista
          this.comentarios = [...this.comentarios, ...nuevos]
          this.totalComentarios = respuesta.total
          this.hayMasComentarios = respuesta.hasMore
          this.paginaActual = this.paginaActual + 1
          this.cargandoComentarios = false
          this.comentariosInicializados = true
          this.cdr.markForCheck()
        },
        error: () => {
          //muestro error al traer comentarios y actualizo la vista
          this.cargandoComentarios = false
          mostrarSwal('no pudimos traer los comentarios', 'intenta nuevamente', 'error')
          this.cdr.markForCheck()
        }
      })
  }

  //recalculo las urls de imagenes y reinicio los estados de carga
  private actualizarRecursosVisuales(): void {
    if (!this.publicacion) {
      //si no tengo publicacion limpio urls y marco recursos como cargados
      this.avatarUrl = ''
      this.imagenUrl = ''
      this.avatarCargado = true
      this.imagenCargada = true
      return
    }

    const placeholder = this.calcularPlaceholder()
    //guardo la ruta del placeholder para reutilizarla en errores de carga
    this.placeholderUrl = placeholder

    //recalculo el avatar manteniendo el estado si la imagen no cambia
    const avatarPrevio = this.avatarUrl
    const avatarCargadoPrevio = this.avatarCargado
    const avatar = this.resolverAvatar()
    this.avatarUrl = avatar
    const avatarSinImagen = avatar === ''
    const avatarSinCambios = avatar !== '' && avatar === avatarPrevio && avatarCargadoPrevio
    //mantengo el estado de carga del avatar si la imagen no cambia
    this.avatarCargado = avatarSinImagen || avatarSinCambios

    //recalculo la imagen principal manteniendo el estado si no cambia
    const imagenPrevia = this.imagenUrl
    const imagenCargadaPrevia = this.imagenCargada
    const imagenPrincipal = this.resolverImagenPrincipal()
    this.imagenUrl = imagenPrincipal
    const imagenSinArchivo = imagenPrincipal === ''
    const imagenSinCambios =
      imagenPrincipal !== '' && imagenPrincipal === imagenPrevia && imagenCargadaPrevia
    //mantengo el estado de carga de la imagen principal si la imagen no cambia
    this.imagenCargada = imagenSinArchivo || imagenSinCambios
  }

  //verifico si debo inicializar los comentarios en modo detalle
  private actualizarComentariosSiCorresponde(): void {
    //si no estoy en modo detalle o no hay publicacion limpio estado
    if (!this.modoDetalle || !this.publicacion) {
      this.comentariosInicializados = false
      return
    }

    const idActual = this.publicacion._id

    if (!idActual) {
      this.comentariosInicializados = false
      return
    }

    //si es una publicacion nueva o aun no inicialice comentarios los cargo de cero
    if (!this.comentariosInicializados || idActual !== this.ultimaPublicacionId) {
      this.ultimaPublicacionId = idActual
      this.resetearEstadoComentarios()
      this.cargarComentarios()
    }
  }

  //ordeno y preparo los comentarios para la vista compacta
  private actualizarComentariosCompactos(): void {
    //si estoy en modo detalle no uso vista compacta
    if (this.modoDetalle) {
      this.resetearComentariosCompactos()
      this.ultimaPublicacionCompactaId = ''
      return
    }

    const id = this.publicacion?._id ?? ''

    if (id === '') {
      //si no tengo id limpio estado de comentarios compactos
      this.resetearComentariosCompactos()
      this.ultimaPublicacionCompactaId = ''
      return
    }

    //si cambio la publicacion reinicio el estado compacto
    if (this.ultimaPublicacionCompactaId !== id) {
      this.resetearComentariosCompactos()
      this.ultimaPublicacionCompactaId = id
    }

    //si la publicacion trae comentarios los uso directamente
    const comentariosOriginales = Array.isArray(this.publicacion?.comentarios)
      ? this.publicacion.comentarios
      : []

    if (comentariosOriginales.length > 0) {
      const total = comentariosOriginales.length
      const hayMas = total > this.comentariosPorPagina
      this.procesarComentariosCompactos(comentariosOriginales, total, hayMas)
      return
    }

    //si ya intente cargar o estoy cargando no vuelvo a pedir
    if (this.comentariosCompactosCargados || this.cargandoComentariosCompactos) {
      return
    }

    //si no tengo comentarios locales pido los ultimos al backend
    this.cargarComentariosCompactos(id)
  }

  //traigo los ultimos comentarios para la vista compacta
  private cargarComentariosCompactos(publicacionId: string): void {
    this.cargandoComentariosCompactos = true

    this.publicacionesService
      .listarComentarios(publicacionId, 0, this.comentariosPorPagina)
      .subscribe({
        next: (respuesta) => {
          //proceso la respuesta y actualizo estado compacto
          this.procesarComentariosCompactos(
            respuesta.comentarios,
            respuesta.total,
            respuesta.hasMore
          )
          this.cargandoComentariosCompactos = false
          this.cdr.markForCheck()
        },
        error: (error) => {
          //si falla marco como cargado para no reintentar en loop
          this.cargandoComentariosCompactos = false
          this.comentariosCompactosCargados = true
          this.comentariosCompactos = []
          this.totalComentariosCompactos = 0
          this.comentariosVisibles = 0
          this.hayMasComentariosCompactos = false
          console.log('no pude traer comentarios compactos', error)
          this.cdr.markForCheck()
        }
      })
  }

  //ordeno y guardo los comentarios para la vista compacta
  private procesarComentariosCompactos(
    comentarios: Comentario[],
    total: number,
    hayMas: boolean
  ): void {
    //ordeno los comentarios por fecha descendente
    const ordenados = [...comentarios].sort((a, b) => {
      const fechaA = new Date(a.createdAt).getTime()
      const fechaB = new Date(b.createdAt).getTime()
      return fechaB - fechaA
    })

    //normalizo el total para evitar valores invalidos
    const totalSeguro = Number.isFinite(total) && total >= 0 ? Math.floor(total) : ordenados.length
    //limito la cantidad inicial de visibles
    const visibles = Math.min(this.comentariosPorPagina, ordenados.length)
    //determino si realmente hay mas comentarios segun flags y total
    const hayMasReal =
      hayMas === true
        ? true
        : hayMas === false
        ? false
        : totalSeguro > this.comentariosPorPagina

    //guardo estado compacto calculado
    this.comentariosCompactos = ordenados
    this.totalComentariosCompactos = totalSeguro
    this.comentariosVisibles = visibles
    this.hayMasComentariosCompactos = hayMasReal
    this.comentariosCompactosCargados = true
  }

  //navego a la pagina de detalle cuando estoy en modo listado
  protected irAlDetalle(event?: Event): void {
    if (event) {
      //evito que el click se propague a otros manejadores
      event.preventDefault()
      event.stopPropagation()
    }

    //si ya estoy en detalle no navego de nuevo
    if (this.modoDetalle) {
      return
    }

    const id = this.publicacion?._id ?? ''
    if (id === '') {
      return
    }

    //navego al detalle de la publicacion actual
    this.router.navigate(['/publicaciones', id]).catch((error) => {
      console.log('no pude navegar al detalle', error)
    })
  }

  //reseteo el estado interno de comentarios de detalle
  private resetearEstadoComentarios(): void {
    this.comentarios = []
    this.cargandoComentarios = false
    this.hayMasComentarios = true
    this.paginaActual = 0
    this.totalComentarios = 0
    this.nuevoComentario = ''
    this.enviandoComentario = false
    this.comentarioEditandoId = null
    this.comentarioEditandoTexto = ''
    this.guardandoEdicion = false
  }

  //limpio los datos relacionados a la vista compacta de comentarios
  private resetearComentariosCompactos(): void {
    this.comentariosCompactos = []
    this.totalComentariosCompactos = 0
    this.comentariosVisibles = 0
    this.hayMasComentariosCompactos = false
    this.cargandoComentariosCompactos = false
    this.comentariosCompactosCargados = false
  }

  //resuelvo la ruta completa del avatar del autor
  private resolverAvatar(): string {
    const imagen = this.publicacion?.autor?.imagenPerfil ?? ''

    if (imagen === '') {
      //si no tengo imagen de avatar no armo url
      return ''
    }

    if (imagen.startsWith('http')) {
      //si ya viene una url absoluta la reutilizo directamente
      return imagen
    }

    const base = this.baseUrl.replace(/\/$/, '')
    const ruta = imagen.startsWith('/') ? imagen : `/images/${imagen}`
    //compongo la url final del avatar usando la base del backend
    return `${base}${ruta}`
  }

  //resuelvo la ruta completa de la imagen principal de la publicacion
  private resolverImagenPrincipal(): string {
    const imagen = this.publicacion?.imagen ?? ''

    if (imagen === '') {
      //si no tengo imagen principal no armo url
      return ''
    }

    if (imagen.startsWith('http')) {
      //si la imagen ya es una url completa la devuelvo tal cual
      return imagen
    }

    const base = this.baseUrl.replace(/\/$/, '')
    const ruta = imagen.startsWith('/') ? imagen : `/images/${imagen}`
    //compongo la url final de la imagen principal usando la base del backend
    return `${base}${ruta}`
  }

  //armo la ruta completa al placeholder para reutilizarla en los errores
  private calcularPlaceholder(): string {
    const base = (this.baseUrl ?? '').replace(/\/$/, '')

    if (base === '') {
      //si no hay baseurl uso la ruta estatica por defecto
      return '/images/placeholder.png'
    }

    //si hay baseurl la uso para armar la ruta absoluta al placeholder
    return `${base}/images/placeholder.png`
  }
}
