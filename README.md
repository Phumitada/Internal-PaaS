# Internal PaaS

## 🚀 Internal Platform as a Service

A self-hosted PaaS solution for deploying and managing applications internally. Built with React, Express, PostgreSQL, Redis, and Docker - perfect for teams who want to control their own deployment infrastructure.

## ✨ Features

### 🎯 Application Management
- **Git-based Deployments** - Connect your repositories and deploy with a single click
- **Build System** - Automated build pipeline with configurable runtimes
- **Container Orchestration** - Docker container management for each application
- **Custom Domains** - Assign custom domains to your applications
- **Port Configuration** - Configure application ports dynamically

### 🔐 Authentication & Security
- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access** - User and admin roles
- **Protected Routes** - Middleware-protected API endpoints
- **Refresh Tokens** - Automatic token refresh for seamless sessions

### 🔄 CI/CD Integration
- **Webhook Support** - Git webhook integration for automatic deployments
- **Build Queues** - Redis-powered job queue with BullMQ
- **Deploy History** - Track deployment status and logs
- **Rollback Support** - Easy rollback to previous deployments

### 📊 Monitoring & Management
- **Real-time Status** - Track application status (IDLE, BUILDING, RUNNING, STOPPED, ERROR)
- **Container Management** - Start, stop, and monitor Docker containers
- **Deploy Logs** - View build and deployment logs
- **Health Checks** - API health monitoring

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful UI components
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Axios** - HTTP client with interceptors

### Backend
- **Express.js** - Fast and minimalist web framework
- **TypeScript** - Type-safe backend development
- **Prisma** - Modern ORM for PostgreSQL
- **PostgreSQL** - Relational database
- **Redis** - In-memory data store for queues
- **BullMQ** - Redis-based queue for background jobs
- **Dockerode** - Docker API for container management
- **Simple Git** - Git operations for deployments
- **JWT** - JSON Web Token authentication
- **Zod** - Schema validation

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **PostgreSQL 15** - Database
- **Redis 7** - Cache and queue

## 📁 Project Structure

```
Internal-PaaS/
├── 📁 client/                 # React frontend
│   ├── 📁 src/
│   │   ├── 📁 components/     # Reusable components
│   │   ├── 📁 hooks/          # Custom React hooks
│   │   ├── � layout/         # Layout components
│   │   ├── 📁 pages/          # Page components
│   │   ├── � stores/         # Zustand state stores
│   │   ├── � api/            # API client and services
│   │   └── � utils/          # Utility functions
│   ├── � package.json
│   └── 📄 vite.config.ts
├── 📁 server/                 # Express backend
│   ├── 📁 controllers/        # Route controllers
│   ├── � routes/            # API routes
│   ├── � services/          # Business logic
│   ├── � middleware/        # Express middleware
│   ├── � queues/            # BullMQ job queues
│   ├── 📁 workers/           # Background job workers
│   ├── 📁 prisma/            # Database schema and migrations
│   ├── 📁 lib/               # Shared libraries
│   ├── 📁 types/             # TypeScript types
│   ├── 📁 validator/         # Request validation schemas
│   └── 📄 index.ts           # Server entry point
├── 📄 docker-compose.yml     # Docker services configuration
└── 📄 README.md
```

## � Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Internal-PaaS
   ```

2. **Start infrastructure services**
   ```bash
   docker-compose up -d
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

6. **Start backend server**
   ```bash
   npm run dev
   ```

7. **Install frontend dependencies**
   ```bash
   cd ../client
   npm install
   ```

8. **Start frontend development server**
   ```bash
   npm run dev
   ```

9. **Access the application**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5001`

## 🔧 Configuration

### Environment Variables

#### Server (.env)
```env
DATABASE_URL="postgresql://admin:password123@localhost:5432/appdb"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=5001
```

#### Client (.env)
```env
VITE_API_URL=http://localhost:5001/api
```

## 📊 Database Schema

The application uses the following main entities:

- **User** - User accounts with authentication
- **App** - Application configurations and metadata
- **Deploy** - Deployment records and logs
- **Container** - Docker container information

## 🔐 Authentication Flow

1. **Registration** - Users create accounts with email/password
2. **Login** - Credentials exchanged for JWT access and refresh tokens
3. **Token Refresh** - Automatic refresh using refresh tokens
4. **Protected Access** - API routes protected by authentication middleware

## 🚢 Deployment Workflow

1. **Create App** - Register a new application with repository URL
2. **Configure** - Set runtime, port, and domain settings
3. **Deploy** - Trigger build and deployment
4. **Build** - Worker clones repo, builds Docker image
5. **Run** - Container starts with configured settings
6. **Monitor** - Track status and logs in dashboard

## 🎨 Frontend Features

- **Dashboard** - Overview of all applications
- **App Management** - Create, edit, delete applications
- **Deploy History** - View deployment logs and status
- **Container Control** - Start/stop containers
- **Responsive Design** - Works on desktop and mobile
- **Dark Mode** - Toggle between light/dark themes

## � API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Applications
- `GET /api/app` - Get all user applications
- `POST /api/app` - Create new application
- `GET /api/app/:id` - Get application details
- `PUT /api/app/:id` - Update application
- `DELETE /api/app/:id` - Delete application
- `POST /api/app/:id/deploy` - Trigger deployment

### Webhooks
- `POST /api/webhook` - Git webhook handler

## 🐳 Docker Services

The project includes Docker Compose configuration for:

- **PostgreSQL 15** - Primary database
- **Redis 7** - Cache and job queue

## 📝 Development

### Backend Development
```bash
cd server
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript
npm run studio       # Open Prisma Studio
```

### Frontend Development
```bash
cd client
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## 🚀 Production Deployment

### Build Frontend
```bash
cd client
npm run build
```

### Build Backend
```bash
cd server
npm run build
```

### Start Production Services
```bash
docker-compose up -d
cd server
node dist/index.js
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for your internal PaaS needs!

## � Acknowledgments

- Built with modern web technologies
- Inspired by platforms like Heroku, Vercel, and Railway
- Designed for internal team deployment needs