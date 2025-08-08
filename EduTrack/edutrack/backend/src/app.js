</style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="nav-container">
            <a href="index.html" class="logo">
                <i class="fas fa-graduation-cap"></i>
                EduTrack
            </a>
            <nav>
                <ul class="nav-links">
                    <li><a href="index.html">Home</a></li>
                    <li><a href="dashboard.html">Dashboard</a></li>
                    <li><a href="report.html">Report Issue</a></li>
                    <li><a href="map.html">Map View</a></li>
                    <li><a href="success-stories.html" class="active">Success Stories</a></li>
                    <li><a href="about.html">About</a></li>
                </ul>
            </nav>
            <div class="user-profile">
                <i class="fas fa-user-circle"></i>
                <span>Admin User</span>
            </div>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1 class="hero-title">Success Stories</h1>
            <p class="hero-subtitle">Real transformations happening in schools across Nigeria through EduTrack</p>
        </div>
    </section>

    <!-- Main Content -->
    <main class="main-content">
        <div class="container">
            
            <!-- Stats Overview -->
            <section class="section">
                <div class="stats-overview">
                    <h2 class="section-title">Transformation Impact</h2>
                    <div class="stats-grid">
                        <div class="stat-card success">
                            <div class="stat-number">324</div>
                            <div class="stat-label">Schools Transformed</div>
                            <div class="stat-description">Complete infrastructure overhauls</div>
                        </div>
                        <div class="stat-card impact">
                            <div class="stat-number">185K+</div>
                            <div class="stat-label">Students Impacted</div>
                            <div class="stat-description">Children now in better learning environments</div>
                        </div>
                        <div class="stat-card funding">
                            <div class="stat-number">₦2.4B</div>
                            <div class="stat-label">Funds Mobilized</div>
                            <div class="stat-description">Government and donor contributions</div>
                        </div>
                        <div class="stat-card timeline">
                            <div class="stat-number">45</div>
                            <div class="stat-label">Avg. Days</div>
                            <div class="stat-description">From report to resolution</div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Filter Section -->
            <section class="filter-section">
                <div class="filter-grid">
                    <div class="filter-group">
                        <label>Filter by LGA</label>
                        <select class="filter-select" id="lgaFilter">
                            <option value="">All Local Governments</option>
                            <option value="kano-municipal">Kano Municipal</option>
                            <option value="fagge">Fagge</option>
                            <option value="dala">Dala</option>
                            <option value="gwale">Gwale</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Issue Type</label>
                        <select class="filter-select" id="typeFilter">
                            <option value="">All Issues</option>
                            <option value="infrastructure">Infrastructure</option>
                            <option value="furniture">Furniture</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Timeline</label>
                        <select class="filter-select" id="timeFilter">
                            <option value="">All Time</option>
                            <option value="last-month">Last Month</option>
                            <option value="last-3-months">Last 3 Months</option>
                            <option value="last-year">Last Year</option>
                        </select>
                    </div>
                </div>
                <div class="filter-actions">
                    <button class="btn-filter">Apply Filters</button>
                    <button class="btn-clear">Clear All</button>
                </div>
            </section>

            <!-- Success Stories -->
            <section class="section">
                <!-- Story 1: Fagge Primary School -->
                <div class="story-card">
                    <div class="story-header">
                        <h3 class="story-title">Government Primary School Fagge - Complete Transformation</h3>
                        <div class="story-meta">
                            <div class="meta-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Fagge LGA, Kano State</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-users"></i>
                                <span>450 Students</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-calendar"></i>
                                <span>Completed July 2024</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-money-bill"></i>
                                <span>₦8.5M Investment</span>
                            </div>
                        </div>
                        <p class="story-summary">From 450 children sitting on bare floors to a fully equipped modern learning environment with proper furniture, renovated classrooms, and improved sanitation facilities.</p>
                    </div>
                    
                    <div class="before-after">
                        <div class="before-section">
                            <div class="section-label">
                                <i class="fas fa-times-circle"></i>
                                <span>Before</span>
                            </div>
                            <div class="image-placeholder before">
                                <i class="fas fa-frown"></i>
                            </div>
                            <ul class="condition-list">
                                <li><i class="fas fa-times"></i> 450 students sitting on bare concrete floors</li>
                                <li><i class="fas fa-times"></i> Leaking roof during rainy season</li>
                                <li><i class="fas fa-times"></i> Broken windows and doors</li>
                                <li><i class="fas fa-times"></i> No proper sanitation facilities</li>
                                <li><i class="fas fa-times"></i> Inadequate learning materials</li>
                            </ul>
                        </div>
                        
                        <div class="after-section">
                            <div class="section-label">
                                <i class="fas fa-check-circle"></i>
                                <span>After</span>
                            </div>
                            <div class="image-placeholder after">
                                <i class="fas fa-smile"></i>
                            </div>
                            <ul class="condition-list">
                                <li><i class="fas fa-check"></i> 450 new desks and chairs installed</li>
                                <li><i class="fas fa-check"></i> Complete roof renovation completed</li>
                                <li><i class="fas fa-check"></i> New windows and doors installed</li>
                                <li><i class="fas fa-check"></i> Modern toilet facilities constructed</li>
                                <li><i class="fas fa-check"></i> Learning materials and books provided</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="impact-metrics">
                        <h4 class="impact-title">Transformation Impact</h4>
                        <div class="metrics-grid">
                            <div class="metric-item">
                                <div class="metric-number">320</div>
                                <div class="metric-label">Students Benefited</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-number">15</div>
                                <div class="metric-label">Teachers Trained</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-number">85%</div>
                                <div class="metric-label">Engagement Increase</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-number">33</div>
                                <div class="metric-label">Days to Complete</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="testimonial">
                        <div class="testimonial-quote">
                            "EduTrack connected us with tech donors who transformed our school. Our children are now learning digital skills that will prepare them for the future economy."
                        </div>
                        <div class="testimonial-author">Malam Ahmed Usman</div>
                        <div class="testimonial-role">Principal, Gwale Community School</div>
                    </div>
                </div>
            </section>

            <!-- Call to Action -->
            <section class="section">
                <div class="testimonial" style="margin: 0; border-radius: 16px;">
                    <h2 style="font-size: 2rem; margin-bottom: 1rem;">Be Part of the Transformation</h2>
                    <p style="font-size: 1.1rem; margin-bottom: 2rem;">Every success story started with someone caring enough to report an issue. Your voice can transform a school.</p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <a href="report.html" style="background: white; color: #2E8B57; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                            <i class="fas fa-plus-circle"></i> Report an Issue
                        </a>
                        <a href="dashboard.html" style="background: transparent; color: white; border: 2px solid white; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.background='white'; this.style.color='#2E8B57'" onmouseout="this.style.background='transparent'; this.style.color='white'">
                            <i class="fas fa-chart-line"></i> View Dashboard
                        </a>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <!-- Footer -->
    <footer style="background: #1e293b; color: white; padding: 3rem 0 2rem;">
        <div class="container">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
                <div>
                    <h4 style="font-family: 'Poppins', sans-serif; font-weight: 600; margin-bottom: 1rem;">EduTrack Platform</h4>
                    <p style="color: #94a3b8; margin-bottom: 1rem;">Transforming educational infrastructure through technology, transparency, and community engagement.</p>
                    <p style="color: #94a3b8;"><i class="fas fa-envelope"></i> success@edutrack.ng</p>
                    <p style="color: #94a3b8;"><i class="fas fa-phone"></i> +234 (0) 800 SUCCESS</p>
                </div>
                
                <div>
                    <h4 style="font-family: 'Poppins', sans-serif; font-weight: 600; margin-bottom: 1rem;">Success Metrics</h4>
                    <p style="color: #94a3b8; display: block; margin-bottom: 0.5rem;">324 Schools Transformed</p>
                    <p style="color: #94a3b8; display: block; margin-bottom: 0.5rem;">185K+ Students Impacted</p>
                    <p style="color: #94a3b8; display: block; margin-bottom: 0.5rem;">₦2.4B Resources Mobilized</p>
                    <p style="color: #94a3b8; display: block; margin-bottom: 0.5rem;">89% Success Rate</p>
                </div>
                
                <div>
                    <h4 style="font-family: 'Poppins', sans-serif; font-weight: 600; margin-bottom: 1rem;">Featured Partners</h4>
                    <p style="color: #94a3b8; display: block; margin-bottom: 0.5rem;">Kano State Ministry of Education</p>
                    <p style="color: #94a3b8; display: block; margin-bottom: 0.5rem;">UNICEF Nigeria</p>
                    <p style="color: #94a3b8; display: block; margin-bottom: 0.5rem;">World Bank Education Program</p>
                    <p style="color: #94a3b8; display: block; margin-bottom: 0.5rem;">MTN Foundation</p>
                </div>
                
                <div>
                    <h4 style="font-family: 'Poppins', sans-serif; font-weight: 600; margin-bottom: 1rem;">Get Involved</h4>
                    <p style="color: #94a3b8; display: block; margin-bottom: 0.5rem;">Report School Issues</p>
                    <p style="color: #94a3b8; display: block; margin-bottom: 0.5rem;">Become a Partner</p>
                    <p style="color: #94a3b8; display: block; margin-bottom: 0.5rem;">Volunteer Program</p>
                    <p style="color: #94a3b8; display: block; margin-bottom: 0.5rem;">Donate Resources</p>
                </div>
            </div>
            
            <div style="border-top: 1px solid #334155; padding-top: 2rem; text-align: center; color: #94a3b8;">
                <p>&copy; 2024 EduTrack Success Stories. Every transformation begins with a single report. 🏫✨</p>
            </div>
        </div>
    </footer>

    <script>
        // Simple filter functionality
        document.addEventListener('DOMContentLoaded', function() {
            const filterSelects = document.querySelectorAll('.filter-select');
            const storyCards = document.querySelectorAll('.story-card');
            
            // Sample filter logic (would connect to backend in real app)
            function applyFilters() {
                const lga = document.getElementById('lgaFilter').value;
                const type = document.getElementById('typeFilter').value;
                const time = document.getElementById('timeFilter').value;
                
                storyCards.forEach(card => {
                    let shouldShow = true;
                    
                    // Simple filtering based on content (in real app, would use data attributes)
                    if (lga && !card.textContent.toLowerCase().includes(lga.replace('-', ' '))) {
                        shouldShow = false;
                    }
                    
                    if (type && !card.textContent.toLowerCase().includes(type)) {
                        shouldShow = false;
                    }
                    
                    card.style.display = shouldShow ? 'block' : 'none';
                });
            }
            
            // Attach event listeners
            document.querySelector('.btn-filter').addEventListener('click', applyFilters);
            
            document.querySelector('.btn-clear').addEventListener('click', function() {
                filterSelects.forEach(select => select.value = '');
                storyCards.forEach(card => card.style.display = 'block');
            });
            
            // Auto-apply filters on select change
            filterSelects.forEach(select => {
                select.addEventListener('change', applyFilters);
            });
            
            // Smooth scrolling for internal links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
            
            // Add animation when story cards come into view
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            });
            
            storyCards.forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(card);
            });
        });
    </script>
