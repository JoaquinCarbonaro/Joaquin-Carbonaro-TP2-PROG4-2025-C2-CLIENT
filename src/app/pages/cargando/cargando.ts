import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  standalone: true,
  selector: 'app-cargando-page',
  templateUrl: './cargando.html',
  styleUrl: './cargando.css',
  imports: [CommonModule]
})
export class Cargando implements OnInit {
  //uso el servicio de autenticacion para validar el token guardado
  private readonly auth = inject(Auth);

  //uso el router para redirigir segun el resultado de la verificacion
  private readonly router = inject(Router);

  //guardo el mensaje visible en la pantalla de carga
  protected mensaje = 'Verificando tu sesión en Rumbo Criollo...';

  //al iniciar el componente ejecuto la verificacion de sesion
  ngOnInit(): void {
    this.verificarSesion();
  }

  //valido el token con el backend y decido a donde navegar
  private verificarSesion(): void {
    //obtengo el token actual guardado
    const token = this.auth.obtenerToken();

    //si no existe token redirijo al login
    if (!token) {
      this.mensaje = 'Redirigiendo al inicio de sesión.';
      this.router.navigate(['/login']);
      return;
    }

    //descomentar el timeout para ver la pagina de carga
    //setTimeout(() => {

    //llamo al metodo del servicio para verificar el token con el backend
    this.auth.verificarToken().subscribe({
      //si la respuesta indica que esta autorizado lo envio a publicaciones
      next: (respuesta) => {
        if (respuesta?.autorizado) {
          this.mensaje = 'Bienvenido de nuevo, cargando tus publicaciones.';
          this.router.navigate(['/publicaciones']);
        } else {
          //si el token no es valido cierro sesion y redirijo al login
          this.mensaje = 'Necesitás iniciar sesión nuevamente.';
          this.auth.cerrarSesion();
          this.router.navigate(['/login']);
        }
      },
      //si ocurre un error de red o respuesta no valida, cierro sesion y redirijo al login
      error: () => {
        this.mensaje = 'Necesitás iniciar sesión nuevamente.';
        this.auth.cerrarSesion();
        this.router.navigate(['/login']);
      }
    });

    //descomentar el timeout para ver la pagina de carga
    //}, 30000);
    
  }
}
