const { db } = require("../lib/db");
const { userTable } = require("../lib/db/schema");
const { eq } = require("drizzle-orm");

async function getUser(req, res) {
  const { query } = req.query;

  try {
    let users;

    if (query) {
      // If query is provided, filter users by name
      users = await db
        .select()
        .from(userTable)
        .where(eq(userTable.name, query));
    } else {
      users = await db.select().from(userTable).limit(10);
    }

    res.send(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).send("Failed to fetch users");
  }
}

module.exports = {
  getUser,
};
