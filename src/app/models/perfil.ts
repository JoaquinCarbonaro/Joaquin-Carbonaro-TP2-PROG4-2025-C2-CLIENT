//vista resumida del usuario, enfocada en mostrar informacion publica o limitada
export class Perfil {
  uuid!: string
  nombre!: string
  apellido!: string
  userName!: string //nombre de usuario publico
  email!: string
  fechaNacimiento: Date | string | null = null //puede ser Date o string ISO
  descripcion!: string
  imagenPerfil!: string //url o nombre del archivo de la imagen
  perfil!: 'usuario' | 'administrador' //rol visible del usuario para la vista

  //constructor que permite crear el perfil con algunos campos opcionales
  constructor(init?: Partial<Perfil>) {
    //copio las propiedades recibidas al objeto actual
    Object.assign(this, init)
  }
}

//Se usa para:
//Pagina “Mi perfil” y perfiles de otros usuarios
//Mostrar avatar, nombre, descripción y publicaciones
//Vincular un autor dentro de una publicacion o comentario (sin exponer todo el usuario).
