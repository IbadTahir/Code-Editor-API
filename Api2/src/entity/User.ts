import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BeforeInsert, Index } from 'typeorm';
import bcrypt from 'bcryptjs';
import { IBaseUser } from '../interfaces/user.interface';
import { appConfig } from '../config/appConfig';

@Entity()
export class User implements IBaseUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  @Index()
  email!: string;

  @Column()
  password!: string;

  @Column({
    type: 'varchar',
    enum: ['student', 'instructor', 'librarian', 'admin'],
    default: 'student'
  })
  role!: 'student' | 'instructor' | 'librarian' | 'admin';

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ nullable: true })
  resetPasswordToken?: string;

  @Column({ nullable: true })
  resetPasswordExpires?: Date;

  @Column({ default: 0 })
  loginAttempts!: number;

  @Column({ nullable: true })
  lockUntil?: Date;

  @Column({ nullable: true })
  lastLogin?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  updatedAt?: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  isLocked(): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }

  incrementLoginAttempts(): void {
    // Reset login attempts if lock has expired
    if (this.lockUntil && this.lockUntil < new Date()) {
      this.loginAttempts = 1;
      this.lockUntil = undefined;
    } else {
      this.loginAttempts += 1;
      
      // Lock account if max attempts reached
      if (this.loginAttempts >= appConfig.security.maxLoginAttempts) {
        this.lockUntil = new Date(Date.now() + appConfig.security.lockoutDuration);
      }
    }
  }

  resetLoginAttempts(): void {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
  }
}
