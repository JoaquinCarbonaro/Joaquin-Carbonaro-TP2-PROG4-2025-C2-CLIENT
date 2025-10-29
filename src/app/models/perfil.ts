export class Perfil {
  imagenPerfil!: File
  userName!: string
  email!: string
  descripcion!: string

  //constructor que permite inicializar con valores parciales
  constructor(init?: Partial<Perfil>) {
    //asigna las propiedades recibidas al objeto actual
    Object.assign(this, init)
  }
}
