import { Routes } from '@angular/router';
import { GroupContainerComponent } from './group-container.component';
import { GroupRegistrationComponent } from './group-registration.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/group/default',
    pathMatch: 'full'
  },
  {
    path: 'register',
    component: GroupRegistrationComponent
  },
  {
    path: 'group/:groupSlug',
    component: GroupContainerComponent
  },
  {
    path: '**',
    redirectTo: '/register'
  }
];
