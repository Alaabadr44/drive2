import { AppDataSource } from "../config/data-source";
import { User, Role } from "../entities/User";
import { Restaurant, RestaurantStatus } from "../entities/Restaurant";
import { Screen } from "../entities/Screen";
import { Menu } from "../entities/Menu";
import { ScreenRestaurantConfig } from "../entities/ScreenRestaurantConfig";
import bcrypt from "bcryptjs";
import * as fs from 'fs';
import * as path from 'path';

async function seed() {
  try {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }
    console.log("Data source initialized for seeding...");

    const userRepository = AppDataSource.getRepository(User);
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const screenRepository = AppDataSource.getRepository(Screen);
    const menuRepository = AppDataSource.getRepository(Menu);
    const screenConfigRepository = AppDataSource.getRepository(ScreenRestaurantConfig);
    
    // START: Clear existing data
    console.log("⚠️ Clearing existing data...");
    
    // Clear CallSession first (using query to avoid import issues if any, or entity name)
    try {
        await AppDataSource.query('DELETE FROM "call_session"'); 
    } catch (e: any) {
        console.log("Note: call_session table might not exist or empty", e.message);
    }

    // Delete users with specific roles
    await userRepository.delete({ role: Role.SCREEN });
    await userRepository.delete({ role: Role.RESTAURANT });

    // Use clear() for full table wipe or query to avoid "empty criteria" error
    // screenRepository.delete({}) -> failing
    await AppDataSource.query('DELETE FROM "screen_restaurant_config"'); // Clear config first
    await AppDataSource.query('DELETE FROM "screen"'); 
    // Delete menus before restaurants to avoid FK constraints
    await AppDataSource.query('DELETE FROM "menu"');
    await AppDataSource.query('DELETE FROM "restaurant"');
    
    console.log("✅ Data cleared.");
    // END: Clear existing data

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public/uploads/restaurants');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log(`✅ Created uploads directory: ${uploadsDir}`);
    }

    // 1. Create Super Admin
    const adminEmail = "admin@example.com";
    const existingAdmin = await userRepository.findOne({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash("admin123", 10);
      const admin = userRepository.create({
        email: adminEmail,
        username: "System Admin",
        passwordHash,
        role: Role.SUPER_ADMIN,
      });
      await userRepository.save(admin);
      console.log("✅ Super Admin created: admin@example.com / admin123");
    }

    // 2. Create 6 Screens (Line 1 - Line 6)
    console.log("Creating 6 Screens...");
    const screenPasswordHash = await bcrypt.hash("12345678", 10);
    // Credentials header
    let credentialsOutput = "Screen Credentials\n";

    const createdScreens: Screen[] = [];

    for (let i = 1; i <= 6; i++) {
        const screenName = `line ${i}`;
        const userEmail = `line${i}@waterway.com`;

        // Create Screen
        const screen = screenRepository.create({
            name: screenName,
            isActive: true,
        });
        const savedScreen = await screenRepository.save(screen);
        createdScreens.push(savedScreen);

        // Create User for Screen
        const user = userRepository.create({
            email: userEmail,
            username: screenName,
            passwordHash: screenPasswordHash,
            role: Role.SCREEN,
            screenId: savedScreen.id
        });
        await userRepository.save(user); // No check needed as we cleared DB
        console.log(`✅ Created ${screenName} with user ${userEmail}`);

        credentialsOutput += `\nScreen ${i}:\nEmail: ${userEmail}\nPassword: 12345678\n`;
    }

    // 3. Create Restaurants from TENANTS directory
    console.log("Creating Restaurants from TENANTS...");
    credentialsOutput += "\n\nRestaurant Credentials\n";
    
    const tenantsPath = path.join(__dirname, '../../TENANTS');
    
    // Track Created Restaurants for Assignment
    const targetRestaurantNames = ['DARS', 'SAINTS', 'DAILY DOSE', 'NUDE BAKERY', 'JAIL BIRD', 'MAINE'];
    const createdRestaurantsMap: { [key: string]: Restaurant } = {};

    // Hardcoded Password Map
    const passwordMap: { [key: string]: string } = {
        'DAILY DOSE': 'u94x3n07',
        'DARS': 'wg3or7ne',
        'HOWLIN BIRDS': '4iua4ubh',
        'JAIL BIRD': 'owzmdrp2',
        'LYCHTEE': 'h1avbdw8',
        'MAINE': 'gsuiypk9',
        'MEAT BARTY': 'h5qwpngl',
        'NUDE BAKERY': 'qh55mpqm',
        'PAO': 'qnb7z9ks',
        'SAINTS': 'uppdvje3'
    };

    if (fs.existsSync(tenantsPath)) {
        const tenantFolders = fs.readdirSync(tenantsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const folderName of tenantFolders) {
            // Logic for name and email
            const nameEn = folderName;
            const emailPrefix = folderName.replace(/\s+/g, ''); // Remove spaces
            const email = `${emailPrefix}@RSWaterway.com`;
            const restaurantPath = path.join(tenantsPath, folderName);
            
            // Password Selection
            const password = passwordMap[nameEn] || Math.random().toString(36).slice(-8); 
            const passwordHash = await bcrypt.hash(password, 10);

            // Create Restaurant
            const restaurant = restaurantRepository.create({
                nameEn: nameEn,
                nameAr: nameEn, // Dummy Ar name same as En
                contactPhone: "0000000000",
                status: RestaurantStatus.AVAILABLE
            });
            const savedRestaurant = await restaurantRepository.save(restaurant);
            createdRestaurantsMap[nameEn] = savedRestaurant;

            // Handle Logo
            let logoUrl = "";
            const logoExtensions = ['logo.jpg', 'logo.jpeg', 'logo.png', 'Logo.jpg', 'Logo.png'];
            let foundLogo = false;

            for (const ext of logoExtensions) {
                const srcPath = path.join(restaurantPath, ext);
                if (fs.existsSync(srcPath)) {
                    const destFileName = `${savedRestaurant.id}_logo${path.extname(ext)}`;
                    fs.copyFileSync(srcPath, path.join(uploadsDir, destFileName));
                    // Remove leading slash to avoid double slash issue
                    logoUrl = `uploads/restaurants/${destFileName}`;
                    foundLogo = true;
                    console.log(`\t📸 Found Logo: ${ext}`);
                    break;
                }
            }

            if (foundLogo) {
                await restaurantRepository.update(savedRestaurant.id, { logoUrl });
            }

            // Create User
            const user = userRepository.create({
                email: email,
                username: nameEn,
                passwordHash: passwordHash,
                role: Role.RESTAURANT,
                restaurantId: savedRestaurant.id
            });
            await userRepository.save(user);

            console.log(`✅ Created Restaurant: ${nameEn} (${email})`);
            credentialsOutput += `\nRestaurant: ${nameEn}\nEmail: ${email}\nPassword: ${password}\n`;

            // Handle Menu - Dynamic Scan
            // Check all files in the directory for 'menu' keyword
            const allFiles = fs.readdirSync(restaurantPath);
            const menuFiles = allFiles.filter(file => 
                file.toLowerCase().includes('menu') && 
                /\.(jpg|jpeg|png)$/i.test(file) &&
                !file.startsWith('.') // Ignore hidden files like .DS_Store
            );

            if (menuFiles.length > 0) {
                for (const menuFile of menuFiles) {
                    const srcPath = path.join(restaurantPath, menuFile);
                    const destFileName = `${savedRestaurant.id}_${menuFile.replace(/\s+/g, '_')}`; // Clean filename
                    fs.copyFileSync(srcPath, path.join(uploadsDir, destFileName));
                    const menuUrl = `uploads/restaurants/${destFileName}`;

                    const menu = menuRepository.create({
                        restaurantId: savedRestaurant.id,
                        imageUrl: menuUrl
                    });
                    await menuRepository.save(menu);
                    console.log(`\t✅ Created Menu from ${menuFile}`);
                }
            } else {
                 console.log(`\t⚠️ No menu images found for ${nameEn}`);
            }
        }

        // 4. Assign Restaurants to Screens (Dynamic Distribution)
        console.log("Assigning Restaurants to Screens...");
        
        const allCreatedRestaurants = Object.values(createdRestaurantsMap);
        const halfIndex = Math.ceil(allCreatedRestaurants.length / 2);
        
        const group1 = allCreatedRestaurants.slice(0, halfIndex);
        const group2 = allCreatedRestaurants.slice(halfIndex);
        
        // Assign Group 1 to Lane 1-3
        const targetScreens1 = createdScreens.filter(s => ['line 1', 'line 2', 'line 3'].includes(s.name));
        for (const screen of targetScreens1) {
            for (const restaurant of group1) {
                const config = screenConfigRepository.create({
                    screenId: screen.id,
                    restaurantId: restaurant.id,
                    isVisibleOnScreen: true
                });
                await screenConfigRepository.save(config);
                console.log(`\t🔗 Assigned ${restaurant.nameEn} to ${screen.name}`);
            }
        }

        // Assign Group 2 to Lane 4-6
        const targetScreens2 = createdScreens.filter(s => ['line 4', 'line 5', 'line 6'].includes(s.name));
        for (const screen of targetScreens2) {
             for (const restaurant of group2) {
                const config = screenConfigRepository.create({
                    screenId: screen.id,
                    restaurantId: restaurant.id,
                    isVisibleOnScreen: true
                });
                await screenConfigRepository.save(config);
                console.log(`\t🔗 Assigned ${restaurant.nameEn} to ${screen.name}`);
            }
        }
        
    } else {
        console.warn(`⚠️ TENANTS directory not found at ${tenantsPath}`);
    }

    // Write Credentials to File
    const outputPath = path.join(process.cwd(), 'restaurants_credentials.txt'); // Save to root or specific path? User asked for "resturants credtional same screen file" -> maybe combine?
    // User said: "and store it in resturants credtional same screen file" -> "same screen file" could mean "same file as screens" or "similar file to screens". 
    // Given the previous task made "screens_credentials.txt", I'll overwrite that or create a new "credentials.txt" combining both.
    // The previous request: "make file conation screens emails and password".
    // This request: "store it in resturants credtional same screen file". 
    // I will combine them into "credentials.txt" or overwrite "screens_credentials.txt" with both. 
    // Let's overwrite "screens_credentials.txt" with EVERYTHING.
    const credentialsFile = path.join(process.cwd(), 'screens_credentials.txt');
    fs.writeFileSync(credentialsFile, credentialsOutput);
    console.log(`✅ Credentials saved to ${credentialsFile}`);

    console.log("\n🚀 Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
