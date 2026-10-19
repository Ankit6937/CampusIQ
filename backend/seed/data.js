// Static reference data for the seed script (all companies/names are fictional).
exports.SKILLS = [
  ['Python', 'Programming', 88], ['Java', 'Programming', 85], ['C++', 'Programming', 70],
  ['JavaScript', 'Web', 86], ['React', 'Web', 82], ['Node.js', 'Web', 78],
  ['MongoDB', 'Database', 72], ['SQL', 'Database', 90], ['Machine Learning', 'Data & AI', 84],
  ['Data Science', 'Data & AI', 80], ['DSA', 'Core', 95], ['AWS', 'Cloud & DevOps', 81],
  ['Docker', 'Cloud & DevOps', 76], ['TypeScript', 'Web', 68], ['Git', 'Core', 74],
  ['Linux', 'Cloud & DevOps', 60], ['Spring Boot', 'Programming', 66], ['Embedded C', 'Core', 52],
  ['MATLAB', 'Core', 45], ['AutoCAD', 'Core', 40]
];

exports.COMPANIES = [
  ['NexaByte Technologies', 'IT Services', 'Bengaluru', 'Large'],
  ['Quantora Systems', 'Software Products', 'Hyderabad', 'Large'],
  ['BlueOrbit Software', 'SaaS', 'Pune', 'Medium'],
  ['Zenith Cloudworks', 'Cloud Computing', 'Bengaluru', 'Large'],
  ['Pixelforge Labs', 'Web & Gaming', 'Mumbai', 'Startup'],
  ['Aurora Analytics', 'Data Analytics', 'Gurugram', 'Medium'],
  ['Vertex Infotech', 'IT Services', 'Chennai', 'Enterprise'],
  ['Orbis Datalabs', 'Artificial Intelligence', 'Bengaluru', 'Startup'],
  ['Helix Robotics', 'Robotics', 'Pune', 'Medium'],
  ['Lumina Semiconductors', 'Electronics', 'Hyderabad', 'Large'],
  ['Meridian Power Systems', 'Energy', 'Ahmedabad', 'Large'],
  ['Vajra Heavy Engineering', 'Manufacturing', 'Jamshedpur', 'Enterprise'],
  ['Ganga Infra Builders', 'Construction', 'Delhi NCR', 'Large'],
  ['Nimbus FinServe', 'FinTech', 'Mumbai', 'Medium'],
  ['Triveni Networks', 'Telecom', 'Noida', 'Large']
];

