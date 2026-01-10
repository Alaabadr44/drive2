import { AppDataSource } from "../config/data-source";
import { User, Role } from "../entities/User";
import * as fs from 'fs';
import * as path from 'path';

// Known passwords from seed.ts
const PASSWORD_MAP: { [key: string]: string } = {
    // Restaurants
    'DAILY DOSE': 'u94x3n07',
    'DARS': 'wg3or7ne',
    'HOWLIN BIRDS': '4iua4ubh',
    'JAIL BIRD': 'owzmdrp2',
    'LYCHTEE': 'h1avbdw8',
    'MAINE': 'gsuiypk9',
    'MEAT BARTY': 'h5qwpngl',
    'NUDE BAKERY': 'qh55mpqm',
    'PAO': 'qnb7z9ks',
    'SAINTS': 'uppdvje3',
    // Default fallback for new restaurants if not in map (though we can't really guess)
};

const SCREEN_PASSWORD = '12345678';

async function generateScripts() {
    // Get Base URL from args
    const baseUrl = process.argv[2];
    if (!baseUrl) {
        console.error("❌ Please provide the base URL as an argument (e.g. https://192.168.1.182)");
        process.exit(1);
    }
    
    // Remove trailing slash if present
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");

    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        console.log("Data source initialized...");

        const userRepository = AppDataSource.getRepository(User);
        
        // Fetch only Restaurant and Screen users
        const users = await userRepository.find({
            where: [
                { role: Role.RESTAURANT },
                { role: Role.SCREEN }
            ],
            relations: ["restaurant", "screen"]
        });

        if (users.length === 0) {
            console.log("⚠️ No users found to generate scripts for.");
            return;
        }

        const outputDir = path.join(process.cwd(), 'generated_scripts');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        console.log(`Generating scripts in: ${outputDir}`);

        for (const user of users) {
            let password = '';
            let name = '';
            let type = '';

            if (user.role === Role.SCREEN) {
                // All screens have default password from seed
                password = SCREEN_PASSWORD;
                name = user.screen?.name || user.username;
                type = 'Screen';
            } else if (user.role === Role.RESTAURANT) {
                // Look up in map by Restaurant Name (assuming username or restaurant.nameEn matches map keys)
                const restaurantName = user.restaurant?.nameEn || user.username;
                password = PASSWORD_MAP[restaurantName] || 'CHANGE_ME'; 
                name = restaurantName;
                type = 'Restaurant';
            }

            // Sanitize filename
            const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${type}_${safeName}.bat`;
            const filePath = path.join(outputDir, fileName);

            // Construct URL
            const emailEnc = encodeURIComponent(user.email);
            const passEnc = encodeURIComponent(password);
            const loginUrl = `${cleanBaseUrl}/login?email=${emailEnc}&password=${passEnc}&autologin=true`;

            // BAT Content
            const batContent = `@echo off
:: Auto-generated login script for ${name} (${type})
:: Generated on ${new Date().toISOString()}

set "ConfigFile=%~dp0browser_choice.txt"
set "ChromeUserDataDir=%TEMP%\\ChromeKioskUser_${safeName}"

:CHECK_CONFIG
if exist "%ConfigFile%" (
    set /p BROWSER_CHOICE=<"%ConfigFile%"
) else (
    goto :l_ask_browser
)

:l_launch
:: Clean up temp user dir to ensure flags work
rmdir /s /q "%ChromeUserDataDir%" >nul 2>&1

echo Launching Kiosk Mode for ${name}...
if /i "%BROWSER_CHOICE%"=="edge" goto :l_edge
if /i "%BROWSER_CHOICE%"=="chrome" goto :l_chrome

:: If invalid choice in file, ask again
goto :l_ask_browser

:l_ask_browser
cls
echo ==========================================
echo   Select Browser for ${name}
echo ==========================================
echo.
echo [1] Microsoft Edge
echo [2] Google Chrome
echo.
set /p CHOICE="Enter choice (1 or 2): "

if "%CHOICE%"=="1" (
    echo edge > "%ConfigFile%"
    set "BROWSER_CHOICE=edge"
    goto :l_launch
)
if "%CHOICE%"=="2" (
    echo chrome > "%ConfigFile%"
    set "BROWSER_CHOICE=chrome"
    goto :l_launch
)
echo Invalid choice.
goto :l_ask_browser

:l_edge
start msedge --kiosk "${loginUrl}" --edge-kiosk-type=fullscreen --no-first-run --ignore-certificate-errors --user-data-dir="%ChromeUserDataDir%" --use-fake-ui-for-media-stream
exit

:l_chrome
start chrome --kiosk "${loginUrl}" --ignore-certificate-errors --user-data-dir="%ChromeUserDataDir%" --use-fake-ui-for-media-stream
exit
`;

            fs.writeFileSync(filePath, batContent);
            console.log(`✅ Generated: ${fileName}`);
        }

        console.log(`\n🎉 Successfully generated ${users.length} scripts.`);
        process.exit(0);

    } catch (error) {
        console.error("❌ Error generating scripts:", error);
        process.exit(1);
    }
}

generateScripts();
