import { AppDataSource } from '../config/data-source';
import { Restaurant } from '../entities/Restaurant';
import { Screen } from '../entities/Screen';

export class DashboardService {
  private restaurantRepository = AppDataSource.getRepository(Restaurant);
  private screenRepository = AppDataSource.getRepository(Screen);

  async getStats() {
    const totalRestaurants = await this.restaurantRepository.count();
    const activeScreens = await this.screenRepository.count({
      where: { isActive: true }
    });

    return {
      totalRestaurants,
      activeScreens,
      systemStatus: 'health'
    };
  }
}
