# College Leave Portal

A comprehensive leave management system for colleges with three user roles: Students (no login), Faculty/MFT (login required), and Admin (login required).

## Features

### Student Module
- Apply for leave without login
- Email validation (college domain only)
- Enrollment verification against division roster
- Cascading dropdowns for organizational hierarchy
- Optional proof upload (before or after application)
- Track application status with unique Application ID

### Faculty/MFT Module
- Secure login for MFTs
- View applications for assigned divisions
- Filter by division and status
- Approve/reject applications and proofs
- View student roster for divisions

### Admin Module
- First-time setup with auto-admin creation
- Manage organizational hierarchy (Colleges → Departments → Branches → Divisions)
- Onboard MFTs with auto-generated passwords
- Manage student roster per division
- Link MFTs to divisions

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Supabase (PostgreSQL + Storage)
- **Email**: Nodemailer (Gmail SMTP)
- **Routing**: React Router
- **Styling**: CSS3 with gradients and animations

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials
   - Add Gmail SMTP credentials

3. **Set up database**:
   - Run the SQL migration in `supabase/migrations/001_initial_schema.sql`
   - Create storage bucket named `leave-proofs`

4. **Run the application**:
   ```bash
   npm run dev
   ```

5. **Access the portal**:
   - Open http://localhost:5173

## Detailed Setup

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for comprehensive setup instructions including:
- Supabase configuration
- Gmail SMTP setup
- Database schema setup
- Complete testing workflow

## Project Structure

```
leave-portal/
├── src/
│   ├── components/
│   │   ├── shared/          # Reusable components
│   │   ├── student/         # Student-specific components
│   │   ├── faculty/         # Faculty-specific components
│   │   └── admin/           # Admin-specific components
│   ├── pages/               # Page components
│   ├── services/            # API services (Supabase, Email)
│   ├── utils/               # Utility functions
│   └── App.jsx              # Main app with routing
├── supabase/
│   └── migrations/          # Database migrations
└── .env                     # Environment variables
```

## Database Schema

- **colleges**: College information
- **departments**: Departments within colleges
- **branches**: Branches within departments
- **divisions**: Divisions within branches
- **mft**: My First Teacher (faculty) accounts
- **faculty**: Additional faculty per division
- **students**: Student roster per division
- **admins**: Admin accounts
- **leave_applications**: Leave applications
- **proofs**: Uploaded proof documents

## License

MIT
