import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, throwError } from 'rxjs';
import { User } from '../models/user.model';;
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { Role } from '../models/Role';


export interface AuthResponseData {
    email: string;
    id: number;
    token: string;
    tokenExpirationDate: Date;
    role:[string]
}



@Injectable({providedIn:'root'})
export class AuthService{
    user = new BehaviorSubject<User | null>(null);
    serverUrl = environment.SERVER_URL;
    private tokenExpirationTimer: any;

    constructor(private http:HttpClient, private router:Router){ }

    signUp(name:string,email:string, password:string){
        return this.http.post(this.serverUrl + 'auth/sign-up-user',{name, email, password})
        .pipe(catchError(this.handleError));
    }

    login(email:string, password:string){
        return this.http.post<AuthResponseData>(this.serverUrl + 'auth/login',{email, password})
        .pipe(tap(resData => {
            this.handleAuthentication(resData.email,resData.id, resData.token, resData.tokenExpirationDate, resData.role)
        }));
    }

    loginAdmin(email, password){
      return this.http.post<AuthResponseData>(this.serverUrl + 'admin/login', { email, password })
      .pipe(tap(res => {
        this.handleAuthentication(res.email, res.id,res.token, res.tokenExpirationDate, res.role)
      }));
    }

    private handleAuthentication( email: string, id: number, token: string, expirationDate: Date, role ) {
        const user = new User(email, id, token, expirationDate, role);
        this.user.next(user);
        localStorage.setItem('userData',JSON.stringify(user));
    }


    autoLogin() {
        const userData: {
          email: string;
          id: number;
          _token: string;
          _tokenExpirationDate: string;
          role:Role;
        } = JSON.parse(localStorage.getItem('userData'));

        if (!userData) {
          return;
        }
    
        const loadedUser = new User(
          userData.email,
          userData.id,
          userData._token,
          new Date(userData._tokenExpirationDate),
          userData.role
        );
    
        if (loadedUser.token) {
          this.user.next(loadedUser);
          const expirationDuration = new Date(userData._tokenExpirationDate).getTime() - new Date().getTime();
          this.autoLogout(expirationDuration);
        }
      }
    logout(){
        this.user.next(null);
        this.router.navigate(['/']);
        localStorage.removeItem('userData');
        if (this.tokenExpirationTimer) {
          clearTimeout(this.tokenExpirationTimer);
        }
        this.tokenExpirationTimer = null;
    }
    
    autoLogout(expirationDuration: number) {
        this.tokenExpirationTimer = setTimeout(() => {
          this.logout();
        }, expirationDuration);
    }

    forgetPassword(email:string){
      return this.http.post(this.serverUrl + 'auth/forget-password',{ email}).pipe(
        catchError(this.handleError));
    }

    verifyPasswordToken(token){
      return this.http.get(this.serverUrl + 'auth/reset/' + token).pipe(catchError(this.handleError));
    }


    resetPassword(token,password, confirmPassword){
      return this.http.post(this.serverUrl + 'auth/reset/'+ token, { password, confirmPassword})
      .pipe(catchError(this.handleError))
    }

    private handleError(errorRes: HttpErrorResponse) {
      let errorMessage = 'An unknown error occurred!';
      if (!errorRes || !errorRes.error) {
        return throwError(errorMessage);
      }

      switch (errorRes.error.message) {
        case 'EMAIL_EXISTS':
          errorMessage = 'Email already exists';
          break;
        case 'EMAIL_NOT_EXISTS':
          errorMessage = 'Email not Exists';
          break;
        case 'EMAIL_NOT_FOUND':
          errorMessage = 'This email does not exist.';
          break;
        case 'INVALID_PASSWORD':
          errorMessage = 'This password is not correct.';
          break;
        case 'INVALID_TOKEN':
          errorMessage = 'Token is Invalid';
          break;
      }
      return throwError(errorMessage);
    }


    getCustomers(){
      return this.http.get<[]>(this.serverUrl + 'admin/customers');
    }

  }