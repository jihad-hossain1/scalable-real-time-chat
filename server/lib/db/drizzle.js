const { messageTable, userTable } = require("./schema");
const { drizzle } = require("drizzle-orm/mysql-core");

const drizzleOrm = drizzle({
  schema: {
    ...messageTable,
    ...userTable,
  },
});

module.exports = drizzleOrm;
