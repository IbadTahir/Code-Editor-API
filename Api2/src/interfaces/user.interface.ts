export interface IBaseUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: 'student' | 'instructor' | 'librarian' | 'admin';
  emailVerified: boolean;
  emailVerificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
}

export interface TokenUser {
  id?: string;
  _id?: string;
  role: string;
  email: string;
}
