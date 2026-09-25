import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { AccesosNuevoComponent } from './accesos-nuevo.component';

const routes: Routes = [
  {
    path: '',
    component: AccesosNuevoComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AccesosNuevoRoutingModule { }