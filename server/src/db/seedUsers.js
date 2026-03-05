import { getDb } from './database.js';
import bcrypt from 'bcrypt';

const TOTAL_USERS = 10000;
const BATCH_SIZE = 100; // Insert in batches for better performance
const PASSWORD = '12345678';

async function seedUsers() {
  const db = getDb();
  
  console.log(`Starting to seed ${TOTAL_USERS} test users...`);
  const startTime = Date.now();

  try {
    // Get the password hash once
    const passwordHash = bcrypt.hashSync(PASSWORD, 12);
    
    // Use transaction for faster inserts
    const insertStmt = db.prepare(`
      INSERT INTO users (email, password_hash, verified, role, created_at)
      VALUES (?, ?, 1, 'user', datetime('now'))
    `);

    const transaction = db.transaction((users) => {
      for (const user of users) {
        insertStmt.run(user.email, passwordHash);
      }
    });

    // Insert in batches
    for (let i = 1; i <= TOTAL_USERS; i += BATCH_SIZE) {
      const batch = [];
      const end = Math.min(i + BATCH_SIZE - 1, TOTAL_USERS);
      
      for (let j = i; j <= end; j++) {
        batch.push({ email: `testuser${j}@test.com` });
      }
      
      transaction(batch);
      
      if (i % 1000 === 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✓ Inserted ${end} users... (${elapsed}s)`);
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    
    console.log(`\n✅ Successfully seeded ${TOTAL_USERS} users!`);
    console.log(`Total users in database: ${userCount.count}`);
    console.log(`Time taken: ${totalTime}s`);
    console.log(`\nTest credentials:`);
    console.log(`  Email: testuser1@test.com (to testuser${TOTAL_USERS}@test.com)`);
    console.log(`  Password: ${PASSWORD}`);
    
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    process.exit(1);
  }
}

seedUsers();
