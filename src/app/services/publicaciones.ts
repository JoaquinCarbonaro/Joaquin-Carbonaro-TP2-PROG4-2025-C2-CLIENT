import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable, map } from 'rxjs'
import { environment } from '../../environments/environment'
import { Auth } from './auth'
import { Publicacion, PublicacionesPaginadas } from '../models/publicacion'
import { Comentario } from '../models/comentario'

//estructura posible de respuesta del backend al listar publicaciones
interface ListarPublicacionesRespuesta {
  publicaciones?: any[]
  data?: any[]
  total?: number
  count?: number
  hasMore?: boolean
}

@Injectable({
  providedIn: 'root'
})
export class PublicacionesService {
  //inyecto httpclient para hacer peticiones http
  private readonly http = inject(HttpClient)
  //inyecto el servicio de autenticacion para obtener el token del usuario logueado
  private readonly auth = inject(Auth)

  //listo publicaciones con paginacion, orden y filtro opcional por autor
  listarPublicaciones(
    offset: number,
    limite: number,
    orden: 'recientes' | 'likes',
    autorUuid?: string | null
  ): Observable<PublicacionesPaginadas> {
    //armo headers con el token y tipo de contenido
    const headers = this.obtenerHeaders('json')
    //convierto el tipo de orden al valor esperado por el backend
    const ordenReal = orden === 'recientes' ? 'createdAt' : 'likes'
    //normalizo el offset para evitar valores invalidos
    const offsetSeguro = Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0
    //normalizo el limite para asegurar un valor positivo
    const limiteSeguro = Number.isFinite(limite) && limite > 0 ? Math.floor(limite) : 10
    //creo los parametros de la url usando offset, limit y orden
    var params = new HttpParams()
      .set('offset', offsetSeguro.toString())
      .set('limit', limiteSeguro.toString())
      .set('order', ordenReal)

    //si recibo autorUuid lo agrego como filtro en los parametros
    if (autorUuid && autorUuid !== '') {
      params = params.set('autorUuid', autorUuid)
    }

    //hago la peticion al backend y transformo la respuesta al formato del front
    return this.http
      .get<ListarPublicacionesRespuesta>(
        `${environment.apiBaseUrl}/publicaciones`,
        { headers, params }
      )
      .pipe(
        map((response) => {
          //tomo el array de publicaciones que venga en la respuesta
          const origen = response?.publicaciones ?? response?.data ?? []
          //mapeo cada publicacion al modelo local
          const publicaciones = origen.map((item) =>
            this.mapearPublicacion(item)
          )
          //obtengo el total remoto si viene, sino calculo localmente
          const totalRemoto =
            typeof response?.total === 'number'
              ? response.total
              : response?.count
          const total =
            typeof totalRemoto === 'number'
              ? totalRemoto
              : offsetSeguro + publicaciones.length
          //verifico si hay mas paginas calculando contra el total
          const hasMore =
            response?.hasMore ?? offsetSeguro + publicaciones.length < total
          //retorno el objeto paginado que voy a usar en el front
          return { publicaciones, total, hasMore }
        })
      )
  }

  //creo una nueva publicacion con o sin imagen
  crearPublicacion(datos: {
    titulo: string
    descripcion: string
    imagen?: File | null
  }): Observable<Publicacion> {
    //armo un formdata para enviar campos de texto mas el archivo
    const formData = new FormData()
    formData.append('titulo', datos.titulo)
    formData.append('descripcion', datos.descripcion)
    //si recibo imagen la adjunto en el formdata
    if (datos.imagen) {
      formData.append('imagen', datos.imagen, datos.imagen.name)
    }

    //obtengo headers con token sin content-type (lo maneja formdata)
    const headers = this.obtenerHeaders('multipart')

    //hago la peticion post al backend y mapeo la respuesta a publicacion
    return this.http
      .post<any>(
        `${environment.apiBaseUrl}/publicaciones`,
        formData,
        { headers }
      )
      .pipe(map((respuesta) => this.mapearPublicacion(respuesta)))
  }

  //agrego un me gusta a una publicacion
  darLike(publicacionId: string): Observable<Publicacion> {
    //armo headers para enviar el token
    const headers = this.obtenerHeaders('json')
    //hago post al endpoint de me gusta y mapeo la publicacion actualizada
    return this.http
      .post<any>(
        `${environment.apiBaseUrl}/publicaciones/${publicacionId}/me-gusta`,
        {},
        { headers }
      )
      .pipe(map((respuesta) => this.mapearPublicacion(respuesta)))
  }

