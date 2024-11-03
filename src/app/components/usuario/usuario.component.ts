import { Component, Inject, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { PersonaDto } from 'src/app/dto/persona-dto';
import { UsuarioDto } from 'src/app/dto/usuario-dto';
import { UsuarioTipo } from 'src/app/models/usuario-tipo';
import { AuthService } from 'src/app/services/auth.service';
import { PersonaService } from 'src/app/services/persona.service';
import { UsuarioTipoService } from 'src/app/services/usuario-tipo.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-usuario',
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.css'],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { subscriptSizing: 'dynamic' },
    },
  ],
})
export class UsuarioComponent {
  listadoPersona: PersonaDto[] = [];

  dataSource = new MatTableDataSource<PersonaDto>([]);
  displayedColumns: string[] = ['index', 'nombres', 'email', 'perfil', 'crear'];
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;

  dialogRef!: MatDialogRef<any>;
  palabrasClaves!: string;

  form!: FormGroup;

  constructor(
    public personaService: PersonaService,
    public dialog: MatDialog,
    private authService: AuthService,
    private router: Router,
    private usuarioService: UsuarioService
  ) {
    if (this.authService.validacionToken()) {
      this.obtenerPersonas();
    }
  }

  obtenerPersonas() {
    this.personaService.obtenerPersonasUsuario().subscribe((data: any) => {
      this.listadoPersona = data;
      this.dataSource = new MatTableDataSource<PersonaDto>(data);
      this.paginator.firstPage();
      this.dataSource.paginator = this.paginator;
    });
  }

  filtrar(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  eliminarUsuario(element: any) {
    Swal.fire({
      title:
        '¿Se encuentra seguro de eliminar a ' +
        element.nombre +
        ' ' +
        element.apellido +
        ' ?',
      text: 'La siguiente acción no podrá deshacerse.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00c053',
      cancelButtonColor: '#DC1919',
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.usuarioService.eliminarUsuario(element).subscribe((data) => {
          Swal.fire({
            icon: 'success',
            title: '¡Transacción realizada con éxito!',
            confirmButtonColor: '#00c053',
            confirmButtonText: 'Ok',
          });
          this.obtenerPersonas();
        });
      }
    });
  }

  editarUsuario(element: any) {
    this.editarFormulario(element);
  }

  crearUsuario(usuario: any) {
    this.dialogRef = this.dialog.open(ModalFormularioUsuario, {
      width: '50%',
      disableClose: true,
      data: { usuario },
    });
    this.dialogRef.afterClosed().subscribe(() => {
      this.onModalClosed();
    });
  }

  editarFormulario(usuario: any): void {
    this.dialogRef = this.dialog.open(ModalFormularioUsuario, {
      width: '50%',
      disableClose: true,
      data: { usuario },
    });
    this.dialogRef.afterClosed().subscribe(() => {
      this.onModalClosed();
    });
  }

  onModalClosed() {
    this.obtenerPersonas();
  }
}

/// MODAL FORMULARIO

@Component({
  selector: 'modal-formulario-usuario',
  templateUrl: './modal-formulario-usuario.html',
  styleUrls: ['./usuario.component.css'],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { subscriptSizing: 'dynamic' },
    },
  ],
})
export class ModalFormularioUsuario {
  editar: boolean = false;
  listadoPersona: PersonaDto[] = [];
  form!: FormGroup;
  usuarioTipo: UsuarioTipo[] = [];
  hide = true;

  constructor(
    public dialogRef: MatDialogRef<ModalFormularioUsuario>,
    private formBuilder: FormBuilder,
    public personaService: PersonaService,
    public dialog: MatDialog,
    private authService: AuthService,
    private router: Router,
    private usuarioTipoService: UsuarioTipoService,
    private usuarioService: UsuarioService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (this.authService.validacionToken()) {
      this.crearFormUsuario();
      this.obtenerUsuarioTipos();

      if (JSON.stringify(data) !== 'null' && data.usuario?.usuario > 0) {
        this.editarUsuario(data.usuario);
      }
    }
  }

  private crearFormUsuario(): void {
    this.form = this.formBuilder.group({
      tipo: new FormControl('', Validators.required),
      contrasena: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/), // Al menos una mayúscula y un número
      ]),
    });
  }

  obtenerUsuarioTipos() {
    this.usuarioTipoService.obtenerUsuarioTipos().subscribe((data) => {
      this.usuarioTipo = data;
    });
  }

  editarUsuario(element: PersonaDto) {
    this.editar = true;
    this.form.get('tipo')!.setValue(element.tipoUsuarioCodigo);
  }

  generarUsuario() {
    let persona: UsuarioDto = new UsuarioDto();
    persona.codigo = this.data.usuario.codigo;
    persona.usuario = this.data.usuario.correo;
    persona.contrasena = this.form.get('contrasena')!.value;
    persona.tipo = this.form.get('tipo')!.value;

    if (this.editar) {
      this.actualizarUsuario(persona);
    } else {
      this.registrarUsuario(persona);
    }
  }

  registrarUsuario(persona: any) {
    this.usuarioService.registrarUsuario(persona).subscribe(
      (data) => {
        if (data > 0) {
          Swal.fire({
            icon: 'success',
            title: 'Registrado',
            text: '¡Operación exitosa!',
            showConfirmButton: false,
            timer: 2500,
          });
          this.dialogRef.close();
          this.cancelar();
        } else {
          this.mensajeError();
        }
      },
      (err) => this.fError(err)
    );
  }

  actualizarUsuario(persona: any) {
    this.usuarioService.actualizarUsuario(persona).subscribe(
      (data) => {
        if (data > 0) {
          Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: '¡Operación exitosa!',
            showConfirmButton: false,
          });
          this.cancelar();
          this.dialogRef.close();
        } else {
          this.mensajeError();
        }
      },
      (err) => this.fError(err)
    );
  }

  mensajeError() {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo completar el proceso.',
      showConfirmButton: true,
      confirmButtonText: 'Listo',
      confirmButtonColor: '#8f141b',
    });
  }

  fError(er: any): void {
    let err = er.error.error_description;
    let arr: string[] = err.split(':');
    if (arr[0] == 'Access token expired') {
      this.authService.logout();
      this.router.navigate(['login']);
    } else {
      this.mensajeError();
    }
  }

  cancelar() {}
}
