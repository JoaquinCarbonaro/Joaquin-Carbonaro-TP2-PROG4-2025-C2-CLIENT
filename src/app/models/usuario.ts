//representa toda la informacion completa del usuario registrada en la base de datos
export class Usuario {
  _id!: string
  nombre!: string
  apellido!: string
  email!: string
  userName!: string //nombre de usuario unico
  fechaNacimiento!: Date
  password?: string //contraseña opcional
  descripcion!: string
  imagenPerfil!: string //url o ruta de la imagen de perfil
  estado!: boolean //indica si el usuario esta habilitado o no
  perfil!: 'usuario' | 'administrador' //rol del usuario (usuario comun o administrador)

  //constructor que permite inicializar con valores parciales
  constructor(init?: Partial<Usuario>) {
    //asigna las propiedades recibidas al objeto actual
    Object.assign(this, init)
  }
}

//Se usa para:
//Autenticacion (login, registro)
//Listado de usuarios (en el panel admin)
//Relacion con publicaciones o comentarios
//Lógica de permisos (por el campo perfil)