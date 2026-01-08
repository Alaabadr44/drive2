import { AppDataSource } from '../config/data-source';
import { User, Role } from '../entities/User';
import bcrypt from 'bcryptjs';

export class UserService {
  private repository = AppDataSource.getRepository(User);

  async findAll() {
    return this.repository.find({
      relations: ['restaurant', 'screen'],
      select: {
          id: true,
          email: true,
          username: true,
          role: true,
          restaurantId: true,
          screenId: true,
          createdAt: true,
          updatedAt: true
      }
    });
  }

  async create(data: any) {
    const { email, username, password, role, restaurantId, screenId } = data;
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = this.repository.create({
      email,
      username: username || email,
      passwordHash,
      role: role || Role.USER,
      restaurantId,
      screenId
    });

    const savedUser = await this.repository.save(user);
    
    // Return user without password
    const { passwordHash: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}
