import {UserService} from '@loopback/authentication';
import {Credentials} from '@loopback/authentication-jwt';
import {BindingKey} from '@loopback/context';
import {User} from './models';
import {PasswordHasher} from './services';


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
  welcome: 'welcomeEmail',
  resetPassword: 'ResetPasswordEmailFunction',
};
