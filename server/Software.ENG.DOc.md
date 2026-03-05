# Attendance Analyzer - Software Engineering Documentation

**Based on Ian Sommerville's Software Engineering Principles**

---

## Table of Contents

1. [Requirement Engineering](#1-requirement-engineering)
2. [System Modeling](#2-system-modeling)
3. [Architectural Design](#3-architectural-design)
4. [Design & Implementation](#4-design--implementation)
5. [UML Diagrams](#5-uml-diagrams)
6. [User-System Interactions](#6-user-system-interactions)
7. [System-to-System Interactions](#7-system-to-system-interactions)

---

## 1. Requirement Engineering

### 1.1 Functional Requirements

#### FR1: User Authentication & Authorization
- **Description**: System must authenticate users and authorize role-based access
- **Actors**: User, Admin, System
- **Pre-conditions**: User has valid credentials
- **Main Flow**:
  1. User navigates to login page
  2. System displays login form (email, password)
  3. User enters credentials
  4. System validates against database
  5. System generates JWT token
  6. System redirects to dashboard
- **Post-conditions**: User session established with role-based permissions
- **Alternative Flow**: Invalid credentials → Display error message → Retry

#### FR2: Attendance File Upload & Processing
- **Description**: System accepts Excel/CSV files and extracts attendance records
- **Actors**: User, System, Database
- **Acceptance Criteria**:
  - Support .xlsx, .xls, .csv formats
  - Parse multiple files simultaneously
  - Validate data integrity
  - Handle duplicate records
- **Data Requirements**:
  - Student name, ID, email
  - Session date, time
  - Attendance status (present, absent, late)

#### FR3: Attendance Analysis & Scoring
- **Description**: System analyzes attendance patterns and generates scores
- **Algorithm**:
  - Normal attendance: +10 points
  - Late attendance: +5 points
  - Absent: 0 points
  - Configurable scoring parameters
- **Output**: Individual and aggregate statistics
- **Constraints**: Must complete analysis within 5 seconds for 500 records

#### FR4: Report Generation & Export
- **Description**: System generates exportable reports in multiple formats
- **Supported Formats**: CSV, TXT, PDF
- **Report Types**:
  - Individual student analysis
  - Class-wide statistics
  - Attendance trends
- **Customization**: Configurable date ranges, filtering options

#### FR5: Dashboard & Visualization
- **Description**: Real-time display of attendance metrics and charts
- **Components**:
  - Pie charts (distribution)
  - Progress bars (On-time, Late, Absent)
  - Student table with sorting/filtering
  - Individual detail view
- **Refresh Rate**: Real-time with file upload

#### FR6: Settings & Customization
- **Description**: Users can customize scoring rules and appearance
- **Configurable Parameters**:
  - High/Mid/Low score thresholds
  - At-risk threshold
  - Accent color (10 options)
  - Theme preferences
- **Persistence**: Settings saved to localStorage

#### FR7: Role-Based Access Control
- **Admin Features**:
  - User management
  - System configuration
  - Lost & Found module
- **User Features**:
  - Dashboard access
  - File upload
  - Report generation
  - Settings personalization

---

### 1.2 Non-Functional Requirements

| Requirement | Specification |
|------------|---------------|
| **Performance** | File parsing < 2s, Analysis < 5s, UI response < 200ms |
| **Security** | JWT authentication, password hashing, HTTPS only |
| **Scalability** | Support 1000+ concurrent users, 10,000+ student records |
| **Usability** | Intuitive dark UI, keyboard navigation, mobile responsive |
| **Reliability** | 99.5% uptime, automatic error recovery |
| **Maintainability** | Modular architecture, comprehensive logging |
| **Compatibility** | Chrome, Firefox, Safari (latest 2 versions) |
| **Data Persistence** | localStorage backup, optional server-side storage |

---

## 2. System Modeling

### 2.1 Use Case Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Attendance Analyzer System                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User ──────┐                                    Admin ──────┤
│             │                                         │      │
│             ├─> Upload Files ◯                       │      │
│             │                                         │      │
│             ├─> Analyze Attendance ◯                 │      │
│             │         │                              │      │
│             │         └──> View Dashboard ◯          │      │
│             │                                         │      │
│             ├─> View Individual Details ◯            │      │
│             │                                         │      │
│             ├─> Configure Scoring ◯────────┬─────────┤      │
│             │                              │         │      │
│             ├─> Customize Settings ◯       │         │      │
│             │                              │    Manage Users ◯
│             ├─> Export Report ◯            │         │      │
│             │                              │    View Logs ◯  │
│             └─> Search/Filter ◯────────────┴─────────┤      │
│                                                       │      │
│                                              Lost & Found ◯  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Diagram (DFD)

```
Level 0: Context Diagram
═════════════════════════

    ┌──────────────┐
    │   User/Admin │
    └───────┬──────┘
            │ Credentials, Files, Queries
            │
            ▼
    ┌──────────────────────────┐
    │ Attendance Analyzer      │
    │      System              │
    └────────────┬─────────────┘
            │ Reports, Dashboard
            │
            ▼
    ┌──────────────────┐
    │ External Storage │
    │ (localStorage)   │
    └──────────────────┘


Level 1: Main Processes
═══════════════════════

    Files ─────────────────┐
                           │
                      ┌────▼────┐
                      │ 1.0     │
                      │ Parse   │──► Parsed Data
                      │ Files   │
                      └────┬────┘
                           │
                    ┌──────▼──────┐
                    │ 2.0         │
                    │ Analyze     │──► Analysis Results
                    │ Attendance  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ 3.0         │
                    │ Generate    │──► Reports
                    │ Reports     │
                    └────────────┘

    Config ────────────────┐
                           │
                    ┌──────▼──────┐
                    │ 4.0         │
                    │ Manage      │──► Settings
                    │ Settings    │
                    └────────────┘
```

### 2.3 Entity-Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────┐
│                        ENTITIES                              │
├─────────────────────────────────────────────────────────────┤

┌──────────────────┐         ┌──────────────────┐
│      User        │         │    Student       │
├──────────────────┤         ├──────────────────┤
│ id (PK)          │    1:N  │ id (PK)          │
│ email            │◄────────│ name             │
│ password_hash    │         │ email            │
│ role             │         │ role             │
│ created_at       │         │ first_date       │
│ updated_at       │         │ last_date        │
└──────────────────┘         └────────┬─────────┘
                                      │
                                      │ 1:N
                                      │
                         ┌────────────▼──────────┐
                         │    AttendanceRecord   │
                         ├───────────────────────┤
                         │ id (PK)               │
                         │ student_id (FK)       │
                         │ date                  │
                         │ time                  │
                         │ status (normal/late)  │
                         │ minutes_late          │
                         └───────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│    Config        │         │   Settings       │
├──────────────────┤         ├──────────────────┤
│ id (PK)          │         │ id (PK)          │
│ high_threshold   │         │ user_id (FK)     │
│ mid_threshold    │         │ accent_color     │
│ at_risk_level    │         │ theme            │
│ normal_points    │         │ created_at       │
│ late_points      │         │ updated_at       │
└──────────────────┘         └──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│  AnalysisResult  │         │   ExportLog      │
├──────────────────┤         ├──────────────────┤
│ id (PK)          │         │ id (PK)          │
│ student_id (FK)  │         │ user_id (FK)     │
│ score            │         │ format           │
│ normal_count     │         │ timestamp        │
│ late_count       │         │ record_count     │
│ absent_count     │         │ file_name        │
│ generated_at     │         └──────────────────┘
└──────────────────┘
```

### 2.4 State Diagram

```
User Authentication Flow
════════════════════════

                    [Not Authenticated]
                            │
                            │ Navigate to /login
                            ▼
                    ┌─────────────────┐
                    │   Login Page    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Enter Credentials│
                    └────────┬────────┘
                             │
                    ┌────────▼──────────────┐
                    │ Validate Credentials  │
                    └────────┬─────────┬────┘
                             │         │
                   Valid ────┤         ├──── Invalid
                             │         │
                    ┌────────▼────┐   └──────────┐
                    │ Create JWT   │             │
                    │ Session      │      Display Error
                    └────────┬────┘             │
                             │                  │
                    ┌────────▼──────┐           │
                    │  Authenticated│◄──────────┘
                    │  Redirect to  │
                    │  Dashboard    │
                    └────────┬──────┘
                             │
                    [Authenticated]
                             │
                    ┌────────▼──────┐
                    │ Access Routes │
                    │ (Dashboard,   │
                    │  Admin, Help) │
                    └─────────┬──────┘
                              │
                    ┌─────────▼─────────┐
                    │  Click Sign Out   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Clear JWT Token    │
                    │ Redirect to /login │
                    └─────────┬──────────┘
                              │
                    [Not Authenticated]


File Upload & Analysis Flow
═══════════════════════════

    [Idle]
      │
      ├─ Drag & Drop / Click Browse
      │
      ▼
    [File Selected]
      │
      ├─ Validate File Type
      │ (.xlsx, .xls, .csv)
      │
      ├─ YES ──────────────────┐
      │                        │
      ▼                        ▼
    [Files Ready]         [Invalid Format Error]
      │                        │
      ├─ Click "Analyze"       ├─ Display Error Toast
      │                        │
      ▼                        ▼
    [Analyzing]           [Idle]
      │ (isAnalyzing=true)
      │
      ├─ Parse Excel/CSV Data
      ├─ Extract Records
      ├─ Calculate Scores
      │
      ▼
    [Analysis Complete]
      │
      ├─ Update UI
      ├─ Persist Results
      ├─ Display Dashboard
      │
      ▼
    [Ready for Export/View]
      │
      ├─ Export Report
      ├─ View Individual Details
      ├─ Configure Settings
      │
      ▼
    [Idle]
```

---

## 3. Architectural Design

### 3.1 System Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                   ATTENDANCE ANALYZER SYSTEM                  │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐                ┌──────────────────────┐ │
│  │  CLIENT LAYER   │                │  SERVER LAYER        │ │
│  ├─────────────────┤                ├──────────────────────┤ │
│  │                 │                │                      │ │
│  │ ┌─────────────┐ │   HTTP/REST    │ ┌────────────────┐  │ │
│  │ │ React App   │◄──────────────────►│ Express Server │  │ │ 
│  │ │             │ │                │ │                │  │ │
│  │ │ Components: │ │                │ │ Routes:        │  │ │
│  │ │ - Navbar    │ │                │ │ - /api/auth    │  │ │
│  │ │ - Dashboard │ │                │ │ - /api/parse   │  │ │
│  │ │ - Config    │ │                │ │ - /api/analyze │  │ │
│  │ │ - Settings  │ │                │ │ - /api/export  │  │ │
│  │ │ - Help      │ │                │ │ - /api/admin   │  │ │
│  │ │ - Admin     │ │                │ │                │  │ │
│  │ └─────────────┘ │                │ └────────┬───────┘  │ │
│  │                 │                │          │          │ │
│  │ ┌─────────────┐ │                │ ┌────────▼────────┐ │ │
│  │ │ localStorage│ │                │ │ Business Logic  │ │ │
│  │ │ - Settings  │ │                │ │ - Parser        │ │ │
│  │ │ - Caching   │ │                │ │ - Analyzer      │ │ │
│  │ │ - Session   │ │                │ │ - Exporter      │ │ │
│  │ └─────────────┘ │                │ └────────┬────────┘ │ │
│  │                 │                │          │          │ │
│  └─────────────────┘                │ ┌────────▼────────┐ │ │
│                                      │ │ Data Layer      │ │ │
│                                      │ │ - MongoDB/SQL   │ │ │
│                                      │ │ - Authentication│ │ │
│                                      │ │ - Persistence   │ │ │
│                                      │ └─────────────────┘ │ │
│                                      │                      │ │
│                                      └──────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │             EXTERNAL SERVICES                            │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ - File Storage (S3/Cloud)                               │ │
│  │ - Email Service (Nodemailer)                            │ │
│  │ - Analytics (Optional)                                  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│            Frontend Component Hierarchy                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│               App.jsx (Root)                            │
│                 │                                       │
│     ┌───────────┼───────────┬──────────┐              │
│     │           │           │          │              │
│     ▼           ▼           ▼          ▼              │
│  AuthPage    LoginPage   ProtectedRoute              │
│     │                        │                        │
│     │           ┌────────────┼────────────┐           │
│     │           │            │            │           │
│     ▼           ▼            ▼            ▼           │
│              Layout                                    │
│                 │                                      │
│      ┌──────────┼──────────┐                          │
│      │          │          │                          │
│      ▼          ▼          ▼                          │
│   Navbar    Main      Sidebar                         │
│      │                  │                             │
│      │       ┌──────────┼────────────┐               │
│      │       │          │            │               │
│      │       ▼          ▼            ▼               │
│      │   DashboardPage ConfigPanel SettingsPage      │
│      │       │                                        │
│      │   ┌───┼────────────┬──────────┐               │
│      │   │   │            │          │               │
│      │   ▼   ▼            ▼          ▼               │
│      │ FileUpload  PieChart   StudentTable           │
│      │   │                        │                  │
│      │   ▼                        ▼                  │
│      │ ProgressBar        StudentRow                 │
│      │                        │                      │
│      │                        ▼                      │
│      │                  IndividualSection            │
│      │                        │                      │
│      │                   ┌────┼────┐                │
│      │                   │    │    │                │
│      │                   ▼    ▼    ▼                │
│      │                ScoreDisplay AttendanceChart  │
│      │                          DetailTable         │
│      │                                              │
│      └──────────────────────────────────────────────│
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 3.3 Design Patterns Used

| Pattern | Usage | Location |
|---------|-------|----------|
| **MVC** | Separation of concerns | React (View) + Custom Hooks (Controller) |
| **Context API** | Global state management | AuthContext, SettingsContext |
| **Custom Hooks** | Logic reusability | useAuth, useSettings, useAnalysis |
| **Compound Components** | Flexible UI composition | Dashboard sections, Card components |
| **Higher Order Components** | Route protection | ProtectedRoute wrapper |
| **Factory Pattern** | Object creation | Report generators, Export formatters |
| **Strategy Pattern** | Export algorithms | CSV, TXT, PDF export handlers |
| **Observer Pattern** | Event handling | Form submissions, file uploads |
| **Singleton Pattern** | Shared instances | Logger, API client |

---

## 4. Design & Implementation

### 4.1 Frontend Technology Stack

```
React 18.x
├── State Management
│   ├── Context API (Auth, Settings)
│   ├── Local Component State (useState)
│   └── useReducer (Complex logic)
│
├── Routing
│   └── React Router v6
│
├── UI Components
│   ├── Recharts (Pie charts, Bar charts)
│   ├── Lucide Icons (SVG icons)
│   └── Custom styled components
│
├── Data Processing
│   ├── XLSX parser (Excel files)
│   ├── PapaParse (CSV files)
│   └── Custom analysis engine
│
├── Utilities
│   ├── React Hot Toast (Notifications)
│   ├── React Dropzone (File upload)
│   └── jsPDF (PDF export)
│
└── Styling
    ├── Tailwind CSS
    ├── Custom CSS
    └── CSS Variables (theming)
```

### 4.2 Backend Technology Stack (Optional)

```
Node.js + Express
├── Authentication
│   ├── JWT tokens
│   ├── bcrypt (Password hashing)
│   └── cors (Cross-origin)
│
├── Data Processing
│   ├── xlsx (Excel parsing)
│   ├── csv-parse (CSV parsing)
│   └── Custom analysis logic
│
├── Database
│   ├── MongoDB or PostgreSQL
│   ├── Mongoose/Sequelize ORM
│   └── Connection pooling
│
├── File Handling
│   ├── Multer (File uploads)
│   ├── Sharp (Image processing)
│   └── S3 (Cloud storage)
│
├── API Documentation
│   └── Swagger/OpenAPI
│
└── Testing
    ├── Jest (Unit tests)
    ├── Supertest (Integration tests)
    └── Mocha (E2E tests)
```

### 4.3 Key Implementation Details

#### 4.3.1 Authentication Flow

```javascript
// Frontend Implementation
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Login
  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return true;
      }
    } catch (err) {
      console.error('Login failed', err);
      return false;
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return { user, login, logout, isLoading };
};
```

#### 4.3.2 File Parsing Algorithm

```javascript
const parseAttendanceFile = async (file) => {
  const fileExt = file.name.split('.').pop().toLowerCase();
  
  let records = [];
  
  if (fileExt === 'csv') {
    // Parse CSV
    const text = await file.text();
    records = Papa.parse(text, { header: true }).data;
  } else if (['xlsx', 'xls'].includes(fileExt)) {
    // Parse Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    records = XLSX.utils.sheet_to_json(worksheet);
  }
  
  // Normalize and validate records
  return records.map(record => ({
    name: record.Name || record.name,
    email: record.Email || record.email,
    date: new Date(record.Date || record.date),
    time: record.Time || record.time,
    status: normalizeStatus(record.Status || record.status)
  }));
};
```

#### 4.3.3 Attendance Analysis Algorithm

```javascript
const analyzeAttendance = (records, config) => {
  const students = {};
  
  // Group records by student
  records.forEach(record => {
    const key = `${record.name}_${record.email}`;
    if (!students[key]) {
      students[key] = {
        name: record.name,
        email: record.email,
        normal: 0,
        late: 0,
        absent: 0,
        records: []
      };
    }
    
    if (record.status === 'normal') {
      students[key].normal++;
    } else if (record.status === 'late') {
      students[key].late++;
    } else if (record.status === 'absent') {
      students[key].absent++;
    }
    
    students[key].records.push(record);
  });
  
  // Calculate scores
  const studentArray = Object.values(students).map(student => {
    const score = 
      (student.normal * config.normalPoints) +
      (student.late * config.latePoints) +
      (student.absent * 0);
    
    return {
      ...student,
      score,
      scorePercentage: (score / calculateMaxScore(records)) * 100
    };
  });
  
  return studentArray;
};
```

#### 4.3.4 Export Report Generation

```javascript
const exportReport = (students, format, config) => {
  if (format === 'csv') {
    return exportCSV(students);
  } else if (format === 'txt') {
    return exportTXT(students);
  } else if (format === 'pdf') {
    return exportPDF(students);
  }
};

const exportPDF = (students) => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text('Attendance Analysis Report', 10, 10);
  
  doc.setFontSize(11);
  let yPos = 30;
  
  students.forEach((student, index) => {
    doc.text(`${index + 1}. ${student.name}`, 10, yPos);
    doc.text(`Score: ${student.score}/${maxScore}`, 20, yPos + 5);
    doc.text(`On-time: ${student.normal} | Late: ${student.late}`, 20, yPos + 10);
    yPos += 20;
  });
  
  doc.save('attendance_report.pdf');
};
```

---

## 5. UML Diagrams

### 5.1 Class Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   CLASS DIAGRAM                         │
├─────────────────────────────────────────────────────────┤

┌──────────────────────┐
│       User           │
├──────────────────────┤
│ - id: string         │
│ - email: string      │
│ - password: string   │
│ - role: enum         │
│ - createdAt: Date    │
├──────────────────────┤
│ + login()            │
│ + logout()           │
│ + updateProfile()    │
│ + getPermissions()   │
└──────────────────────┘
         △
         │ inherits
         │
    ┌────┴───────┬─────────────┐
    │            │             │
┌───▼────┐  ┌───▼──────┐  ┌──▼──────┐
│ Student│  │ Instructor│  │  Admin  │
├────────┤  ├──────────┤  ├─────────┤
│ - ID   │  │ - Dept   │  │- Access │
│ - Name │  │ - Course │  │ - Logs  │
└────────┘  └──────────┘  └─────────┘


┌──────────────────────────────────┐
│   AttendanceRecord               │
├──────────────────────────────────┤
│ - id: string                     │
│ - studentId: string              │
│ - date: Date                     │
│ - time: Time                     │
│ - status: enum (normal/late)     │
│ - minutesLate: number            │
├──────────────────────────────────┤
│ + validate()                     │
│ + calculatePoints()              │
│ + getStatus()                    │
└──────────────────────────────────┘
         △
         │ composed of
         │
┌────────┴──────────────┐
│                       │
┌──▼──────────┐  ┌──────▼──┐
│ NormalRecord│  │LateRecord│
├─────────────┤  ├──────────┤
│ points: 10  │  │ points: 5│
└─────────────┘  └──────────┘


┌──────────────────────────────────┐
│   AnalysisResult                 │
├──────────────────────────────────┤
│ - id: string                     │
│ - studentId: string              │
│ - totalScore: number             │
│ - normalCount: number            │
│ - lateCount: number              │
│ - absentCount: number            │
│ - percentage: number             │
│ - generatedAt: Date              │
├──────────────────────────────────┤
│ + calculateScore()               │
│ + isAtRisk()                     │
│ + getGrade()                     │
│ + export()                       │
└──────────────────────────────────┘
         △
         │ uses
         │
┌────────┴──────────┐
│                   │
┌──▼───────┐  ┌────▼──┐
│ Scorer   │  │ Grader│
├──────────┤  ├───────┤
│ + score()│  │+grade()│
└──────────┘  └───────┘


┌────────────────────────────────────┐
│      ConfigurationSettings          │
├────────────────────────────────────┤
│ - highScoreThreshold: number       │
│ - midScoreThreshold: number        │
│ - atRiskThreshold: number          │
│ - normalPoints: number             │
│ - latePoints: number               │
│ - maxScore: number                 │
├────────────────────────────────────┤
│ + validateConfig()                 │
│ + applyDefaults()                  │
│ + save()                           │
│ + reset()                          │
└────────────────────────────────────┘


┌────────────────────────────────────┐
│    AppearanceSettings              │
├────────────────────────────────────┤
│ - accentColor: string (10 options) │
│ - theme: enum (dark/light)         │
│ - fontSize: enum                   │
│ - language: string                 │
├────────────────────────────────────┤
│ + applyTheme()                     │
│ + save()                           │
│ + getColorPreset()                 │
└────────────────────────────────────┘


┌────────────────────────────────────┐
│      ReportGenerator               │
├────────────────────────────────────┤
│ - students: Array                  │
│ - format: enum                     │
│ - config: Config                   │
├────────────────────────────────────┤
│ + generate()                       │
│ + validate()                       │
│ + getContent()                     │
└────────────────────────────────────┘
         △
         │ implements
         │
    ┌────┴────────┬──────────┐
    │             │          │
┌───▼──┐  ┌──────▼──┐  ┌───▼──┐
│ CSV  │  │   TXT   │  │ PDF  │
├──────┤  ├─────────┤  ├──────┤
│+gen()│  │ +gen()  │  │+gen()│
└──────┘  └─────────┘  └──────┘
```

### 5.2 Sequence Diagram - User Login

```
User          Browser       AuthService        Database
 │              │               │                 │
 ├──Login────────>               │                 │
 │              │                │                 │
 │              ├─Validate──────>│                 │
 │              │                ├─Query User────>│
 │              │                │                 │
 │              │                │<───User Found──┤
 │              │                │                 │
 │              │                ├─Hash Compare   │
 │              │                │ (bcrypt)       │
 │              │                │                 │
 │              │<───JWT Token───┤                 │
 │              │                │                 │
 │<─Success─────┤                │                 │
 │              │                │                 │
 │              ├─Store Token────>                 │
 │              │ (localStorage)  │                 │
 │              │                 │                 │
 ├─Redirect────>                 │                 │
 │ /dashboard   │                 │                 │
 │              │                 │                 │
```

### 5.3 Sequence Diagram - File Upload & Analysis

```
User          React App      Parser        Analyzer       UI Store
 │                │            │              │              │
 ├─Select File─>  │            │              │              │
 │                │            │              │              │
 │                ├─Validate──> │              │              │
 │                │ (type)      │              │              │
 │                │<─Valid──────┤              │              │
 │                │             │              │              │
 │                ├─Parse File─────────>      │              │
 │                │             │ (XLSX/CSV)  │              │
 │                │<─Records────┤              │              │
 │                │             │              │              │
 │                │             │              ├─Analyze────> │
 │                │             │              │ Calculate    │
 │                │             │              │ Scores       │
 │                │             │              │              │
 │                │             │              ├─Update State>│
 │                │             │              │              │
 │                │<─────────────────────────Results────────┤ │
 │                │                            │              │
 │<─Display───────┤                            │              │
 │ Dashboard      │                            │              │
 │                │                            │              │
```

### 5.4 Sequence Diagram - Report Export

```
User          Dashboard     ExportService    Generator      Browser
 │                │              │              │            │
 ├─Click Export──>│              │              │            │
 │                │              │              │            │
 │                ├─Select Format│              │            │
 │                │              │              │            │
 │                ├─getStudents─>│              │            │
 │                │<─────────────┤              │            │
 │                │              │              │            │
 │                │              ├─Generate────>│            │
 │                │              │ (CSV/TXT/PDF)│            │
 │                │              │              │            │
 │                │              │<─Content────┤            │
 │                │              │              │            │
 │                │              ├──────────Blob───────────>│
 │                │              │              │  Download  │
 │                │              │              │            │
 │                ├─Success Toast│              │            │
 │<─File Downloaded              │              │            │
 │                │              │              │            │
```

---

## 6. User-System Interactions

### 6.1 User Login Interaction Diagram

```
┌─────────────────────────────────────────────────────────┐
│         USER LOGIN INTERACTION FLOW                      │
├─────────────────────────────────────────────────────────┤

START
  │
  ▼
┌─────────────────────┐
│ User visits /login  │
│ or access protected │
│ route (redirect)    │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────────┐
│ System displays Login Form   │
│ ┌──────────────────────────┐ │
│ │ Email: [_____________]   │ │
│ │ Password: [_____________]│ │
│ │ [Login Button]           │ │
│ └──────────────────────────┘ │
└──────┬───────────────────────┘
       │
       ▼ User enters credentials
┌──────────────────────────────┐
│ User clicks "Login"          │
│ System validates inputs      │
└──────┬───────────────────────┘
       │
   ┌───┴─────────────────┐
   │                     │
   ▼ Valid              ▼ Invalid
┌──────────────┐  ┌──────────────────┐
│ Query DB for │  │ Display Error    │
│ user email   │  │ "Invalid email   │
└──────┬───────┘  │  or password"    │
       │          └─────┬────────────┘
       ▼                 │
┌─────────────────────┐  │
│ User found?         │  │
└──┬────────────┬─────┘  │
   │ YES        │ NO     │
   │            │        │
   ▼            ▼        │
Found      Not Found     │
   │            │        │
   │       ┌────┴────────┴─┐
   │       │ Toast Error   │
   │       │ Return to form│
   │       └──────┬────────┘
   │              │
   │              ▼
   │            [BACK TO FORM]
   │
   ▼
┌──────────────────────────────┐
│ Compare password hash        │
│ (bcrypt.compare)             │
└──────┬───────────────────────┘
       │
   ┌───┴────────────┐
   │ Match?        │
   │               │
   ▼ YES           ▼ NO
  Match         Mismatch
   │               │
   │          ┌────┴────────────┐
   │          │ Toast Error     │
   │          │ Return to form  │
   │          └────────┬────────┘
   │                   │
   │                   ▼
   │              [BACK TO FORM]
   │
   ▼
┌──────────────────────────────┐
│ Generate JWT Token           │
│ - Payload: { id, email, role}│
│ - Secret: env.JWT_SECRET     │
│ - Expiry: 24h                │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Store Token in localStorage  │
│ localStorage.setItem(        │
│   'authToken', token         │
│ )                            │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Update AuthContext           │
│ setUser({ id, email, role }) │
│ setIsAuthenticated(true)     │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Display Success Toast        │
│ "Welcome, User!"             │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Redirect to /dashboard       │
│ (Protected Route checks auth)│
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Load Dashboard               │
│ - Fetch stored data          │
│ - Initialize UI              │
│ - Display navigation         │
└──────┬───────────────────────┘
       │
       ▼
END (USER AUTHENTICATED)
```

### 6.2 File Upload & Analysis Interaction

```
┌──────────────────────────────────────────────────────┐
│   FILE UPLOAD & ANALYSIS INTERACTION FLOW             │
├──────────────────────────────────────────────────────┤

START
  │
  ▼
┌────────────────────────────────┐
│ Dashboard Page Loads           │
│ ┌──────────────────────────────┐
│ │  ┌──────────────────────┐    │
│ │  │ Drop files here ────>│    │
│ │  │ or Click to browse   │    │
│ │  └──────────────────────┘    │
│ │  [UPLOAD AREA]               │
│ └──────────────────────────────┘
└────────┬───────────────────────┘
         │
         ▼ User drags file or clicks
┌─────────────────────────────────┐
│ React Dropzone detects file     │
│ Trigger: onDrop or onChange     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ System validates file           │
│ ✓ Type: .xlsx, .xls, .csv      │
│ ✓ Size < 10MB                  │
│ ✓ Not duplicate                │
└────────┬────────────────────────┘
         │
    ┌────┴──────────────────┐
    │                       │
    ▼ Valid                ▼ Invalid
 ┌────────┐          ┌────────────────┐
 │ Add to │          │ Show Error     │
 │ Queue  │          │ Toast          │
 └────┬───┘          │ "Invalid file" │
      │              └─────┬──────────┘
      │                    │
      ▼                    ▼
 ┌─────────────┐      [RETRY]
 │ File in     │
 │ parsedFiles │
 └────┬────────┘
      │
      ▼
┌─────────────────────────────────┐
│ Display File in List            │
│ ┌───────────────────────────────┐
│ │ 📄 attendance_2024.xlsx       │
│ │ 1,250 rows                    │
│ │ [Remove ×]                    │
│ └───────────────────────────────┘
└────┬────────────────────────────┘
     │
     ▼ User can add more files or analyze
┌────────────────────────────────┐
│ User clicks "Analyze"          │
│ - parsedFiles.length > 0       │
│ - isAnalyzing = false          │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ System sets isAnalyzing = true │
│ Show: [⚙️ Analyzing...]        │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ For each file:                 │
│ 1. Read file content           │
│ 2. Detect format (XLSX/CSV)    │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Parse file to records[]        │
│ XLSX: →sheet_to_json()         │
│ CSV: →PapaParse()              │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Normalize record format:       │
│ {                              │
│   name, email, date,           │
│   time, status                 │
│ }                              │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Combine all parsed records     │
│ allRecords = [...]             │
│ Count: 1,250+ records          │
└────┬───────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Call analyzeAttendance()        │
│ ┌─────────────────────────────┐ │
│ │ Group by student            │ │
│ │ Calculate attendance stats   │ │
│ │ Score = normal*10 + late*5  │ │
│ │ Generate analysis results   │ │
│ └─────────────────────────────┘ │
└────┬────────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Returns students[] with scores │
│ [{                             │
│   name, email, id,             │
│   normal, late, absent,        │
│   score, scorePercentage       │
│ }, ...]                        │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Calculate aggregated stats:    │
│ - totalNormal, totalLate       │
│ - totalAbsent                  │
│ - avgScore, numSessions        │
│ - atRiskCount                  │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Update state:                  │
│ setStudents(studentsArray)     │
│ setPieData([...])              │
│ setIsAnalyzing(false)          │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Persist to localStorage:       │
│ localStorage.setItem(          │
│   'analysisResults', data      │
│ )                              │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Re-render Dashboard            │
│ Show:                          │
│ ✓ Stats cards                  │
│ ✓ Pie chart (distribution)     │
│ ✓ Progress bars                │
│ ✓ Student table                │
│ ✓ Export buttons               │
└────┬───────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Show Success Toast             │
│ "Analysis complete!"           │
└────┬───────────────────────────┘
     │
     ▼
END (ANALYSIS COMPLETE)
     │
     ├─> User can export report
     ├─> View individual details
     ├─> Configure scoring
     └─> Download student list
```

### 6.3 Individual Student Detail Interaction

```
┌──────────────────────────────────────────────────────┐
│   INDIVIDUAL STUDENT DETAIL INTERACTION               │
├──────────────────────────────────────────────────────┤

User Views Student Table
         │
         ▼
┌─────────────────────────────────┐
│ User clicks on student row      │
│ ┌─────────────────────────────┐ │
│ │ John Doe  │ 85.0 │ 18 │ 2 │1│ │
│ └─────────────────────────────┘ │
└────┬────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ onClick handler triggered       │
│ setSelectedStudent(student)     │
└────┬────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ <IndividualSection> component   │
│ renders with student data       │
└────┬────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Display Individual Analysis Panel            │
│ ┌──────────────────────────────────────────┐ │
│ │ Student: John Doe                     [×]│ │
│ │ ID: STU001 | Email: john@univ.edu      │ │
│ │                                          │ │
│ │ Score Metrics:                           │ │
│ │ ┌────────────────────────────────────┐  │ │
│ │ │ Score: 85.0 / 100  [Progress Bar]  │  │ │
│ │ │ Performance: High (82%)            │  │ │
│ │ └────────────────────────────────────┘  │ │
│ │                                          │ │
│ │ Attendance Breakdown:                    │ │
│ │ ┌────────────────────────────────────┐  │ │
│ │ │ 🟢 On-Time: 18 (90%)              │  │ │
│ │ │ 🟠 Late: 2 (10%)                  │  │ │
│ │ │ 🔴 Absent: 0 (0%)                 │  │ │
│ │ └────────────────────────────────────┘  │ │
│ │                                          │ │
│ │ Attendance History (All Sessions):       │ │
│ │ ┌────────────────────────────────────┐  │ │
│ │ │ Date       │ Time    │ Status     │  │ │
│ │ ├─────────────────────────────────── │  │ │
│ │ │ 2024-01-15│ 09:00  │ ✓ On-Time  │  │ │
│ │ │ 2024-01-16│ 09:15  │ ⏱ Late     │  │ │
│ │ │ 2024-01-17│ 09:00  │ ✓ On-Time  │  │ │
│ │ │ 2024-01-18│ 09:00  │ ✓ On-Time  │  │ │
│ │ │ ...                              │  │ │
│ │ └────────────────────────────────────┘  │ │
│ │                                          │ │
│ │ Statistics:                              │ │
│ │ - First Attendance: 2024-01-15         │ │
│ │ - Last Attendance: 2024-02-23          │ │
│ │ - Total Sessions: 20                   │ │
│ │ - Attendance Rate: 95%                 │ │
│ │ - Status: Active | ✓ Not At Risk       │ │
│ │                                          │ │
│ │ [Close Detail]                          │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
     │
     ▼ User interacts
  ┌──┴─────────────────────┬──────────────┐
  │                        │              │
  ▼                        ▼              ▼
Click Close          Click on another    Scroll
  │                   student row       history
  │                        │             │
  ▼                        ▼             ▼
setSelectedStudent    Switch detail    View more
= null                panel to new      attendance
  │                   student           records
Unmount         setSelectedStudent       │
Component       = newStudent             │
  │                    │                 ▼
  ▼                    ▼           [Load Previous
Return to          Re-render with       Records]
Student Table      new student
                   details
```

### 6.4 Report Export Interaction

```
┌──────────────────────────────────────────────────────┐
│        REPORT EXPORT INTERACTION FLOW                 │
├──────────────────────────────────────────────────────┤

Dashboard displays students data
         │
         ▼
┌──────────────────────────────────┐
│ Export Report Section            │
│ ┌──────────────────────────────┐ │
│ │ [CSV] [TXT] [PDF] [Download] │ │
│ └──────────────────────────────┘ │
└────┬─────────────────────────────┘
     │
     ├─ User selects format: CSV
     │
     ▼
┌──────────────────────────────────┐
│ setExportFormat('csv')           │
│ Format button highlights         │
└────┬─────────────────────────────┘
     │
     ▼
┌──────────────────────────────────┐
│ User clicks "Download"           │
└────┬─────────────────────────────┘
     │
     ▼
┌──────────────────────────────────┐
│ Call exportReport()              │
│ exportFormat === 'csv'           │
└────┬─────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ Build CSV Content:                     │
│ Header: Name,Email,ID,Score,Normal... │
│ Rows: [student data per row]           │
│ Separator: comma                       │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ Create Blob from content               │
│ new Blob([csvContent],                 │
│   {type: 'text/csv'})                  │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ Generate download link                 │
│ URL.createObjectURL(blob)              │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ Create temporary <a> element           │
│ <a href={url}                          │
│    download="report.csv"               │
│    onClick={trigger}/>                 │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ Trigger browser download               │
│ link.click()                           │
│ File saves to Downloads folder         │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ Cleanup                                │
│ URL.revokeObjectURL(url)               │
│ Remove temporary element               │
└────┬───────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ Display Success Toast                  │
│ "Report downloaded successfully!"      │
└────┬───────────────────────────────────┘
     │
     ▼
END (FILE DOWNLOADED)
     │
File in user's Download folder:
📄 report_2024-02-23.csv
```

---

## 7. System-to-System Interactions

### 7.1 Frontend to Backend API Interactions

```
┌──────────────────────────────────────────────────────┐
│     FRONTEND ◄──► BACKEND API INTERACTIONS            │
├──────────────────────────────────────────────────────┤

1. AUTHENTICATION
═════════════════

POST /api/auth/login
Request:
{
  "email": "user@email.com",
  "password": "password123"
}

Response (Success):
{
  "token": "eyJhbGc...",
  "user": {
    "id": "user_1",
    "email": "user@email.com",
    "role": "user",
    "name": "John Doe"
  }
}

Response (Error):
{
  "error": "Invalid credentials"
}


2. FILE UPLOAD & PARSE
══════════════════════

POST /api/parse
Content-Type: multipart/form-data
Body: { file: File }

Response:
{
  "records": [
    {
      "name": "John Doe",
      "email": "john@univ.edu",
      "date": "2024-01-15",
      "time": "09:00",
      "status": "normal"
    },
    ...
  ],
  "recordCount": 250
}


3. ATTENDANCE ANALYSIS
══════════════════════

POST /api/analyze
Request:
{
  "records": [...],
  "config": {
    "normalPoints": 10,
    "latePoints": 5,
    "highThreshold": 80,
    "midThreshold": 60
  }
}

Response:
{
  "students": [
    {
      "name": "John Doe",
      "email": "john@univ.edu",
      "id": "STU001",
      "normal": 18,
      "late": 2,
      "absent": 0,
      "score": 85,
      "scorePercentage": 85.0,
      "firstDate": "2024-01-15",
      "lastDate": "2024-02-23"
    },
    ...
  ],
  "statistics": {
    "totalNormal": 450,
    "totalLate": 45,
    "totalAbsent": 25,
    "avgScore": 82.5,
    "numSessions": 20
  }
}


4. EXPORT REPORT
════════════════

POST /api/export
Request:
{
  "format": "csv",
  "students": [...],
  "config": {...}
}

Response:
[CSV/TXT/PDF binary content]
or
{
  "downloadUrl": "s3://bucket/report_123.pdf"
}


5. SETTINGS/CONFIG
═══════════════════

GET /api/config
Response:
{
  "highScoreThreshold": 80,
  "midScoreThreshold": 60,
  "atRiskThreshold": 40,
  "normalPoints": 10,
  "latePoints": 5,
  "maxScore": 200
}

POST /api/config
Request:
{
  "highScoreThreshold": 85,
  "midScoreThreshold": 65,
  ...
}
Response:
{
  "success": true,
  "message": "Config updated"
}


6. USER SETTINGS
═════════════════

GET /api/user/settings
Response:
{
  "accentColor": "#008080",
  "theme": "dark",
  "language": "en"
}

POST /api/user/settings
Request:
{
  "accentColor": "#0066ff",
  "theme": "dark"
}
Response:
{
  "success": true,
  "settings": {...}
}
```

### 7.2 Client-Server Interaction Architecture

```
┌─────────────────────────────────────────────────────┐
│         CLIENT-SERVER INTERACTION MODEL               │
├─────────────────────────────────────────────────────┤

FRONTEND (React Browser)          BACKEND (Node.js Server)
┌───────────────────────┐        ┌──────────────────────┐
│                       │        │                      │
│  ┌─────────────────┐  │        │  ┌────────────────┐  │
│  │ React App       │  │        │  │ Express Server │  │
│  │                 │  │        │  │                │  │
│  │ Components:     │  │        │  │ Routes:        │  │
│  │ - Dashboard     │  │        │  │ - POST /login  │  │
│  │ - Settings      │  │        │  │ - POST /parse  │  │
│  │ - Admin         │  │        │  │ - POST /analyze│  │
│  │ - Individual    │  │        │  │ - POST /export │  │
│  └────────┬─────────┘  │        │  └────────┬───────┘  │
│           │            │        │           │          │
│  ┌────────▼─────────┐  │        │  ┌────────▼──────┐   │
│  │ Custom Hooks    │  │        │  │ Middleware     │   │
│  │ - useAuth       │  │        │  │ - Auth (JWT)   │   │
│  │ - useSettings   │  │        │  │ - Validation   │   │
│  │ - useAnalysis   │  │        │  │ - Error Handle │   │
│  └────────┬─────────┘  │        │  └────────┬──────┘   │
│           │            │        │           │          │
│  ┌────────▼─────────┐  │        │  ┌────────▼──────┐   │
│  │ API Client      │  │  HTTP   │  │ Controllers    │   │
│  │ (fetch/axios)   │◄─────────────│ - authCtrl     │   │
│  │ - POST/GET      │  │ REST    │  │ - parseCtrl    │   │
│  │ - Headers: JWT  │  │ JSON    │  │ - analyzeCtrl  │   │
│  │ - Error Handling│  │         │  │ - exportCtrl   │   │
│  └────────┬─────────┘  │        │  └────────┬──────┘   │
│           │            │        │           │          │
│  ┌────────▼─────────┐  │        │  ┌────────▼──────┐   │
│  │ State Management │  │        │  │ Services       │   │
│  │ - Context API   │  │        │  │ - authService  │   │
│  │ - localStorage  │  │        │  │ - parseService │   │
│  │ - Session       │  │        │  │ - reportService│   │
│  └─────────────────┘  │        │  └────────┬──────┘   │
│                       │        │           │          │
│                       │        │  ┌────────▼──────┐   │
│                       │        │  │ Database       │   │
│                       │        │  │ - MongoDB/SQL  │   │
│                       │        │  │ - Collections  │   │
│                       │        │  │ - Schemas      │   │
│                       │        │  └────────────────┘   │
│                       │        │                      │
└───────────────────────┘        └──────────────────────┘
         │                               │
         ├─ HTTPS/REST API ─────────────┤
         │ (JSON Payloads)             │
         │ (JWT Authentication)        │
         │ (Error Responses)           │
         └─────────────────────────────┘
```

### 7.3 Data Flow Between Systems

```
┌──────────────────────────────────────────────────────┐
│      COMPLETE DATA FLOW ARCHITECTURE                  │
├──────────────────────────────────────────────────────┤

USER INPUT
    │
    ▼
┌─────────────────────────────────────┐
│ PRESENTATION LAYER                  │
│ (React Components)                  │
│ - Form inputs                       │
│ - Button clicks                     │
│ - File uploads                      │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ APPLICATION LAYER                   │
│ (React Hooks & State)               │
│ - Event handlers                    │
│ - State management                  │
│ - Validation logic                  │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ BUSINESS LOGIC LAYER (Frontend)     │
│ - Custom hooks                      │
│ - Analysis functions                │
│ - Export generators                 │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
    [Local Storage]     [API Request]
        │                    │
        │         ┌──────────▼──────────┐
        │         │ HTTP/REST Request   │
        │         │ POST /api/analyze   │
        │         │ Headers: JWT Token  │
        │         │ Body: JSON Data     │
        │         └──────────┬──────────┘
        │                    │
        │                    ▼
        │        ┌──────────────────────┐
        │        │ BACKEND SERVER LAYER │
        │        │ (Express.js)         │
        │        │ - Route matching     │
        │        │ - Middleware stack   │
        │        │ - Auth verification  │
        │        └──────────┬───────────┘
        │                   │
        │                   ▼
        │        ┌──────────────────────┐
        │        │ BUSINESS LOGIC LAYER │
        │        │ (Backend Services)   │
        │        │ - Data validation    │
        │        │ - Score calculation  │
        │        │ - Report generation  │
        │        └──────────┬───────────┘
        │                   │
        │                   ▼
        │        ┌──────────────────────┐
        │        │ DATA ACCESS LAYER    │
        │        │ (Database/Models)    │
        │        │ - Query building     │
        │        │ - Data retrieval     │
        │        │ - Data storage       │
        │        └──────────┬───────────┘
        │                   │
        │                   ▼
        │        ┌──────────────────────┐
        │        │ DATABASE LAYER       │
        │        │ (MongoDB/PostgreSQL) │
        │        │ - CRUD operations    │
        │        │ - Indexing           │
        │        │ - Transactions       │
        │        └──────────┬───────────┘
        │                   │
        │                   ▼
        │        ┌──────────────────────┐
        │        │ HTTP Response        │
        │        │ Status: 200/400/500  │
        │        │ Body: JSON Data      │
        │        └──────────┬───────────┘
        │                   │
        └───────────┬───────┘
                    │
                    ▼
        ┌──────────────────────┐
        │ Response Handler      │
        │ - Parse JSON          │
        │ - Error checking      │
        │ - Data transformation │
        └──────────┬───────────┘
                   │
        ┌──────────┴───────────┐
        │                      │
        ▼                      ▼
    [Update State]      [Update localStorage]
        │                      │
        ▼                      ▼
    [Re-render UI]       [Persist Data]
        │                      │
        └──────────┬───────────┘
                   │
                   ▼
            [USER SEES RESULT]
```

### 7.4 Database to Application Mapping

```
┌──────────────────────────────────────────────────────┐
│      DATABASE ◄──► APPLICATION MAPPING                │
├──────────────────────────────────────────────────────┤

Database Collections       Application Objects
════════════════════════   ════════════════════════

users {                     User {
  _id                         id
  email                       email
  passwordHash               (password hashed)
  role                       role
  createdAt                  createdAt
  updatedAt                  updatedAt
}                           }

students {                  Student {
  _id                         id
  name                       name
  email                      email
  studentId                  studentId
  role                       role
  firstDate                  firstDate
  lastDate                   lastDate
}                           }

attendanceRecords {         AttendanceRecord {
  _id                         id
  studentId                  studentId (FK)
  date                       date
  time                       time
  status                     status
  minutesLate               minutesLate
}                           }

analysisResults {           AnalysisResult {
  _id                         id
  studentId                  studentId (FK)
  totalScore                score
  normalCount               normal
  lateCount                 late
  absentCount               absent
  percentage               scorePercentage
  generatedAt              generatedAt
}                           }

config {                    ConfigSettings {
  _id                         id
  highThreshold             highScoreThreshold
  midThreshold              midScoreThreshold
  atRiskLevel               atRiskThreshold
  normalPoints              normalPoints
  latePoints                latePoints
}                           }

userSettings {              AppearanceSettings {
  _id                         id
  userId                     userId (FK)
  accentColor                accentColor
  theme                      theme
  language                  language
}                           }
```

---

## Summary

### Key Takeaways

1. **Requirement Engineering**: Clear functional and non-functional requirements guide development
2. **System Modeling**: UML diagrams (Use cases, Data flow, Entity-relationship) visualize system structure
3. **Architectural Design**: Layered architecture separates concerns (Presentation, Business Logic, Data)
4. **Design & Implementation**: Technology choices (React, Node.js, Express) support scalability
5. **UML Diagrams**: Class, Sequence, and State diagrams document system behavior
6. **User-System Interactions**: Detailed flows show how users interact with the system
7. **System-to-System Interactions**: API contracts and data flows define backend communication

### Technologies Used

- **Frontend**: React 18, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Node.js, Express.js
- **Database**: MongoDB or PostgreSQL
- **Authentication**: JWT tokens
- **File Processing**: XLSX, PapaParse, jsPDF
- **Hosting**: Vercel (Frontend), Railway/Render (Backend)

---

**Reference**: Ian Sommerville's Software Engineering (10th Edition)
**Document Version**: 1.0
**Last Updated**: February 23, 2026
