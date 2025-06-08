const { db } = require("../lib/db");
const { userTable } = require("../lib/db/schema");
const { eq, ne, and, ilike } = require("drizzle-orm");

async function getUser(req, res) {
  const { query, loggedUserId, page } = req.query;
  const pageNumber = Number(page) || 1;
  const pageSize = 10;
  const offset = (pageNumber - 1) * pageSize;

  try {
    let users;

    if (query) {
      // If query is provided, filter users by name (case-insensitive partial match)
      users = await db
        .select()
        .from(userTable)
        .where(
          and(
            ilike(userTable.name, `%${query}%`), // Partial match instead of exact match
            ne(userTable.id, Number(loggedUserId)) // Use ne (not equal) instead of not
          )
        )
        .limit(pageSize)
        .offset(offset);
    } else {
      users = await db
        .select()
        .from(userTable)
        .where(ne(userTable.id, Number(loggedUserId))) // Use ne instead of not
        .limit(pageSize)
        .offset(offset);

      console.log("🚀 ~ getUser ~ users:", users);
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
