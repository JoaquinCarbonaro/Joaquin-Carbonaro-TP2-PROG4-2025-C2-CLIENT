import { Routes } from '@angular/router';

export const routes: Routes = [

  { //ruta raiz (por defecto)
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login)
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro)
  },
  {
    path: 'publicaciones',
    loadComponent: () => import('./pages/publicaciones/publicaciones').then((m) => m.Publicaciones)
  },
  {
    path: 'mi-perfil',
    loadComponent: () => import('./pages/mi-perfil/mi-perfil').then((m) => m.MiPerfil)
  },
  {
    path: 'error',
    loadComponent: () => import('./pages/error/error').then((m) => m.Error)
  },
  { //ruta comodin (si no existe la ruta solicitada)
    path: '**',
    redirectTo: 'error'
  }
];
