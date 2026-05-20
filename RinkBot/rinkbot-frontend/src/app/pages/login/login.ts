import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  form = new FormGroup({
    usuario: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
  });

  loading = false;
  errorMsg = '';

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/chat']);
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;

    this.errorMsg = '';
    this.loading = true;

    const { usuario, password } = this.form.getRawValue();

    this.auth.login(usuario!, password!).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.ok) {
          this.router.navigate(['/chat']);
        } else {
          this.errorMsg = res.error ?? 'Credenciales incorrectas.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorMsg =
          err.status === 401
            ? 'Credenciales incorrectas.'
            : (err.error?.error ?? 'Error al conectar con el servidor. Intenta más tarde.');
      },
    });
  }
}
