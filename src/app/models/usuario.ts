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
