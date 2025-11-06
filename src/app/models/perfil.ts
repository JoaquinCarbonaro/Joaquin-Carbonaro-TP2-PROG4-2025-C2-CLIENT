export class Perfil {
  uuid!: string
  nombre!: string
  apellido!: string
  userName!: string //nombre de usuario publico
  email!: string
  fechaNacimiento: Date | string | null = null //puede ser Date o string ISO
  descripcion!: string
  imagenPerfil!: string //url o nombre del archivo de la imagen

  //constructor que permite crear el perfil con algunos campos opcionales
  constructor(init?: Partial<Perfil>) {
    //copio las propiedades recibidas al objeto actual
    Object.assign(this, init)
  }
}
