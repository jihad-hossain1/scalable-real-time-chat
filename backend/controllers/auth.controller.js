const bcrypt = require("bcrypt");
const { db } = require("../lib/db");
const { userTable } = require("../lib/db/schema");
const { eq, and } = require("drizzle-orm");

async function register(req, res) {
  const { name, password, email } = req.body;

  if (!name?.trim() || !password || !email?.trim()) {
    return res.status(401).json({
      error: "Please fill all the fields",
      success: false,
    });
  }

  try {
    // Fix the logic to find user by email
    const checkUserExist = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email));

    if (checkUserExist?.length > 0) {
      return res.status(401).json({ error: "user exist", success: false });
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    await db
      .insert(userTable)
      .values({ name, email, password: encryptedPassword });

    res.status(200).json({
      success: true,
      message: "User created successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: error?.message,
    });
  }
}

const { SignJWT } = require("jose");

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(401).json({
      error: "Please fill all the fields",
      success: false,
    });
  }

  try {
    const checkUserExist = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email));

    if (checkUserExist?.length == 0) {
      return res.status(401).json({ error: "user not exist", success: false });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      checkUserExist[0]?.password
    );

    if (!isPasswordCorrect) {
      return res
        .status(401)
        .json({ error: "Invalid credentials", success: false });
    }

    // Generate JWT token
    const jwt = await new SignJWT({
      id: checkUserExist[0]?.id,
      email: checkUserExist[0]?.email,
      name: checkUserExist[0]?.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      // .setExpirationTime("7d")
      .sign(new TextEncoder().encode("your-256-bit-secret"));

    // Set token in session
    // req.session.token = jwt;

    return res.status(200).json({
      success: true,
      token: jwt,
      id: checkUserExist[0]?.id,
      name: checkUserExist[0]?.name,
      email: checkUserExist[0]?.email,
    });
  } catch (error) {
    res.status(500).json({
      error: error?.message,
      success: false,
    });
  }
}

module.exports = {
  register,
  login,
};
