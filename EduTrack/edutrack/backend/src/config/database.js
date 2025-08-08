// EduTrack Backend - Database Configuration
// src/config/database.js - PostgreSQL database connection and setup

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const dbConfig = {
    connectionString: process.env.DATABASE_URL || 
        `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'edutrack'}`,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // maximum number of clients in the pool
    idleTimeoutMillis: 30000, // close idle clients after 30 seconds
    connectionTimeoutMillis: 5000, // return an error after 5 seconds if connection could not be established
};

// Create connection pool
const pool = new Pool(dbConfig);

// Database connection wrapper
class Database {
    constructor() {
        this.pool = pool;
        this.isConnected = false;
    }

    async connect() {
        try {
            const client = await this.pool.connect();
            console.log('🔌 Testing database connection...');
            
            const result = await client.query('SELECT NOW()');
            console.log('✅ Database connection successful at:', result.rows[0].now);
            
            client.release();
            this.isConnected = true;
            
            // Run initial setup
            await this.initializeDatabase();
            
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        try {
            await this.pool.end();
            this.isConnected = false;
            console.log('🔌 Database connection pool closed');
        } catch (error) {
            console.error('❌ Error closing database connection:', error.message);
            throw error;
        }
    }

    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            if (process.env.NODE_ENV !== 'production') {
                console.log('🔍 Executed query:', { text, duration, rows: result.rowCount });
            }
            
            return result;
        } catch (error) {
            console.error('❌ Database query error:', { text, error: error.message });
            throw error;
        }
    }

    async transaction(callback) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async initializeDatabase() {
        try {
            console.log('🏗️  Initializing database schema...');
            
            // Create tables if they don't exist
            await this.createTables();
            
            // Insert default data if needed
            await this.seedDefaultData();
            
            console.log('✅ Database initialization complete');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            throw error;
        }
    }

    async createTables() {
        const createTablesSQL = `
            -- Enable UUID extension
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            
            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'teacher' CHECK (role IN ('admin', 'government', 'teacher', 'ngo')),
                phone VARCHAR(20),
                lga VARCHAR(100),
                school_id UUID REFERENCES schools(id),
                is_active BOOLEAN DEFAULT true,
                email_verified BOOLEAN DEFAULT false,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Schools table
            CREATE TABLE IF NOT EXISTS schools (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                school_type VARCHAR(50) NOT NULL CHECK (school_type IN ('primary', 'secondary', 'technical')),
                address TEXT NOT NULL,
                lga VARCHAR(100) NOT NULL,
                state VARCHAR(100) DEFAULT 'Kano',
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                total_students INTEGER DEFAULT 0,
                total_teachers INTEGER DEFAULT 0,
                total_classrooms INTEGER DEFAULT 0,
                contact_phone VARCHAR(20),
                contact_email VARCHAR(255),
                head_teacher_name VARCHAR(255),
                established_year INTEGER,
                infrastructure_score INTEGER DEFAULT 0 CHECK (infrastructure_score BETWEEN 0 AND 100),
                last_assessment DATE,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Add foreign key constraint for users.school_id (after schools table is created)
            ALTER TABLE users ADD CONSTRAINT fk_users_school 
            FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;

            -- Reports table
            CREATE TABLE IF NOT EXISTS reports (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                school_id UUID NOT NULL REFERENCES schools(id),
                reporter_id UUID REFERENCES users(id),
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('infrastructure', 'furniture', 'maintenance', 'safety', 'resources', 'sanitation')),
                priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
                status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'acknowledged', 'in-progress', 'resolved', 'rejected')),
                students_affected INTEGER DEFAULT 0,
                estimated_cost DECIMAL(12, 2),
                urgency_score INTEGER DEFAULT 0 CHECK (urgency_score BETWEEN 0 AND 100),
                location_detail TEXT,
                photos TEXT[], -- Array of photo URLs
                is_anonymous BOOLEAN DEFAULT false,
                visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'government', 'private')),
                resolved_at TIMESTAMP,
                resolved_by UUID REFERENCES users(id),
                resolution_notes TEXT,
                resolution_cost DECIMAL(12, 2),
                funding_source VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Resources table (for tracking funding and donations)
            CREATE TABLE IF NOT EXISTS resources (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                report_id UUID REFERENCES reports(id),
                resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('funding', 'materials', 'equipment', 'services')),
                provider_name VARCHAR(255) NOT NULL,
                provider_type VARCHAR(50) CHECK (provider_type IN ('government', 'ngo', 'private', 'donor', 'community')),
                amount DECIMAL(12, 2),
                currency VARCHAR(3) DEFAULT 'NGN',
                description TEXT,
                status VARCHAR(20) DEFAULT 'pledged' CHECK (status IN ('pledged', 'approved', 'allocated', 'disbursed', 'completed')),
                contact_info JSONB,
                conditions TEXT,
                allocated_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Comments table (for report discussions)
            CREATE TABLE IF NOT EXISTS comments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                report_id UUID NOT NULL REFERENCES reports(id),
                user_id UUID REFERENCES users(id),
                comment_text TEXT NOT NULL,
                comment_type VARCHAR(20) DEFAULT 'comment' CHECK (comment_type IN ('comment', 'update', 'question', 'resolution')),
                is_internal BOOLEAN DEFAULT false,
                attachments TEXT[],
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Notifications table
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id),
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) NOT NULL CHECK (type IN ('report', 'status_update', 'assignment', 'deadline', 'system')),
                related_id UUID, -- Could reference reports, schools, etc.
                related_type VARCHAR(50), -- 'report', 'school', etc.
                is_read BOOLEAN DEFAULT false,
                priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
                action_url TEXT,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP
            );

            -- Analytics table (for tracking metrics)
            CREATE TABLE IF NOT EXISTS analytics (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                metric_type VARCHAR(50) NOT NULL,
                metric_name VARCHAR(100) NOT NULL,
                value DECIMAL(15, 4) NOT NULL,
                metadata JSONB,
                time_period VARCHAR(20), -- 'daily', 'weekly', 'monthly'
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Sessions table (for auth token management)
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id),
                token_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                user_agent TEXT,
                ip_address INET,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_schools_lga ON schools(lga);
            CREATE INDEX IF NOT EXISTS idx_schools_location ON schools(latitude, longitude);
            CREATE INDEX IF NOT EXISTS idx_reports_school ON reports(school_id);
            CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
            CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority);
            CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
            CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
            CREATE INDEX IF NOT EXISTS idx_comments_report ON comments(report_id);
            CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(metric_type, recorded_at);
            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, is_active);

            -- Create triggers for updated_at timestamps
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `;

        await this.query(createTablesSQL);
        console.log('✅ Database tables created/verified');
    }

    async seedDefaultData() {
        try {
            // Check if we already have data
            const userCount = await this.query('SELECT COUNT(*) FROM users');
            if (parseInt(userCount.rows[0].count) > 0) {
                console.log('📊 Database already has data, skipping seed');
                return;
            }

            console.log('🌱 Seeding default data...');

            // Insert sample schools
            const schoolsSQL = `
                INSERT INTO schools (name, school_type, address, lga, latitude, longitude, total_students, total_teachers, total_classrooms, head_teacher_name) VALUES
                ('Government Primary School Fagge', 'primary', 'Fagge Central, Kano', 'Fagge', 12.0022, 8.5120, 450, 18, 12, 'Malam Sani Ibrahim'),
                ('Kano Municipal Secondary School', 'secondary', 'Municipal Road, Kano', 'Kano Municipal', 12.0100, 8.5200, 680, 28, 18, 'Mrs. Amina Hassan'),
                ('Dala Primary School', 'primary', 'Dala Market Area, Kano', 'Dala', 11.9950, 8.4900, 320, 15, 10, 'Malam Ahmed Bello'),
                ('Gwale Community School', 'secondary', 'Gwale District, Kano', 'Gwale', 12.0200, 8.4800, 520, 22, 15, 'Mrs. Fatima Aliyu'),
                ('Tarauni Girls Secondary', 'secondary', 'Tarauni Town, Kano', 'Tarauni', 12.0300, 8.5300, 380, 20, 12, 'Mrs. Hadiza Usman'),
                ('Nassarawa Primary School', 'primary', 'Nassarawa GRA, Kano', 'Nassarawa', 11.9800, 8.5100, 280, 12, 8, 'Malam Yusuf Ali'),
                ('Ungogo Technical School', 'technical', 'Ungogo Industrial Area, Kano', 'Ungogo', 12.0400, 8.4700, 420, 25, 14, 'Engr. Ibrahim Sule'),
                ('Kumbotso Primary School', 'primary', 'Kumbotso Village, Kano', 'Kumbotso', 11.9700, 8.5400, 180, 8, 6, 'Malam Garba Musa');
            `;
            await this.query(schoolsSQL);

            // Insert default admin user
            const bcrypt = require('bcryptjs');
            const adminPassword = await bcrypt.hash('admin123!', 10);
            
            const adminSQL = `
                INSERT INTO users (username, email, password_hash, full_name, role, phone, is_active, email_verified) VALUES
                ('admin', 'admin@edutrack.ng', $1, 'System Administrator', 'admin', '+234-800-EDUTRACK', true, true)
            `;
            await this.query(adminSQL, [adminPassword]);

            // Insert sample reports
            const getSchoolIds = await this.query('SELECT id FROM schools LIMIT 5');
            const schoolIds = getSchoolIds.rows.map(row => row.id);

            const reportsSQL = `
                INSERT INTO reports (school_id, title, description, issue_type, priority, status, students_affected, estimated_cost, is_anonymous) VALUES
                ($1, 'Students sitting on bare floors', '150 students in this primary school are forced to sit on bare concrete floors during classes. Urgent need for desks and chairs.', 'furniture', 'urgent', 'reported', 150, 450000, true),
                ($2, 'Leaking roof during rainy season', 'The school roof leaks severely during rain, disrupting classes and damaging learning materials.', 'infrastructure', 'high', 'in-progress', 280, 850000, false),
                ($3, 'Broken windows and doors need repair', 'Multiple windows and doors are broken, creating security and weather protection issues.', 'maintenance', 'medium', 'reported', 180, 320000, true),
                ($4, 'Lack of proper sanitation facilities', 'The school toilets are in terrible condition and need complete renovation for health and dignity.', 'sanitation', 'urgent', 'in-progress', 380, 680000, false),
                ($5, 'Laboratory equipment needs replacement', 'Science laboratory lacks basic equipment for practical lessons, affecting student learning outcomes.', 'resources', 'medium', 'reported', 420, 920000, true)
            `;
            await this.query(reportsSQL, schoolIds.slice(0, 5));

            console.log('✅ Default data seeded successfully');

        } catch (error) {
            console.error('❌ Error seeding default data:', error.message);
            // Don't throw error here as this is optional
        }
    }

    // Health check method
    async healthCheck() {
        try {
            const result = await this.query('SELECT 1 as health');
            return {
                status: 'healthy',
                connected: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Create and export database instance
const database = new Database();

module.exports = database;