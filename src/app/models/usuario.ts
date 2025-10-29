export class Usuario {
  _id!: string
  nombre!: string
  apellido!: string
  email!: string
  //nombre de usuario visible y unico
  userName!: string
  fechaNacimiento!: Date
  //contraseña opcional (no siempre se expone)
  password?: string
  descripcion!: string
  //url o ruta de la imagen de perfil
  imagenPerfil!: string
  //indica si el usuario esta habilitado o no
  estado!: boolean
  //rol del usuario (usuario comun o administrador)
  perfil!: 'usuario' | 'administrador'

  //constructor que permite inicializar con valores parciales
  constructor(init?: Partial<Usuario>) {
    //asigna las propiedades recibidas al objeto actual
    Object.assign(this, init)
  }
}
