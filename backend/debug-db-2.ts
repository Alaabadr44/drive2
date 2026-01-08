
import { AppDataSource } from "./src/config/data-source";
import { User } from "./src/entities/User";
import { Screen } from "./src/entities/Screen";
import fs from "fs";

async function debug() {
    await AppDataSource.initialize();
    const userRepository = AppDataSource.getRepository(User);
    const screenRepository = AppDataSource.getRepository(Screen);

    const email = "test@kiosk.com";
    const screenId = "1b8c632c-09c4-4d7e-838f-2336e22b02e5";
    
    const userByEmail = await userRepository.findOne({ where: { email } });
    const userByScreenId = await userRepository.findOne({ where: { screenId } });
    const screen = await screenRepository.findOne({ where: { id: screenId } });

    const result = {
        email,
        screenId,
        screenFound: !!screen,
        userByEmail: userByEmail ? { id: userByEmail.id, email: userByEmail.email, screenId: userByEmail.screenId } : null,
        userByScreenId: userByScreenId ? { id: userByScreenId.id, email: userByScreenId.email, screenId: userByScreenId.screenId } : null,
    };

    fs.writeFileSync("debug_result.json", JSON.stringify(result, null, 2));
    process.exit(0);
}

debug().catch(error => {
    fs.writeFileSync("debug_error.txt", error.stack);
    process.exit(1);
});
