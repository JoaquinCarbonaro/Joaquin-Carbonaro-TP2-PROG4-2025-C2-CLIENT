import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, BehaviorSubject, map } from 'rxjs'
import { environment } from '../../environments/environment'
import { Perfil } from '../models/perfil'
import { Publicacion } from '../models/publicacion'
import { Comentario } from '../models/comentario'

//defino la forma en que viene la respuesta del backend al pedir el perfil
interface PerfilApiRespuesta {
  usuario: any
  publicaciones: any[]
}

//defino la forma de los datos que enviaremos para actualizar el perfil
interface PerfilActualizacion {
  nombre: string
  apellido: string
  email: string
  userName: string
  fechaNacimiento: string
  descripcion: string
  imagenPerfil: File | null
}

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  //inyecto httpclient para hacer peticiones http al backend
  private readonly http = inject(HttpClient)

  //estado reactivo del perfil actual disponible para el resto de la aplicacion
  private readonly perfilActualSubject = new BehaviorSubject<Perfil | null>(null)
  //expongo el observable para que otros componentes se suscriban al perfil actual
  readonly perfilActual$ = this.perfilActualSubject.asObservable()

  //obtengo el perfil del usuario autenticado junto con sus publicaciones
  obtenerPerfil(): Observable<{ usuario: Perfil; publicaciones: Publicacion[] }> {
    //realizo la peticion get a la ruta del backend que devuelve el perfil
    //el interceptor se encarga de agregar el token en el header authorization
    return this.http
      .get<PerfilApiRespuesta>(`${environment.apiBaseUrl}/usuarios/mi-perfil`)
      .pipe(
        map((respuesta) => {
          //mapeo el usuario recibido al modelo perfil del front
          const perfil = this.mapearPerfil(respuesta?.usuario ?? {})
          //mapeo cada publicacion recibida al modelo tipado
          const publicaciones = (respuesta?.publicaciones ?? []).map((item) =>
            this.mapearPublicacion(item)
          )
          //actualizo el estado global del perfil para que lo usen otros componentes
          this.perfilActualSubject.next(perfil)
          //retorno un objeto con el usuario y sus publicaciones
          return { usuario: perfil, publicaciones: publicaciones }
        })
      )
  }

  //actualiza los datos del perfil autenticado enviando formulario multipart
  actualizarPerfil(datos: PerfilActualizacion): Observable<Perfil> {
    //armo el formdata con todos los campos necesarios
    const formData = new FormData()
    formData.append('nombre', datos.nombre)
    formData.append('apellido', datos.apellido)
    formData.append('email', datos.email)
    formData.append('userName', datos.userName)
    formData.append('fechaNacimiento', datos.fechaNacimiento)
    formData.append('descripcion', datos.descripcion)
    //solo adjunto la imagen si el usuario eligio un archivo nuevo
    if (datos.imagenPerfil) {
      formData.append('imagenPerfil', datos.imagenPerfil)
    }

    //no defino content-type ni headers manuales
    //angular configurara el multipart/form-data y el interceptor agregara el token
    return this.http
      .put<any>(`${environment.apiBaseUrl}/usuarios/mi-perfil`, formData)
      .pipe(
        map((respuesta) => {
          //tomo el usuario de la respuesta contemplando posibles formatos
          const usuario = respuesta?.usuario ?? respuesta ?? {}
          //mapeo el usuario al modelo perfil del front
          const perfil = this.mapearPerfil(usuario)
          //actualizo el estado global del perfil con la version modificada
          this.perfilActualSubject.next(perfil)
          //devuelvo el perfil ya normalizado
          return perfil
        })
      )
  }

  //transformo los datos del backend al modelo perfil usado en el front
  private mapearPerfil(data: any): Perfil {
    //si viene fecha de nacimiento la dejo como string plano
    const fechaNacimiento: string | null = data?.fechaNacimiento ?? null

    //normalizo el rol, usando 'usuario' como valor por defecto si no viene
    const perfil: 'usuario' | 'administrador' =
      (data?.perfil as 'usuario' | 'administrador') ?? 'usuario'

    //creo una instancia de perfil usando valores con fallback
    return new Perfil({
      uuid: data?.uuid ?? '',
      nombre: data?.nombre ?? '',
      apellido: data?.apellido ?? '',
      userName: data?.userName ?? '',
      email: data?.email ?? '',
      fechaNacimiento: fechaNacimiento,
      descripcion: data?.descripcion ?? '',
      imagenPerfil: data?.imagenPerfil ?? '',
      perfil: perfil,
    })
  }

  //transformo los datos de una publicacion recibida al modelo publicacion
  private mapearPublicacion(data: any): Publicacion {
    //extraigo el autor de la publicacion si viene embebido
    const autor = data?.autor ?? {}

    //armo los comentarios si vienen del backend
    const comentariosOrigen = Array.isArray(data?.comentarios) ? data.comentarios : []
    const comentarios: Comentario[] = comentariosOrigen.map((comentario: any) =>
      this.mapearComentario(comentario)
    )

    //armo el array de likes normalizado a string
    const likesOrigen = Array.isArray(data?.likes) ? data.likes : []
    const likes: string[] = likesOrigen
      .map((like: any) => {
        //si el like es un valor falso lo ignoro
        if (!like) return ''
        //si viene como string lo uso directamente
        if (typeof like === 'string') return like
        //si viene con campo uuid lo uso
        if (typeof like?.uuid === 'string') return like.uuid
        //si viene con campo _id como string lo uso
        if (typeof like?._id === 'string') return like._id
        //si _id es un objeto intento convertirlo a string
        const idObjeto = like?._id
        if (idObjeto && typeof idObjeto === 'object' && typeof idObjeto.toString === 'function') {
          return idObjeto.toString()
        }
        //si no pude resolver devuelvo cadena vacia
        return ''
      })
      //elimino entradas vacias para no romper el front
      .filter((valor: string) => valor !== '')

    //retorno la publicacion completa con todos los campos normalizados
    return {
      _id: data?._id ?? data?.id ?? '',
      titulo: data?.titulo ?? '',
      //si no hay mensaje uso descripcion para evitar campos vacios
      mensaje: data?.mensaje ?? data?.descripcion ?? '',
      imagen: data?.imagen ?? data?.image ?? '',
      //si no vienen fechas uso una fecha actual como fallback
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

  //transformo los datos de un comentario al modelo comentario del front
  private mapearComentario(data: any): Comentario {
    //extraigo los datos del usuario que realizo el comentario
    const usuario = data?.usuario ?? {}
    //construyo el comentario tipado con usuario embebido
    return {
      _id: data?._id ?? data?.id ?? '',
      //si no hay contenido uso mensaje como respaldo
      contenido: data?.contenido ?? data?.mensaje ?? '',
      //si no viene fecha uso fecha actual como fallback
      createdAt: data?.createdAt ?? data?.fecha ?? new Date().toISOString(),
      usuario: {
        _id: usuario?._id ?? usuario?.id ?? usuario?.uuid ?? '',
        userName: usuario?.userName ?? usuario?.nombre ?? '',
        imagenPerfil: usuario?.imagenPerfil ?? usuario?.avatar ?? undefined
      }
    }
  }
}
