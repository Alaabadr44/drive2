
import { AppDataSource } from "./src/config/data-source";
import { User } from "./src/entities/User";
import { Screen } from "./src/entities/Screen";

async function debug() {
    await AppDataSource.initialize();
    const userRepository = AppDataSource.getRepository(User);
    const screenRepository = AppDataSource.getRepository(Screen);

    const email = "test@kiosk.com";
    const user = await userRepository.findOne({ where: { email }, relations: ['screen'] });
    
    if (user) {
        console.log("Found User:");
        console.log("ID:", user.id);
        console.log("Email:", user.email);
        console.log("Username:", user.username);
        console.log("Screen ID:", user.screenId);
        console.log("Role:", user.role);
    } else {
        console.log("No user found with email:", email);
    }

    const screens = await screenRepository.find();
    console.log("\nAll Screens:");
    screens.forEach(s => console.log(`- ${s.name} (${s.id})`));

    process.exit(0);
}

debug().catch(error => {
    console.error(error);
    process.exit(1);
});
