
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import * as bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load env vars
dotenv.config({ path: path.join(__dirname, "../../.env") });

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/kiosk_db",
  entities: [path.join(__dirname, "../entities/*.ts")], // Dynamic entity loading
  synchronize: false, // Don't sync schema, just data
});

async function restorePasswords() {
  try {
    await AppDataSource.initialize();
    console.log("Database connected.");

    const userRepository = AppDataSource.getRepository(User);

    // Path to credentials file - try multiple locations
    const possiblePaths = [
        path.join(process.cwd(), '../../../credentials_restored.txt'), // From src/scripts/ to root
        path.join(process.cwd(), '../../credentials_restored.txt'), // From dist/scripts/ to root
        path.join(process.cwd(), 'credentials_restored.txt'), // Root execution
        '/app/credentials_restored.txt' // Docker container
    ];

    let credPath = '';
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            credPath = p;
            console.log(`Found credentials file at: ${credPath}`);
            break;
        }
    }

    if (!credPath) {
        console.error("Could not find credentials_restored.txt");
        process.exit(1);
    }

    const content = fs.readFileSync(credPath, 'utf8');
    const lines = content.split('\n');

    console.log("Parsing credentials file...");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for Email lines
        if (line.toLowerCase().startsWith('email:')) {
            const email = line.substring(6).trim();
            
            // Look for corresponding Password in next line
            if (i + 1 < lines.length) {
                const passLine = lines[i+1].trim();
                if (passLine.startsWith('Password:')) {
                    const password = passLine.substring(9).trim();
                    
                    if (email && password) {
                         // Find user by email
                         const user = await userRepository.findOne({ where: { email } });
                         
                         if (user) {
                             // Update password
                             const hash = await bcrypt.hash(password, 10);
                             user.passwordHash = hash;
                             await userRepository.save(user);
                             console.log(`✅ Updated password for: ${email}`);
                         } else {
                             console.warn(`⚠️  User not found for email: ${email}`);
                         }
                    }
                }
            }
        }
    }

    console.log("Password restoration complete.");
    await AppDataSource.destroy();

  } catch (error) {
    console.error("Error restoring passwords:", error);
    process.exit(1);
  }
}

restorePasswords();
