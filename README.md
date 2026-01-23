# ParKar  
*AI-Assisted University Parking Access Intelligence System*

---

## Team Members  

### Mirazum Munira Mahi 
- **Role:** Front-end Developer  
- **Email:** mirazum.cse.20230104130@aust.edu  
- **ID:** 20230104130  

### Mumit Sazid  
- **Role:** Front-end & Back-end Developer  
- **Email:** sazid.cse.20230104113@aust.edu  
- **ID:** 20230104140

### Masrafi Iqbal
- **Role:** Team Lead  
- **Email:** masrafi.cse.20230104141@aust.edu  
- **ID:** 20230104141  

### Samiul Islam  
- **Role:** Back-end Developer  
- **Email:** samiul.cse.20230104142@aust.edu  
- **ID:** 20230104142 

---

## Objective  
ParKar digitizes and automates **semester-based parking access control** in universities by managing **who is allowed to park**, while using **AI assistance** to support administrators in **fair and efficient decision-making**.

---

## Description  
ParKar is a **web-based AI-assisted parking access management system** designed for universities where parking is **first-come, first-serve** and **no fixed parking slots** are assigned.

Instead of assigning parking spaces, ParKar focuses on **eligibility and permission management**. Students and teachers apply for parking access each semester, upload required documents **only once**, and receive approvals based on university policies.

An AI module assists administrators by:
- analyzing applications,
- detecting blurry images,
- identifying document issues (name mismatch, validity),
- suggesting fast renewals for returning users,

 **AI never auto-approves or rejects applications.**  
Final decisions always remain under **administrator control**.

ParKar reduces paperwork, saves administrative time, improves transparency, and ensures fair access to campus parking.

---

## Target Audience  
-  University Students  
-  University Teachers / Faculty Members  
-  University Administration & Parking Authorities  

---

## Tech Stack  
- **Backend:** Laravel (REST API)  
- **Frontend:** React.js  
- **Rendering Method:** Client-Side Rendering (CSR)  
- **AI Layer:** Python (FastAPI) / External AI API  
- **Database:** MySQL  

---

## UI Desing
Link: https://www.figma.com/site/JtOIbXjnXrMUWoTd2T4CAM/Untitled?node-id=0-1&p=f&t=kKHStnG6tgujqU8A-0&fbclid=IwY2xjawPgXFFleHRuA2FlbQIxMABicmlkETEwcnpYVkZ4ajQ4SzFlWWQyc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHhBAihHmQv-KSSdmtpfm8qwpvQRritJDupIaLAq58Wp1uAnxo0xFh6nymByp_aem_fKVkFMHvg58zRg4AkNDCZQ

---

## ✨ Project Features  

### Core Features  
- Semester-based parking access system  
- Online parking access application  
- One-time document upload (reused across semesters)  
- Automatic access expiry at semester end  
- Teacher priority handling  
- Centralized parking permission verification  
- Real-time application status tracking  
- Admin dashboard for approvals and analytics  

---

## Exclusive Feature (AI Integration)  
- AI-assisted document verification *(clarity, expiry, consistency)*  
- AI-based smart renewal detection for returning users  
- AI-based blurry image detection  

 **AI does not auto-approve or reject applications.**  
Admins always make the final decision.

---

## User Authentication  
- JWT-based authentication  
- Secure login and logout  
- Role-based access control *(User / Admin)*  

---

## CRUD Operations  

### Users  
- Register  
- Login  
- Profile management  

### Parking Applications  
- Apply for parking access  
- View application status  
- Renew application per semester  

### Vehicles & Documents  
- Add vehicle details  
- Upload and manage documents  
- Reuse existing documents across semesters  

### Admin Controls  
- Create and manage semesters  
- Approve / reject parking applications  
- Set vehicle quota and semester fee  

---

## API Endpoints (Approximate)

### Authentication APIs  

POST   /api/register  
POST   /api/login  
POST   /api/logout  
GET    /api/profile  


### Parling APIs  

GET    /api/parking-applications  
POST   /api/parking-applications  
PUT    /api/parking-applications/{id}  



### Admin APIs  

POST   /api/semesters  
GET    /api/admin/applications  
POST   /api/admin/approve/{id}  
POST   /api/admin/reject/{id}  

---

## Project Milestones  

### Milestone 1: Core System Setup  
- Project setup (Laravel + React)  
- Database schema design  
- User authentication and role management  
- Basic parking application flow  

### Milestone 2: Parking Access Management & UI  
- Student and teacher dashboards  
- Document upload and reuse logic   
- Admin approval interface  
- Status tracking and notifications  

### Milestone 3: AI Integration & Finalization  
- AI-based priority scoring engine  
- Document intelligence module  
- Smart renewal detection  
- Semester load prediction  
- UI polishing and bug fixing  



