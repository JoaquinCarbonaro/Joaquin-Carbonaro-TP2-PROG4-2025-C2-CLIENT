import { Component, EventEmitter, Input, Output } from '@angular/core'
import { CommonModule, DatePipe, NgClass } from '@angular/common'
import { Publicacion } from '../../models/publicacion'
import { Comentario } from '../../models/comentario'

@Component({
  selector: 'app-publicacion-card',
  standalone: true, 
  templateUrl: './publicacion-card.html', 
  styleUrl: './publicacion-card.css',
  imports: [CommonModule, DatePipe, NgClass] 
})
export class PublicacionCardComponent {

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

  //se implementara en el sprint 3: envio y gestion de nuevos comentarios

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

  //retorna la ruta completa del avatar del autor de la publicacion
  protected obtenerAvatar(): string {
    const imagen = this.publicacion?.autor?.imagenPerfil ?? ''

    //si no hay imagen devuelvo cadena vacia
    if (imagen === '') {
      return ''
    }

    //si la ruta ya es absoluta (http) la retorno directamente
    if (imagen.startsWith('http')) {
      return imagen
    }

    //elimino barra final de la base url en caso de que exista
    const base = this.baseUrl.replace(/\/$/, '')

    //armo la ruta relativa dentro de la carpeta /images/
    const ruta = imagen.startsWith('/') ? imagen : `/images/${imagen}`

    //devuelvo la ruta completa combinando base y ruta
    return `${base}${ruta}`
  }

  //retorna la ruta completa de la imagen principal de la publicacion
  protected obtenerImagen(): string {
    const imagen = this.publicacion?.imagen ?? ''

    //si no hay imagen devuelvo cadena vacia
    if (imagen === '') {
      return ''
    }

    //si la ruta ya es completa (http) la devuelvo tal cual
    if (imagen.startsWith('http')) {
      return imagen
    }

    //elimino barra final de la base url y armo ruta completa
    const base = this.baseUrl.replace(/\/$/, '')
    const ruta = imagen.startsWith('/') ? imagen : `/images/${imagen}`
    return `${base}${ruta}`
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

  //getter que devuelve el listado de comentarios asociados a la publicacion
  protected get listaComentarios(): Comentario[] {
    const comentarios = this.publicacion?.comentarios ?? []
    return comentarios
  }

  //getter que indica si existen comentarios cargados
  protected get hayComentarios(): boolean {
    return this.listaComentarios.length > 0
  }
}
