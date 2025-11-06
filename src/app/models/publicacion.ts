import { Comentario } from './comentario'

//datos basicos del autor de una publicacion
export interface AutorPublicacion {
  _id: string
  userName: string //nombre de usuario
  imagenPerfil?: string //imagen de perfil opcional
  uuid?: string //uuid del autor para comparaciones con el token
}

export interface Publicacion {
  _id: string
  titulo: string
  mensaje: string
  descripcion?: string //descripcion opcional usada por el backend
  imagen?: string //imagen opcional
  createdAt: string
  updatedAt?: string //fecha de ultima actualizacion opcional
  likes: string[] //lista de ids de usuarios que dieron me gusta
  autor: AutorPublicacion //objeto con los datos del autor
  comentarios?: Comentario[] //lista opcional de comentarios de la publicacion
}

//estructura para manejar publicaciones paginadas
export interface PublicacionesPaginadas {
  //array con las publicaciones actuales
  publicaciones: Publicacion[]
  //cantidad total de publicaciones existentes
  total: number
  //indica si hay mas publicaciones para cargar
  hasMore: boolean
}
