import { AppDataSource } from '../config/data-source';
import { Menu } from '../entities/Menu';

export class MenuService {
  private repository = AppDataSource.getRepository(Menu);

  async findAll(restaurantId?: string) {
    const where = restaurantId ? { restaurantId } : {};
    return this.repository.find({
      where,
      relations: { restaurant: true }, // Include restaurant details if needed
      order: { createdAt: 'DESC' }
    });
    
  }

  async findById(id: string) {
    return this.repository.findOne({
      where: { id },
      relations: { restaurant: true },
    });
  }

  async create(data: Partial<Menu>) {
    const menu = this.repository.create(data);
    return this.repository.save(menu);
  }

  async update(id: string, data: Partial<Menu>) {
    await this.repository.update(id, data);
    return this.repository.findOne({ where: { id } });
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}
