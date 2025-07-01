# Chat n Date - Dreams of Love

A sexy, real-time matchmaking and chat web app built with HTML/CSS/JS and powered by Supabase backend.

---

## Features

- User Authentication (Signup/Login) with Supabase Auth  
- Profile Creation with Name and Photo Upload (Supabase Storage)  
- Matchmaking system with like/pass functionality  
- Real-time chat between matched users using Supabase Realtime  
- Responsive and sleek UI with dark theme  

---

## Setup Instructions

### 1. Supabase Project Setup

- Create a new project at [supabase.io](https://supabase.io)  
- Create two tables: `profiles` and `messages` (see `database.sql` for schema)  
- Enable Row Level Security and create policies for tables  
- Create a public storage bucket named `avatars` for profile photos  
- Enable Email + Password authentication  

### 2. Configure the Frontend

- Replace the placeholder Supabase URL and anon key in `scripts.js` with your project credentials:  

```js
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
