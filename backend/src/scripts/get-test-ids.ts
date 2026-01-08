console.log("Starting get-ids script...");
import { AppDataSource } from "../config/data-source";
import { Restaurant } from "../entities/Restaurant";
import { Screen } from "../entities/Screen";

async function getIds() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const restaurantRepository = AppDataSource.getRepository(Restaurant);
        const screenRepository = AppDataSource.getRepository(Screen);

        const restaurant = await restaurantRepository.findOne({ where: { nameEn: "Burger King" } });
        const screen = await screenRepository.findOne({ where: { name: "Main Entrance Kiosk" } });

        if (!restaurant || !screen) {
            console.error("Test entities not found. Run 'npm run seed' first.");
            process.exit(1);
        }

        const output = JSON.stringify({
            restaurantId: restaurant.id,
            screenId: screen.id
        }, null, 2);
        
        const fs = require('fs');
        const path = '/Users/alaabedr/Development/node js/backend/Touch Based Ordering Kiosk System/test_ids.json';
        fs.writeFileSync(path, output);
        console.log("Ids written to " + path);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

getIds();
