# 🎓 Editron - Educational Platform with Code Editor

A comprehensive educational platform that combines learning resources, collaborative coding, and AI-powered evaluations. Built with React, Node.js, Python, and Docker.

![Platform Preview](https://img.shields.io/badge/Platform-Educational-blue)
![Frontend](https://img.shields.io/badge/Frontend-React%2018-61dafb)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Python-green)
![Database](https://img.shields.io/badge/Database-SQLite-blue)
![Code%20Execution](https://img.shields.io/badge/Code%20Execution-Docker-2496ed)

## ✨ Features

### 👤 User Management
- **Authentication**: Secure login/register with JWT tokens
- **User Profiles**: Comprehensive student/instructor profiles
- **Role-based Access**: Different permissions for students, instructors, and admins
- **Session Management**: Persistent user sessions across the platform

### 💻 Code Editor & Collaboration
- **Multi-language Support**: Python, JavaScript, Go, C++, Java, Rust
- **Real-time Collaboration**: Create and join coding rooms
- **Code Execution**: Run code directly in secure Docker containers
- **Session Management**: Save and resume coding sessions
- **Live Terminal**: Shared terminal access for collaborative debugging
- **VS Code-like Interface**: Professional code editing experience
- **🆕 Local Storage**: Save, load, and manage files locally in the browser
  - Save individual files and entire projects
  - Import/export files from/to device
  - Recent files quick access
  - Storage usage monitoring
  - No server dependency for file persistence

### 📚 Educational Content
- **Digital Library**: Browse and read educational books with thumbnails
- **Video Learning**: Access video tutorials and lectures
- **AI Evaluations**: Take quizzes and get AI-powered feedback
- **Content Management**: Upload and organize educational materials

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Themes**: Customizable interface themes
- **Sidebar Navigation**: Modern left-side navigation
- **Beautiful Cards**: Engaging content presentation
- **Real-time Notifications**: Toast messages for user feedback

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS with custom components
- **Routing**: React Router for navigation
- **State Management**: React Context API
- **Form Handling**: React Hook Form with Yup validation
- **HTTP Client**: Axios with interceptors

### Backend APIs

#### Api1 - Code Editor API (Port 3003)
- **Tech Stack**: Node.js, Express, TypeScript, Socket.IO
- **Features**: Code execution, room management, Docker integration
- **Database**: SQLite for session and room data
- **Real-time**: WebSocket connections for collaboration

#### Api2 - User Management API (Port 5000)  
- **Tech Stack**: Node.js, Express, TypeScript, TypeORM
- **Features**: Authentication, user profiles, JWT tokens
- **Database**: SQLite for user data
- **Security**: bcrypt password hashing, rate limiting

#### Api3 - Educational Platform API (Port 8000)
- **Tech Stack**: Python, FastAPI, SQLAlchemy
- **Features**: Books, videos, AI evaluations
- **Database**: SQLite for educational content
- **AI Integration**: Google Generative AI for evaluations

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.9+ ([Download](https://python.org/downloads/))  
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/Editron.git
cd Editron

# Install dependencies
npm install
cd Api1 && npm install && npm run build && cd ..
cd Api2 && npm install && npm run build && cd ..  
cd Api3 && pip install -r requirements.txt && cd ..

# Start all services
start-all.bat  # Windows
# or
./start-all.sh  # Linux/Mac
```

### Access the Application
- **Frontend**: http://localhost:5178
- **API Documentation**: http://localhost:8000/docs
- **Code Editor API**: http://localhost:3003
- **User Management API**: http://localhost:5000

## 📖 Documentation

- **[Complete Setup Guide](SETUP_GUIDE.md)** - Detailed installation and configuration
- **[Quick Start Guide](QUICK_START.md)** - Get running in 5 minutes
- **[Setup for Other PCs](SETUP_FOR_OTHER_PC.md)** - Non-technical user guide
- **[GitHub Upload Guide](GITHUB_UPLOAD_GUIDE.md)** - How to upload to GitHub

## 🛠️ Development

### Frontend Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
```

### API Development
```bash
# Code Editor API (Api1)
cd Api1
npm run dev          # Start with auto-reload
npm run build        # Compile TypeScript

# User Management API (Api2)  
cd Api2
npm run dev          # Start with auto-reload
npm run build        # Compile TypeScript

# Educational Platform API (Api3)
cd Api3
uvicorn app.main:app --reload  # Start with auto-reload
```

## 🐳 Docker Integration

The platform uses Docker for secure code execution:
- **Multi-language Containers**: Python, Node.js, Go, C++, Java, Rust
- **Isolated Execution**: Each code session runs in a separate container
- **Resource Management**: CPU and memory limits for safety
- **Shared Workspaces**: Collaborative coding in shared containers

## 🎯 Key Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 18 + TypeScript | User interface |
| **Build Tool** | Vite | Fast development and building |
| **Styling** | Tailwind CSS | Responsive design |
| **Backend** | Node.js + Express | API services |
| **Database** | SQLite | Data persistence |
| **Code Execution** | Docker | Secure code running |
| **Real-time** | Socket.IO | Live collaboration |
| **AI** | Google Generative AI | Educational evaluations |

## 📱 Screenshots

### Modern Dashboard
- Clean, professional interface with sidebar navigation
- Real-time room status and user management
- Responsive design for all screen sizes

### Code Editor
- VS Code-like interface with syntax highlighting
- Multi-language support with Docker execution
- Real-time collaboration features

### Educational Content
- Beautiful book and video galleries with thumbnails
- Advanced search and filtering capabilities
- AI-powered quizzes and evaluations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** for the amazing frontend framework
- **Vite Team** for the lightning-fast build tool
- **Tailwind CSS** for the utility-first styling
- **Docker** for containerization technology
- **FastAPI** for the modern Python web framework

## 📞 Support

If you encounter any issues:
1. Check the [Setup Guide](SETUP_GUIDE.md) for troubleshooting
2. Look through existing [Issues](https://github.com/yourusername/Editron/issues)
3. Create a new issue with detailed information

---

**Built with ❤️ for education and collaborative learning**
- **AI Evaluations**: Get AI-powered feedback on text, code, and quizzes
- **Content Management**: Teachers can upload and manage educational resources

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: React Context + useReducer
- **Form Handling**: React Hook Form with Yup validation
- **HTTP Client**: Axios with interceptors
- **Notifications**: React Hot Toast
- **UI Components**: Custom components with Headless UI

## 🔧 Setup & Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure API endpoints**
   Update the API base URLs in `src/services/apiClient.ts`

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
    ...reactDom.configs.recommended.rules,
  },
})
```
