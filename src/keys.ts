import {UserService} from '@loopback/authentication';
import {BindingKey} from '@loopback/context';
import {PasswordHasher} from './services';
import {User} from './models';
import {Credentials} from '@loopback/authentication-jwt';


export namespace PasswordHasherBindings {
  export const PASSWORD_HASHER = BindingKey.create<PasswordHasher>(
    'services.hasher',
  );
  export const ROUNDS = BindingKey.create<number>('services.hasher.round');
}

export namespace UserServiceBindings {
  export const USER_SERVICE = BindingKey.create<UserService<User, Credentials>>(
    'services.user.service',
  );
}

export const AWS_LAMBDA_FUNCTIONS = {
  welcome: 'WelcomeEmailFunction',
  resetPassword: 'ResetPasswordEmailFunction',
};