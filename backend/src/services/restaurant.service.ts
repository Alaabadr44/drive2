import { AppDataSource } from '../config/data-source';
import { Restaurant, RestaurantStatus } from '../entities/Restaurant';
import { Menu } from '../entities/Menu';
import { User, Role } from '../entities/User';
import bcrypt from 'bcryptjs';
import { LockService } from './lock.service';

export class RestaurantService {
  private repository = AppDataSource.getRepository(Restaurant);
  private userRepository = AppDataSource.getRepository(User);
  private menuRepository = AppDataSource.getRepository(Menu);

  async findAll(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.repository.find({
      where,
      order: { nameEn: 'ASC' },
      relations: { screenConfigs: true, users: true, menus: true } // Added menus relation
    });
  }

  async findById(id: string) {
    return this.repository.findOne({
      where: { id },
      relations: { 
        menus: true, 
        users: true,
        screenConfigs: {
          screen: true
        }
      },
    });
  }

  async create(data: any) {
    // Extract user data and menu images from payload
    const { email, password, menuImageUrls, ...restaurantData } = data;
    
    // Create Restaurant
    const restaurant = this.repository.create(restaurantData as Partial<Restaurant>);
    const savedRestaurant = await this.repository.save(restaurant);

    // Handle Menu Images
    if (menuImageUrls && Array.isArray(menuImageUrls)) {
      const menuEntities = menuImageUrls.map(url => this.menuRepository.create({
        imageUrl: url,
        restaurantId: savedRestaurant.id
      }));
      await this.menuRepository.save(menuEntities);
    }

    // If email and password provided, create a Restaurant User
    if (email && password) {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = this.userRepository.create({
            email,
            username: email, // Use email as username for uniqueness
            passwordHash,
            role: Role.RESTAURANT,
            restaurantId: savedRestaurant.id 
        });
        await this.userRepository.save(user);
    }

    return this.findById(savedRestaurant.id);
  }

  async update(id: string, data: any) {
    const { email, password, menuImageUrls, ...updateData } = data;
    
    // Update Restaurant entity
    if (Object.keys(updateData).length > 0) {
      await this.repository.update(id, updateData);
    }

    // Handle Menu Images (Syncing)
    if (menuImageUrls && Array.isArray(menuImageUrls)) {
      // For simplicity, we'll replace all menu images. 
      // In a production app, you might want to only delete specific ones.
      await this.menuRepository.delete({ restaurantId: id });
      
      const menuEntities = menuImageUrls.map(url => this.menuRepository.create({
        imageUrl: url,
        restaurantId: id
      }));
      await this.menuRepository.save(menuEntities);
    }

    // Sync User credentials
    if (email || password) {
        try {
            let user = await this.userRepository.findOne({ where: { restaurantId: id } });
            
            // Fallback: search by email if restaurantId link is missing
            if (!user && email) {
                user = await this.userRepository.findOne({ where: { email } });
                if (user) {
                    user.restaurantId = id; // Link existing user to this restaurant
                    console.log(`[RestaurantService] Linked existing user ${user.id} to restaurant ${id} via email ${email}`);
                }
            }

            if (user) {
                if (email) {
                    user.email = email;
                    user.username = email; // Keep username in sync with email
                }
                if (password) user.passwordHash = await bcrypt.hash(password, 10);
                await this.userRepository.save(user);
                console.log(`[RestaurantService] User credentials synced for restaurant ${id}`);
            } else if (email && password) {
                 // Create user if it doesn't exist
                 const passwordHash = await bcrypt.hash(password, 10);
                 const newUser = this.userRepository.create({
                     email,
                     username: email,
                     passwordHash,
                     role: Role.RESTAURANT,
                     restaurantId: id 
                 });
                 await this.userRepository.save(newUser);
                 console.log(`[RestaurantService] User created for restaurant ${id}`);
            }
        } catch (error: any) {
            console.error(`[RestaurantService] Failed to sync user credentials for restaurant ${id}:`, error);
            throw new Error(`User synchronization failed: ${error.message}`);
        }
    }

    return this.repository.findOne({ where: { id } });
  }

  async findAssignedScreens(restaurantId: string): Promise<string[]> {
    const restaurant = await this.repository.findOne({
      where: { id: restaurantId },
      relations: { screenConfigs: true }
    });
    
    if (!restaurant || !restaurant.screenConfigs) {
      return [];
    }

    return restaurant.screenConfigs.map(config => config.screenId);
  }

  async delete(id: string) {
    // Delete associated users first (since no cascade on User entity)
    const users = await this.userRepository.find({ where: { restaurantId: id } });
    if (users.length > 0) {
        await this.userRepository.remove(users);
    }
    return this.repository.delete(id);
  }

  async resetStatus(id: string) {
    // 1. Force Release Redis Lock
    await LockService.forceReleaseLock(id);

    // 2. Reset Status in DB
    await this.repository.update(id, { status: RestaurantStatus.AVAILABLE });

    return this.repository.findOne({ where: { id } });
  }
}
