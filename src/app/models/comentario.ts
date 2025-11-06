export interface Comentario {
  _id: string
  contenido: string //texto del comentario
  createdAt: string
  usuario: ComentarioUsuario
}

//datos del usuario que comento
export interface ComentarioUsuario {
  _id: string
  userName: string
  imagenPerfil?: string
}
