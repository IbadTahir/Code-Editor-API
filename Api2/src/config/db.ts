import { DataSource } from 'typeorm';
import { User } from '../entity/User';

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'test.sqlite',
  entities: [User],
  synchronize: true,
  logging: process.env.NODE_ENV === 'development'
});

class Database {
  private static instance: Database;
  private connection: DataSource | null = null;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
  async connect(): Promise<void> {
    try {
      if (this.connection?.isInitialized) {
        console.log('Database already connected');
        return;
      }
      
      this.connection = await AppDataSource.initialize();
      
      // Verify connection by running a test query
      await this.connection.query('SELECT 1');
      console.log('SQLite Database Connected');
    } catch (error) {
      this.connection = null;
      console.error('Error connecting to SQLite:', error);
      throw error; // Let the caller handle the error
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connection?.isInitialized) {
        await this.connection.destroy();
        this.connection = null;
        console.log('Database connection closed');
      }
    } catch (error) {
      console.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  getConnection(): DataSource | null {
    return this.connection;
  }
}

export const db = Database.getInstance();
export const connectDB = () => db.connect();