  //quito un me gusta de una publicacion
  quitarLike(publicacionId: string): Observable<Publicacion> {
    //armo headers para enviar el token
    const headers = this.obtenerHeaders('json')
    //hago delete al endpoint de me gusta y mapeo la publicacion actualizada
    return this.http
      .delete<any>(
        `${environment.apiBaseUrl}/publicaciones/${publicacionId}/me-gusta`,
        { headers }
      )
      .pipe(map((respuesta) => this.mapearPublicacion(respuesta)))
  }

  //elimino una publicacion propia del backend
  eliminarPublicacion(publicacionId: string): Observable<void> {
    //armo headers para enviar el token
    const headers = this.obtenerHeaders('json')
    //hago delete al endpoint de la publicacion
    return this.http.delete<void>(
      `${environment.apiBaseUrl}/publicaciones/${publicacionId}`,
      { headers }
    )
  }

  //genero los headers segun el tipo de contenido y el token
  private obtenerHeaders(tipo: 'json' | 'multipart'): Record<string, string> {
    const headers: Record<string, string> = {}
    //si el tipo es json agrego el content-type
    if (tipo === 'json') {
      headers['Content-Type'] = 'application/json'
    }
    //si existe token de usuario lo agrego en el header authorization
    const token = this.auth.obtenerToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  //transformo la estructura del backend al modelo publicacion del front
  private mapearPublicacion(data: any): Publicacion {
    //armo datos del autor normalizados
    const autor = data?.autor ?? {}

    //armo los comentarios si vienen del backend
    const comentariosOrigen = Array.isArray(data?.comentarios)
      ? data.comentarios
      : []
    const comentarios: Comentario[] = comentariosOrigen.map((comentario: any) =>
      this.mapearComentario(comentario)
    )

    //armo el array de likes transformando todos a string
    const likesOrigen = Array.isArray(data?.likes) ? data.likes : []
    const likes: string[] = likesOrigen
      .map((like: any) => {
        //si el like es falsy lo ignoro
        if (!like) return ''
        //si viene como string lo uso directo
        if (typeof like === 'string') return like
        //si viene con uuid lo uso
        if (typeof like?.uuid === 'string') return like.uuid
        //si viene con _id string lo uso
        if (typeof like?._id === 'string') return like._id
        //si _id es un objeto intento convertirlo a string
        const idObjeto = like?._id
        if (idObjeto && typeof idObjeto === 'object' && typeof idObjeto.toString === 'function') {
          return idObjeto.toString()
        }
        //si no pude resolver devuelvo cadena vacia
        return ''
      })
      //elimino valores vacios para no romper el front
      .filter((valor: string) => valor !== '')

    //retorno el objeto publicacion con todos los campos normalizados
    return {
      _id: data?._id ?? data?.id ?? '',
      titulo: data?.titulo ?? '',
      mensaje: data?.mensaje ?? data?.descripcion ?? '',
      descripcion: data?.descripcion ?? data?.mensaje ?? '',
      imagen: data?.imagen ?? data?.image ?? '',
      createdAt: data?.createdAt ?? data?.fecha ?? new Date().toISOString(),
      updatedAt: data?.updatedAt ?? data?.modificado ?? undefined,
      likes: likes,
      autor: {
        _id: autor?._id ?? autor?.id ?? autor?.uuid ?? '',
        userName: autor?.userName ?? autor?.nombre ?? '',
        imagenPerfil: autor?.imagenPerfil ?? autor?.avatar ?? undefined,
        uuid: autor?.uuid ?? undefined
      },
      comentarios: comentarios
    }
  }

  //transformo un comentario recibido al modelo comentario del front
  private mapearComentario(data: any): Comentario {
    const usuario = data?.usuario ?? {}
    //construyo el comentario normalizado con datos del usuario
    return {
      _id: data?._id ?? data?.id ?? '',
      contenido: data?.contenido ?? data?.mensaje ?? '',
      createdAt: data?.createdAt ?? data?.fecha ?? new Date().toISOString(),
      usuario: {
        _id: usuario?._id ?? usuario?.id ?? usuario?.uuid ?? '',
        userName: usuario?.userName ?? usuario?.nombre ?? '',
        imagenPerfil: usuario?.imagenPerfil ?? usuario?.avatar ?? undefined
      }
    }
  }
}
