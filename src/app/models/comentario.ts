export interface Comentario {
  _id: string
  contenido: string //texto del comentario
  createdAt: string
  usuario: ComentarioUsuario
  updatedAt?: string
  modificado?: boolean
}

//datos del usuario que comento
export interface ComentarioUsuario {
  _id: string
  userName: string
  imagenPerfil?: string
  uuid?: string
}

//estructura paginada de comentarios
export interface ComentariosPaginados {
  comentarios: Comentario[]
  total: number
  hasMore: boolean
}
