import { AppDataSource } from '../config/data-source';
import { Screen } from '../entities/Screen';
import { ScreenRestaurantConfig } from '../entities/ScreenRestaurantConfig';
import { User, Role } from '../entities/User';
import bcrypt from 'bcryptjs';

export class ScreenService {
  private repository = AppDataSource.getRepository(Screen);
  private configRepository = AppDataSource.getRepository(ScreenRestaurantConfig);
  private userRepository = AppDataSource.getRepository(User);

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.repository.findAndCount({
      relations: {
        users: true,
        restaurantConfigs: {
          restaurant: {
            users: true,
            menus: true
          },
        },
      },
      skip,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async unassignRestaurant(screenId: string, restaurantId: string) {
      return this.configRepository.delete({ screenId, restaurantId });
  }

  async findById(id: string) {
    return this.repository.findOne({
      where: { id },
      relations: {
        users: true,
        restaurantConfigs: {
          restaurant: {
            menus: true,
            users: true
          },
        },
      },
    });
  }

  async create(data: any) {
      const { email, password, ...screenData } = data;
      const screen = this.repository.create(screenData as Partial<Screen>);
      const savedScreen = await this.repository.save(screen);
  
      if (email && password) {
          const passwordHash = await bcrypt.hash(password, 10);
          const user = this.userRepository.create({
              email,
              username: email, // Use email as username for uniqueness
              passwordHash,
              role: Role.SCREEN,
              screenId: savedScreen.id
          });
          await this.userRepository.save(user);
      }
  
      return savedScreen;
  }

  async assignRestaurant(screenId: string, restaurantId: string, isVisibleOnScreen: boolean) {
    const existing = await this.configRepository.findOne({
      where: { screenId, restaurantId },
    });

    if (existing) {
      existing.isVisibleOnScreen = isVisibleOnScreen;
      return this.configRepository.save(existing);
    } else {
      const config = this.configRepository.create({
        screenId,
        restaurantId,
        isVisibleOnScreen,
      });
      return this.configRepository.save(config);
    }
  }

  async update(id: string, data: any) {
    const { email, password, ...updateData } = data;

    // Update Screen entity
    await this.repository.update(id, updateData);

    // Sync User credentials
    if (email || password) {
        try {
            let user = await this.userRepository.findOne({ where: { screenId: id } });
            
            // Fallback: search by email if screenId link is missing
            if (!user && email) {
                user = await this.userRepository.findOne({ where: { email } });
                if (user) {
                    user.screenId = id; // Link existing user to this screen
                    console.log(`[ScreenService] Linked existing user ${user.id} to screen ${id} via email ${email}`);
                }
            }

            if (user) {
                if (email) {
                    user.email = email;
                    user.username = email; // Keep username in sync with email
                }
                if (password) user.passwordHash = await bcrypt.hash(password, 10);
                await this.userRepository.save(user);
                console.log(`[ScreenService] User credentials synced for screen ${id}`);
            } else if (email && password) {
                 // Create user if it doesn't exist
                 const passwordHash = await bcrypt.hash(password, 10);
                 const newUser = this.userRepository.create({
                     email,
                     username: email,
                     passwordHash,
                     role: Role.SCREEN,
                     screenId: id
                 });
                 await this.userRepository.save(newUser);
                 console.log(`[ScreenService] User created for screen ${id}`);
            }
        } catch (error: any) {
            console.error(`[ScreenService] Failed to sync user credentials for screen ${id}:`, error);
            // Re-throw or throw a more descriptive error so the controller can return 500
            throw new Error(`User synchronization failed: ${error.message}`);
        }
    }

    return this.repository.findOne({ 
        where: { id },
        relations: {
            users: true,
            restaurantConfigs: {
              restaurant: {
                menus: true,
                users: true
              },
            },
        },
    });
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}
