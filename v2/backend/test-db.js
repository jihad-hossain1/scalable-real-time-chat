import { db, users } from './src/models/db.js';
import { eq } from 'drizzle-orm';

async function testDatabaseQueries() {
  try {
    console.log('Testing database queries...');
    
    // Test 1: Simple select
    console.log('Test 1: Simple select');
    const allUsers = await db.select().from(users).limit(1);
    console.log('✅ Simple select successful:', allUsers);
    
    // Test 2: Select with where clause (this is the failing query from the error)
    console.log('\nTest 2: Select with where clause');
    const userByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, 'test@example.com'))
      .limit(1);
    console.log('✅ Where clause select successful:', userByEmail);
    
    // Test 3: Insert a test user
    console.log('\nTest 3: Insert test user');
    const newUser = await db
      .insert(users)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword123'
      })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email
      });
    console.log('✅ Insert successful:', newUser);
    
    // Test 4: Select the inserted user
    console.log('\nTest 4: Select inserted user');
    const insertedUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'test@example.com'))
      .limit(1);
    console.log('✅ Select inserted user successful:', insertedUser);
    
  } catch (error) {
    console.error('❌ Database query error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      internalPosition: error.internalPosition,
      internalQuery: error.internalQuery,
      where: error.where,
      schema: error.schema,
      table: error.table,
      column: error.column,
      dataType: error.dataType,
      constraint: error.constraint
    });
  } finally {
    process.exit(0);
  }
}

testDatabaseQueries();