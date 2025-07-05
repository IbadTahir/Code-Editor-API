import { DataSource, MoreThan } from 'typeorm';
import { User } from '../entity/User';
import { IBaseUser } from '../interfaces/user.interface';
import { db } from '../config/db';

export class UserService {
  private static instance: UserService;

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  private getRepository() {
    const connection = db.getConnection();
    if (!connection) {
      throw new Error('Database connection not initialized');
    }
    return connection.getRepository(User);
  }

  async getAllUsers(): Promise<Partial<User>[]> {
    const users = await this.getRepository().find();
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  // Update user details except role and password
  async updateUser(id: string, updateData: {
    name?: string;
    email?: string;
  }): Promise<Partial<User> | null> {
    const userRepository = this.getRepository();
    await userRepository.update(id, updateData);
    const updatedUser = await userRepository.findOne({ where: { id } });
    
    if (updatedUser) {
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    }
    return null;
  }

  // Update user role
  async updateUserRole(id: string, role: 'student' | 'instructor' | 'librarian' | 'admin'): Promise<Partial<User> | null> {
    const userRepository = this.getRepository();
    await userRepository.update(id, { role });
    const updatedUser = await userRepository.findOne({ where: { id } });
    
    if (updatedUser) {
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    }
    return null;
  }

  // Delete user
  async deleteUser(id: string): Promise<boolean> {
    const result = await this.getRepository().delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async saveUser(userData: Partial<User>): Promise<User> {
    const user = this.getRepository().create(userData);
    return this.getRepository().save(user);
  }

  async findByEmail(email: string, includePassword: boolean = false): Promise<User | null> {
    const user = await this.getRepository().findOne({ where: { email } });
    if (!user) return null;
    
    if (!includePassword) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }
    return user;
  }

  async findById(id: string): Promise<Partial<User> | null> {
    const user = await this.getRepository().findOne({ where: { id } });
    if (!user) return null;
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async create(userData: Partial<IBaseUser>): Promise<User> {
    const user = this.getRepository().create(userData);
    return this.getRepository().save(user);
  }

  async updateResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await this.getRepository().update(userId, {
      resetPasswordToken: token,
      resetPasswordExpires: expires
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.getRepository().findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: MoreThan(new Date())
      }
    });
  }

  async resetPassword(userId: string, hashedPassword: string): Promise<void> {
    await this.getRepository().update(userId, {
      password: hashedPassword,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined
    });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.getRepository().findOne({
      where: { emailVerificationToken: token }
    });
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.getRepository().update(userId, {
      emailVerified: true,
      emailVerificationToken: undefined
    });
  }
}