// c = company index, off = drive date as days from "now", open = openings, diff = selection difficulty
exports.DRIVES = [
  { c: 0, title: 'Associate Software Engineer', pkg: 4.0, loc: 'Bengaluru', cgpa: 6.0, att: 70, skills: ['Java', 'SQL'], br: ['CSE', 'IT', 'ECE', 'EEE'], off: -690, open: 6, diff: 0 },
  { c: 1, title: 'Software Development Engineer', pkg: 18.0, loc: 'Hyderabad', cgpa: 8.0, att: 75, skills: ['DSA', 'Java'], br: ['CSE', 'IT'], off: -660, open: 3, diff: 8 },
  { c: 6, title: 'Systems Engineer', pkg: 3.6, loc: 'Chennai', cgpa: 6.0, att: 70, skills: ['SQL'], br: ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE'], off: -630, open: 8, diff: -3 },
  { c: 2, title: 'Full Stack Developer', pkg: 8.5, loc: 'Pune', cgpa: 7.0, att: 75, skills: ['JavaScript', 'React', 'Node.js'], br: ['CSE', 'IT'], off: -600, open: 3, diff: 3 },
  { c: 9, title: 'VLSI Design Engineer', pkg: 9.0, loc: 'Hyderabad', cgpa: 7.5, att: 75, skills: ['Embedded C'], br: ['ECE', 'EEE'], off: -560, open: 3, diff: 4 },
  { c: 10, title: 'Graduate Engineer Trainee', pkg: 5.5, loc: 'Ahmedabad', cgpa: 6.5, att: 70, skills: ['MATLAB'], br: ['EEE', 'ECE', 'ME'], off: -520, open: 4, diff: 0 },
  { c: 3, title: 'Cloud Engineer', pkg: 10.0, loc: 'Bengaluru', cgpa: 7.0, att: 75, skills: ['AWS', 'Docker', 'Linux'], br: ['CSE', 'IT', 'ECE'], off: -470, open: 3, diff: 5 },
  { c: 11, title: 'Mechanical Design Engineer', pkg: 4.8, loc: 'Jamshedpur', cgpa: 6.5, att: 70, skills: ['AutoCAD'], br: ['ME'], off: -410, open: 4, diff: 0 },
  { c: 5, title: 'Data Analyst', pkg: 7.0, loc: 'Gurugram', cgpa: 7.0, att: 75, skills: ['Python', 'SQL'], br: ['CSE', 'IT', 'ECE', 'EEE'], off: -380, open: 4, diff: 2 },
  { c: 12, title: 'Site Engineer', pkg: 4.2, loc: 'Delhi NCR', cgpa: 6.0, att: 70, skills: ['AutoCAD'], br: ['CE', 'ME'], off: -340, open: 4, diff: -2 },
  { c: 13, title: 'Backend Developer', pkg: 12.0, loc: 'Mumbai', cgpa: 7.5, att: 75, skills: ['Node.js', 'MongoDB', 'SQL'], br: ['CSE', 'IT'], off: -300, open: 3, diff: 6 },
  { c: 7, title: 'ML Engineer', pkg: 14.0, loc: 'Bengaluru', cgpa: 8.0, att: 75, skills: ['Python', 'Machine Learning'], br: ['CSE', 'IT', 'ECE'], off: -250, open: 2, diff: 8 },
  { c: 4, title: 'Frontend Developer', pkg: 7.5, loc: 'Mumbai', cgpa: 7.0, att: 75, skills: ['JavaScript', 'React'], br: ['CSE', 'IT'], off: -200, open: 3, diff: 3 },
  { c: 8, title: 'Robotics Software Engineer', pkg: 9.5, loc: 'Pune', cgpa: 7.5, att: 75, skills: ['C++', 'Python'], br: ['CSE', 'ECE', 'EEE', 'ME'], off: -150, open: 2, diff: 5 },
  { c: 14, title: 'Network Engineer', pkg: 5.0, loc: 'Noida', cgpa: 6.0, att: 70, skills: ['Linux'], br: ['ECE', 'EEE', 'CSE', 'IT'], off: -110, open: 5, diff: 0, cancelled: true },
  { c: 0, title: 'Data Engineer', pkg: 6.5, loc: 'Bengaluru', cgpa: 7.0, att: 75, skills: ['Python', 'SQL', 'MongoDB'], br: ['CSE', 'IT'], off: -70, open: 4, diff: 2 },
  { c: 1, title: 'Machine Learning Intern', pkg: 4.8, type: 'Internship', loc: 'Hyderabad', cgpa: 7.5, att: 75, skills: ['Python', 'Machine Learning'], br: ['CSE', 'IT'], off: -30, open: 3, diff: 4 },
  { c: 3, title: 'DevOps Engineer', pkg: 11.0, loc: 'Bengaluru', cgpa: 7.5, att: 75, skills: ['Docker', 'AWS', 'Git'], br: ['CSE', 'IT'], off: 8, open: 3, diff: 5 },
  { c: 13, title: 'Full Stack Engineer', pkg: 15.0, loc: 'Mumbai', cgpa: 8.0, att: 75, skills: ['React', 'Node.js', 'TypeScript'], br: ['CSE', 'IT'], off: 21, open: 3, diff: 6 },
  { c: 6, title: 'Digital Specialist Engineer', pkg: 7.0, loc: 'Chennai', cgpa: 7.0, att: 75, skills: ['Java', 'SQL', 'DSA'], br: ['CSE', 'IT', 'ECE'], off: 45, open: 5, diff: 2 }
];

exports.MALE = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Rohan', 'Karthik', 'Siddharth', 'Rahul', 'Nikhil', 'Harsh', 'Pranav', 'Ishaan', 'Manish', 'Varun', 'Kunal', 'Ayush', 'Deepak', 'Suresh', 'Vikram', 'Abhishek'];
exports.FEMALE = ['Ananya', 'Priya', 'Sneha', 'Kavya', 'Ishita', 'Neha', 'Pooja', 'Riya', 'Divya', 'Meera', 'Aishwarya', 'Shruti', 'Tanvi', 'Nisha', 'Anjali', 'Swati', 'Isha', 'Sanya', 'Diya', 'Lakshmi'];
exports.SURNAMES = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Menon', 'Kumar', 'Yadav', 'Mishra', 'Joshi', 'Kulkarni', 'Deshmukh', 'Chauhan', 'Bhatia', 'Mehta', 'Das', 'Banerjee', 'Rao', 'Pillai', 'Thakur', 'Saxena', 'Agarwal', 'Jain', 'Shetty', 'Naidu', 'Bose', 'Kapoor'];
exports.CITIES = ['Pune', 'Bengaluru', 'Hyderabad', 'Chennai', 'Mumbai', 'Delhi', 'Jaipur', 'Lucknow', 'Kolkata', 'Ahmedabad', 'Indore', 'Chandigarh', 'Kochi', 'Bhopal', 'Nagpur'];

exports.POOLS = {
  CS: { Python: 9, Java: 8, 'C++': 6, JavaScript: 7, React: 5, 'Node.js': 4, MongoDB: 4, SQL: 8, 'Machine Learning': 4, 'Data Science': 3, DSA: 9, AWS: 3, Docker: 3, TypeScript: 2, Git: 6, Linux: 3, 'Spring Boot': 2 },
  EL: { 'Embedded C': 8, 'C++': 5, Python: 6, MATLAB: 6, Linux: 3, DSA: 3, SQL: 2, Git: 2 },
  CORE: { AutoCAD: 9, MATLAB: 5, Python: 3, SQL: 2, Git: 1, 'C++': 2 }
};

exports.PROJECTS_CS = ['Online Exam Portal', 'Chat Application', 'E-commerce Website', 'Movie Recommendation System', 'Student Management System', 'Weather Forecast App', 'Expense Tracker', 'Portfolio Website', 'Sentiment Analysis Tool', 'Face Attendance System', 'Blog Platform', 'Food Delivery App'];
exports.PROJECTS_CORE = ['Smart Home Automation', 'Line Follower Robot', 'Solar Tracker', 'Bridge Load Analysis', 'Engine Cooling Simulation', 'Traffic Signal Controller', 'IoT Weather Station', 'Water Quality Monitor', 'Structural Design in AutoCAD'];
exports.CERTS = [
  ['AWS Cloud Practitioner', 'Amazon Web Services'], ['MongoDB Associate Developer', 'MongoDB University'], ['Python for Everybody', 'Coursera'],
  ['Java Programming', 'NPTEL'], ['Data Science Foundations', 'IBM'], ['Azure Fundamentals', 'Microsoft'], ['Machine Learning Specialization', 'Coursera'],
  ['SQL Basics', 'HackerRank'], ['Docker Essentials', 'Udemy'], ['Embedded Systems Basics', 'NPTEL'], ['AutoCAD Certified User', 'Autodesk'], ['Problem Solving (Basic)', 'HackerRank']
];
exports.INTERN_COMPANIES = ['Infinite Loop Labs', 'Brightpath Solutions', 'CodeNest Studio', 'GreenGrid Energy', 'Precision Tools Pvt Ltd', 'DataWeave Analytics'];
