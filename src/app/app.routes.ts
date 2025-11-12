import { Routes } from '@angular/router'
import { AuthGuard } from './guards/auth-guard'
import { NoAuthGuard } from './guards/no-auth-guard'
import { AdminGuard } from './guards/admin-guard'

export const routes: Routes = [

  { //ruta raiz (por defecto)
    path: '',
    pathMatch: 'full',
    redirectTo: 'cargando'
  },
  {
    path: 'cargando',
    loadComponent: () => import('./pages/cargando/cargando').then((m) => m.Cargando)
  },
  {
    path: 'login',
    canActivate: [NoAuthGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login)
  },
  {
    path: 'registro',
    canActivate: [NoAuthGuard],
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro)
  },
  {
    path: 'publicaciones',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/publicaciones/publicaciones').then((m) => m.Publicaciones)
  },
  {
    path: 'publicaciones/:id',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/publicacion/publicacion').then((m) => m.PublicacionDetalle)
  },
  {
    path: 'mi-perfil',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/mi-perfil/mi-perfil').then((m) => m.MiPerfil)
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard, AdminGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'usuarios'
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./pages/dashboard/usuarios/usuarios').then((m) => m.DashboardUsuarios)
      }
    ]
  },
  {
    path: 'error',
    loadComponent: () => import('./pages/error/error').then((m) => m.Error)
  },
  { //ruta comodin (si no existe la ruta solicitada)
    path: '**',
    redirectTo: 'error'
  }
]
