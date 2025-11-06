import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, map } from 'rxjs'
import { environment } from '../../environments/environment'
import { Auth } from './auth'
import { Perfil } from '../models/perfil'
import { Publicacion } from '../models/publicacion'
import { Comentario } from '../models/comentario'

//defino la forma en que viene la respuesta del backend al pedir el perfil
interface PerfilApiRespuesta {
  usuario: any
  publicaciones: any[]
}

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  //inyecto httpclient para hacer peticiones http al backend
  private readonly http = inject(HttpClient)
  //inyecto el servicio de autenticacion para obtener el token guardado
  private readonly auth = inject(Auth)

  //obtengo el perfil del usuario autenticado junto con sus publicaciones
  obtenerPerfil(): Observable<{ usuario: Perfil; publicaciones: Publicacion[] }> {
    //obtengo los headers con token
    const headers = this.obtenerHeaders()
    //realizo la peticion get a la ruta del backend que devuelve el perfil
    return this.http
      .get<PerfilApiRespuesta>(`${environment.apiBaseUrl}/usuarios/mi-perfil`, { headers })
      .pipe(
        map((respuesta) => {
          //mapeo el usuario recibido al modelo perfil del front
          const perfil = this.mapearPerfil(respuesta?.usuario ?? {})
          //mapeo cada publicacion recibida al modelo tipado
          const publicaciones = (respuesta?.publicaciones ?? []).map((item) =>
            this.mapearPublicacion(item)
          )
          //retorno un objeto con el usuario y sus publicaciones
          return { usuario: perfil, publicaciones: publicaciones }
        })
      )
  }

  //armo los headers con el token jwt para autorizar la peticion
  private obtenerHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = this.auth.obtenerToken()
    //si tengo token lo agrego al header de autorizacion
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  //transformo los datos del backend al modelo perfil usado en el front
  private mapearPerfil(data: any): Perfil {
    
    //si viene fecha de nacimiento la dejo como string plano
    const fechaNacimiento: string | null = data?.fechaNacimiento ?? null

    //creo una instancia de perfil usando valores con fallback
    return new Perfil({
      uuid: data?.uuid ?? '',
      nombre: data?.nombre ?? '',
      apellido: data?.apellido ?? '',
      userName: data?.userName ?? '',
      email: data?.email ?? '',
      fechaNacimiento: fechaNacimiento,
      descripcion: data?.descripcion ?? '',
      imagenPerfil: data?.imagenPerfil ?? ''
    })
  }

  //transformo los datos de una publicacion recibida al modelo publicacion
  private mapearPublicacion(data: any): Publicacion {
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
      mensaje: data?.mensaje ?? data?.descripcion ?? '',
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

  //transformo los datos de un comentario al modelo comentario del front
  private mapearComentario(data: any): Comentario {
    const usuario = data?.usuario ?? {}
    //construyo el comentario tipado con usuario embebido
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
