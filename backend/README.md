# Touch Based Ordering Kiosk System

## Setup & Installation

### Prerequisites

- Docker & Docker Compose

### Getting Started

1. **Clone the repository** (ensure `TENANTS` folder is included).
2. **Start the environment**:
   ```bash
   docker-compose up -d --build
   ```
3. **Seed the Database**:
   The database needs to be populated with initial data (Super Admin, Screens, Restaurants from `TENANTS` folder). This is not automatic on startup.

   Run the following command after the containers are up:

   ```bash
   docker-compose exec app npm run seed
   ```

   _This will create the default admin, generate 6 screens, and import restaurants from the `TENANTS` directory._

### Credentials

After seeding, credentials for screens and restaurants will be saved to `screens_credentials.txt` in the root directory.
