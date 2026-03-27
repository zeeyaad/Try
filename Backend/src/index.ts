import 'reflect-metadata';
// Backend Server 
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { AppDataSource } from './database/data-source';
import registrationRoutes from './routes/RegistrationRoutes';
import membershipRoutes from './routes/MembershipRoutes';
import StaffRoutes from './routes/StaffRoutes';
import AuthRoutes from './routes/AuthRoutes';
import SportRoutes from './routes/SportRoutes';
import SportSubscriptionRoutes from './routes/SportSubscriptionRoutes';
import MemberSubscriptionRoutes from './routes/MemberSubscriptionRoutes';
import TeamMemberRoutes from './routes/TeamMemberRoutes';
import TeamMemberCRUDRoutes from './routes/TeamMemberCRUDRoutes';
import TeamMemberSubscriptionRoutes from './routes/TeamMemberSubscriptionRoutes';
import TeamRoutes from './routes/TeamRoutes';
import FieldRoutes from './routes/FieldRoutes';
import BookingRoutes from './routes/BookingRoutes';
import MemberBookingRoutes from './routes/MemberBookingRoutes';
import TeamMemberBookingRoutes from './routes/TeamMemberBookingRoutes';
import MemberAdminRoutes from './routes/MemberAdminRoutes';
import TeamSubscriptionRoutes from './routes/TeamSubscriptionRoutes';
import TaskRoutes from './routes/TaskRoutes';
import SeedRoutes from './routes/SeedRoutes';
import AuditLogRoutes from './routes/AuditLogRoutes';
import MediaPostRoutes from './routes/MediaPostRoutes';
import FacultyRoutes from './routes/FacultyRoutes';
import publicRoutes from './routes/publicRoutes';
import { memberTeamRouter } from './routes/MemberTeamRoutes';
import participantRegistrationRoutes from './routes/participantRegistration';
import AttendanceRoutes from './routes/AttendanceRoutes';
import PaymobRoutes from './routes/PaymobRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const ensureMediaPostsTable = async () => {
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS media_posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      category VARCHAR(50) NOT NULL,
      images TEXT NULL,
      "videoUrl" VARCHAR(500) NULL,
      "videoDuration" VARCHAR(20) NULL,
      "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
console.log('📁 Static files served from: /uploads');

// Logging middleware to debug 404s
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/public', publicRoutes);
app.use('/api/member-subscriptions', MemberSubscriptionRoutes);
app.use('/api/bookings', BookingRoutes); // NEW: Unified booking system (must be before participantRegistrationRoutes)
app.use('/api/bookings', participantRegistrationRoutes); // Participant registration via invitation links
app.use('/api/register', TeamMemberRoutes);
app.use('/api/register', registrationRoutes);
app.use('/api/teams', TeamRoutes);
app.use('/api/fields', FieldRoutes);
app.use('/api/members', MemberBookingRoutes);
app.use('/api/team-members-booking', TeamMemberBookingRoutes);
app.use('/api/team-members', TeamMemberCRUDRoutes);
app.use('/api/team-members', TeamMemberSubscriptionRoutes);
app.use('/api/team-member-subscriptions', TeamMemberSubscriptionRoutes);
app.use('/api/team-subscriptions', TeamSubscriptionRoutes);
app.use('/api/member-teams', memberTeamRouter);
app.use('/api/memberships', membershipRoutes);
app.use('/api/attendance', AttendanceRoutes);
app.use('/api', MemberAdminRoutes);
app.use('/api/auth', AuthRoutes);
app.use('/api/staff', StaffRoutes);
app.use('/api/sports', SportRoutes);
app.use('/api/sports', SportSubscriptionRoutes);

// Test route
app.get('/api/test-route', (req, res) => {
  res.json({ message: 'Backend is reachable and updating' });
});
app.use('/api/tasks', TaskRoutes);
app.use('/api/audit-logs', AuditLogRoutes);
app.use('/api/media-posts', MediaPostRoutes);
app.use('/api/faculties', FacultyRoutes);
app.use('/api/seed', SeedRoutes);
app.use('/api/paymob', PaymobRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Club System Backend is running' });
});

// Initialize database and start server
AppDataSource.initialize()
  .then(async () => {
    console.log('✅ Database connected successfully');
    await ensureMediaPostsTable();
    console.log('✅ media_posts table is ready');

    // Initialize default membership plans
    const { initializeDefaultPlans } = await import('./utils/initializePlans');
    await initializeDefaultPlans();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error during Data Source initialization:', error);
    process.exit(1);
  });

export default app;