</body>
</html>4>
                        <div class="metrics-grid">
                            <div class="metric-item">
                                <div class="metric-number">450</div>
                                <div class="metric-label">Students Benefited</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-number">18</div>
                                <div class="metric-label">Teachers Involved</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-number">35%</div>
                                <div class="metric-label">Attendance Increase</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-number">42</div>
                                <div class="metric-label">Days to Complete</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="timeline">
                        <h4 class="timeline-title">Project Timeline</h4>
                        <div class="timeline-item">
                            <div class="timeline-date">May 15</div>
                            <div class="timeline-content">
                                <div class="timeline-event">Issue Reported</div>
                                <div class="timeline-description">Teacher anonymously reported poor conditions via EduTrack platform</div>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-date">May 18</div>
                            <div class="timeline-content">
                                <div class="timeline-event">Assessment Completed</div>
                                <div class="timeline-description">Government officials conducted on-site evaluation</div>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-date">May 25</div>
                            <div class="timeline-content">
                                <div class="timeline-event">Funding Secured</div>
                                <div class="timeline-description">₦8.5M allocated from state education budget and UNICEF partnership</div>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-date">Jun 1</div>
                            <div class="timeline-content">
                                <div class="timeline-event">Construction Began</div>
                                <div class="timeline-description">Local contractors started renovation work</div>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-date">Jul 26</div>
                            <div class="timeline-content">
                                <div class="timeline-event">Project Completed</div>
                                <div class="timeline-description">Full transformation completed and handed over to school</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="testimonial">
                        <div class="testimonial-quote">
                            "I never imagined my students would have proper desks to write on. EduTrack gave us a voice and the government listened. Our children now have dignity in their learning environment."
                        </div>
                        <div class="testimonial-author">Malam Sani Ibrahim</div>
                        <div class="testimonial-role">Head Teacher, Government Primary School Fagge</div>
                    </div>
                </div>

                <!-- Story 2: Dala Secondary School -->
                <div class="story-card">
                    <div class="story-header">
                        <h3 class="story-title">Dala Secondary School - Infrastructure & Safety Upgrade</h3>
                        <div class="story-meta">
                            <div class="meta-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Dala LGA, Kano State</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-users"></i>
                                <span>680 Students</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-calendar"></i>
                                <span>Completed June 2024</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-money-bill"></i>
                                <span>₦12.3M Investment</span>
                            </div>
                        </div>
                        <p class="story-summary">Critical safety hazards eliminated and learning environment completely modernized through collaborative efforts between government, NGOs, and community.</p>
                    </div>
                    
                    <div class="before-after">
                        <div class="before-section">
                            <div class="section-label">
                                <i class="fas fa-times-circle"></i>
                                <span>Before</span>
                            </div>
                            <div class="image-placeholder before">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <ul class="condition-list">
                                <li><i class="fas fa-times"></i> Cracked walls posing structural risks</li>
                                <li><i class="fas fa-times"></i> Electrical wiring exposed and dangerous</li>
                                <li><i class="fas fa-times"></i> Laboratory equipment outdated and broken</li>
                                <li><i class="fas fa-times"></i> No library or proper study spaces</li>
                                <li><i class="fas fa-times"></i> Poor ventilation in classrooms</li>
                            </ul>
                        </div>
                        
                        <div class="after-section">
                            <div class="section-label">
                                <i class="fas fa-check-circle"></i>
                                <span>After</span>
                            </div>
                            <div class="image-placeholder after">
                                <i class="fas fa-trophy"></i>
                            </div>
                            <ul class="condition-list">
                                <li><i class="fas fa-check"></i> Structural repairs and wall reinforcement</li>
                                <li><i class="fas fa-check"></i> Complete electrical system upgrade</li>
                                <li><i class="fas fa-check"></i> Modern science laboratory equipment</li>
                                <li><i class="fas fa-check"></i> New library with 2,000+ books</li>
                                <li><i class="fas fa-check"></i> Improved ventilation and lighting</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="impact-metrics">
                        <h4 class="impact-title">Transformation Impact</h4>
                        <div class="metrics-grid">
                            <div class="metric-item">
                                <div class="metric-number">680</div>
                                <div class="metric-label">Students Benefited</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-number">28</div>
                                <div class="metric-label">Teachers Involved</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-number">60%</div>
                                <div class="metric-label">Science Exam Improvement</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-number">58</div>
                                <div class="metric-label">Days to Complete</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="testimonial">
                        <div class="testimonial-quote">
                            "The laboratory transformation has revolutionized how we teach sciences. Our students can now conduct proper experiments and their performance has improved dramatically."
                        </div>
                        <div class="testimonial-author">Mrs. Fatima Aliyu</div>
                        <div class="testimonial-role">Science Teacher, Dala Secondary School</div>
                    </div>
                </div>

                <!-- Story 3: Gwale Community School -->
                <div class="story-card">
                    <div class="story-header">
                        <h3 class="story-title">Gwale Community School - Digital Learning Initiative</h3>
                        <div class="story-meta">
                            <div class="meta-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Gwale LGA, Kano State</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-users"></i>
                                <span>320 Students</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-calendar"></i>
                                <span>Completed August 2024</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-money-bill"></i>
                                <span>₦6.8M Investment</span>
                            </div>
                        </div>
                        <p class="story-summary">First school in the district to receive comprehensive digital learning infrastructure through innovative public-private partnership.</p>
                    </div>
                    
                    <div class="before-after">
                        <div class="before-section">
                            <div class="section-label">
                                <i class="fas fa-times-circle"></i>
                                <span>Before</span>
                            </div>
                            <div class="image-placeholder before">
                                <i class="fas fa-book"></i>
                            </div>
                            <ul class="condition-list">
                                <li><i class="fas fa-times"></i> Only blackboard for teaching aids</li>
                                <li><i class="fas fa-times"></i> Outdated textbooks from 2010</li>
                                <li><i class="fas fa-times"></i> No computer or digital literacy</li>
                                <li><i class="fas fa-times"></i> Limited teaching resources</li>
                                <li><i class="fas fa-times"></i> Poor student engagement</li>
                            </ul>
                        </div>
                        
                        <div class="after-section">
                            <div class="section-label">
                                <i class="fas fa-check-circle"></i>
                                <span>After</span>
                            </div>
                            <div class="image-placeholder after">
                                <i class="fas fa-laptop"></i>
                            </div>
                            <ul class="condition-list">
                                <li><i class="fas fa-check"></i> Smart boards in all classrooms</li>
                                <li><i class="fas fa-check"></i> Digital library with e-books</li>
                                <li><i class="fas fa-check"></i> Computer lab with 20 stations</li>
                                <li><i class="fas fa-check"></i> Tablet program for teachers</li>
                                <li><i class="fas fa-check"></i> Internet connectivity installed</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="impact-metrics">
                        <h4 class="impact-title">Transformation Impact</h<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EduTrack - Success Stories</title>
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }

        /* Header */
        .header {
            background: white;
            border-bottom: 1px solid #e2e8f0;
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1rem;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            font-size: 1.5rem;
            color: #2E8B57;
            text-decoration: none;
        }

        .logo i {
            font-size: 2rem;
            color: #1E90FF;
        }

        .nav-links {
            display: flex;
            list-style: none;
            gap: 2rem;
            align-items: center;
        }

        .nav-links a {
            text-decoration: none;
            color: #64748b;
            font-weight: 500;
            transition: color 0.2s;
        }

        .nav-links a:hover,
        .nav-links a.active {
            color: #2E8B57;
        }

        .user-profile {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: #f1f5f9;
            padding: 0.5rem 1rem;
            border-radius: 50px;
            font-size: 0.9rem;
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, #2E8B57 0%, #1E90FF 100%);
            color: white;
            padding: 4rem 0;
            text-align: center;
        }

        .hero-content {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 1rem;
        }

        .hero-title {
            font-family: 'Poppins', sans-serif;
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 1rem;
            line-height: 1.2;
        }

        .hero-subtitle {
            font-size: 1.25rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }

        /* Main Content */
        .main-content {
            padding: 4rem 0;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }

        .section {
            margin-bottom: 4rem;
        }

        .section-title {
            font-family: 'Poppins', sans-serif;
            font-size: 2.25rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 1.5rem;
            text-align: center;
        }

        .section-subtitle {
            font-size: 1.125rem;
            color: #64748b;
            text-align: center;
            max-width: 600px;
            margin: 0 auto 3rem;
        }

        /* Stats Overview */
        .stats-overview {
            background: white;
            border-radius: 16px;
            padding: 3rem;
            margin-bottom: 4rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem;
        }

        .stat-card {
            text-align: center;
            padding: 2rem 1rem;
            border-radius: 12px;
            background: #f8fafc;
            transition: transform 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-4px);
        }

        .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .stat-label {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 0.5rem;
        }

        .stat-description {
            font-size: 0.9rem;
            color: #64748b;
        }

        .stat-card.success .stat-number { color: #16a34a; }
        .stat-card.impact .stat-number { color: #2E8B57; }
        .stat-card.funding .stat-number { color: #1E90FF; }
        .stat-card.timeline .stat-number { color: #ea580c; }

        /* Success Story Card */
        .story-card {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            margin-bottom: 3rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .story-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 30px rgba(0,0,0,0.1);
        }

        .story-header {
            padding: 2rem 2rem 1rem;
        }

        .story-title {
            font-family: 'Poppins', sans-serif;
            font-size: 1.5rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 0.5rem;
        }

        .story-meta {
            display: flex;
            gap: 2rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            color: #64748b;
        }

        .meta-item i {
            color: #2E8B57;
        }

        .story-summary {
            color: #475569;
            font-size: 1rem;
        }

        /* Before/After Section */
        .before-after {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            padding: 2rem;
        }

        .before-section,
        .after-section {
            padding: 1.5rem;
            border-radius: 12px;
        }

        .before-section {
            background: #fef2f2;
            border-left: 4px solid #dc2626;
        }

        .after-section {
            background: #f0fdf4;
            border-left: 4px solid #16a34a;
        }

        .section-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }

        .before-section .section-label {
            color: #dc2626;
        }

        .after-section .section-label {
            color: #16a34a;
        }

        .image-placeholder {
            width: 100%;
            height: 200px;
            background: #e2e8f0;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1rem;
            position: relative;
            overflow: hidden;
        }

        .image-placeholder i {
            font-size: 3rem;
            color: #94a3b8;
        }

        .image-placeholder.before {
            background: linear-gradient(45deg, #fee2e2, #fecaca);
        }

        .image-placeholder.after {
            background: linear-gradient(45deg, #dcfce7, #bbf7d0);
        }

        .condition-list {
            list-style: none;
            margin-top: 1rem;
        }

        .condition-list li {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
        }

        .before-section .condition-list i {
            color: #dc2626;
        }

        .after-section .condition-list i {
            color: #16a34a;
        }

        /* Impact Metrics */
        .impact-metrics {
            background: #f8fafc;
            padding: 2rem;
            border-top: 1px solid #e2e8f0;
        }

        .impact-title {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 1rem;
            text-align: center;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1.5rem;
            text-align: center;
        }

        .metric-item {
            background: white;
            padding: 1rem;
            border-radius: 8px;
        }

        .metric-number {
            font-size: 1.5rem;
            font-weight: 700;
            color: #2E8B57;
            margin-bottom: 0.25rem;
        }

        .metric-label {
            font-size: 0.85rem;
            color: #64748b;
        }

        /* Timeline */
        .timeline {
            padding: 2rem;
            background: white;
        }

        .timeline-title {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 1.5rem;
            text-align: center;
        }

        .timeline-item {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid #f1f5f9;
        }

        .timeline-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }

        .timeline-date {
            background: #2E8B57;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            white-space: nowrap;
            height: fit-content;
        }

        .timeline-content {
            flex: 1;
        }

        .timeline-event {
            font-weight: 500;
            color: #1e293b;
            margin-bottom: 0.25rem;
        }

        .timeline-description {
            color: #64748b;
            font-size: 0.9rem;
        }

        /* Testimonial */
        .testimonial {
            background: linear-gradient(135deg, #2E8B57, #1E90FF);
            color: white;
            padding: 2rem;
            margin: 2rem;
            border-radius: 12px;
            text-align: center;
        }

        .testimonial-quote {
            font-style: italic;
            font-size: 1.1rem;
            margin-bottom: 1rem;
            line-height: 1.7;
        }

        .testimonial-author {
            font-weight: 600;
            margin-bottom: 0.25rem;
        }

        .testimonial-role {
            opacity: 0.9;
            font-size: 0.9rem;
        }

        /* Filter Controls */
        .filter-section {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .filter-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .filter-group label {
            font-weight: 500;
            color: #374151;
            font-size: 0.9rem;
        }

        .filter-select {
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            background: white;
            font-size: 0.9rem;
        }

        .filter-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
        }

        .btn-filter {
            background: #2E8B57;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
        }

        .btn-clear {
            background: transparent;
            color: #64748b;
            border: 1px solid #d1d5db;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            .nav-links {
                display: none;
            }

            .hero-title {
                font-size: 2rem;
            }

            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .before-after {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }

            .story-meta {
                flex-direction: column;
                gap: 0.5rem;
            }

            .metrics-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .timeline-item {
                flex-direction: column;
                gap: 0.5rem;
            }

            .timeline-date {
                align-self: flex-start;
            }

            .filter-grid {
                grid-template-columns: 1fr;
            }

            .filter-actions {
                flex-direction: column;
            }
        }