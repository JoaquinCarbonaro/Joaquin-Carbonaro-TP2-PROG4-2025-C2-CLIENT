import { Component, EventEmitter, Input, OnChanges, Output, ChangeDetectionStrategy } from '@angular/core'
import { CommonModule, DatePipe, NgClass } from '@angular/common'
import { Publicacion } from '../../models/publicacion'
import { Comentario } from '../../models/comentario'

@Component({
  selector: 'app-publicacion-card',
  standalone: true, 
  templateUrl: './publicacion-card.html', 
  styleUrl: './publicacion-card.css',
  imports: [CommonModule, DatePipe, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicacionCardComponent implements OnChanges {

  //recibo la publicacion que se va a mostrar en la tarjeta
  @Input({ required: true }) publicacion!: Publicacion

  //uuid del usuario actualmente logueado (necesario para verificar likes o autoria)
  @Input() usuarioActualId = ''

  //url base del backend para armar rutas absolutas de imagenes
  @Input() baseUrl = ''

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

  //se implementara en el sprint 3: envio y gestion de nuevos comentarios

  //cada vez que cambia la publicacion recalculo urls y estados de carga
  ngOnChanges(): void {
    this.actualizarRecursosVisuales()
  }

  //getter que indica si el usuario actual ya dio me gusta
  protected get tieneLike(): boolean {
    const likes = this.publicacion?.likes ?? []
    const usuarioUuid = this.usuarioActualId

    //si no hay usuario logueado no puede haber like
    if (usuarioUuid === '') {
      return false
    }

    //si el uuid del usuario esta en la lista de likes retorna true
    if (likes.includes(usuarioUuid)) {
      return true
    }

    //caso contrario retorna false
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

  //devuelve las iniciales del autor para usar en el avatar placeholder
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

  //maneja el click del boton me gusta alternando entre like y unlike
  protected onToggleLike(): void {
    //si ya tiene like lo quita
    if (this.tieneLike) {
      this.unlike.emit(this.publicacion)
      return
    }

    //si no lo tiene lo agrega
    this.like.emit(this.publicacion)
  }

  //emite el evento de eliminacion de la publicacion
  protected onEliminar(): void {
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

    if (placeholder === '') {
      this.avatarCargado = true
      return
    }

    if (this.avatarUrl === placeholder) {
      this.avatarCargado = true
      return
    }

    this.avatarCargado = false
    this.avatarUrl = placeholder
  }

  //manejo el error al cargar la imagen principal reemplazandola por el placeholder
  protected onImagenError(): void {
    const placeholder = this.placeholderUrl

    if (placeholder === '') {
      this.imagenCargada = true
      return
    }

    if (this.imagenUrl === placeholder) {
      this.imagenCargada = true
      return
    }

    this.imagenCargada = false
    this.imagenUrl = placeholder
  }

  //getter que devuelve el listado de comentarios asociados a la publicacion
  protected get listaComentarios(): Comentario[] {
    const comentarios = this.publicacion?.comentarios ?? []
    //devuelvo siempre un arreglo aunque no existan comentarios
    return comentarios
  }

  //getter que indica si existen comentarios cargados
  protected get hayComentarios(): boolean {
    //verifico si hay al menos un comentario en la lista
    return this.listaComentarios.length > 0
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

    const avatarPrevio = this.avatarUrl
    const avatarCargadoPrevio = this.avatarCargado
    const avatar = this.resolverAvatar()
    this.avatarUrl = avatar
    const avatarSinImagen = avatar === ''
    const avatarSinCambios = avatar !== '' && avatar === avatarPrevio && avatarCargadoPrevio
    //mantengo el estado de carga del avatar si la imagen no cambia
    this.avatarCargado = avatarSinImagen || avatarSinCambios

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
