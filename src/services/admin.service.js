const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/jwt");

const login = async (email, password) => {
  const admin = await prisma.admin_users.findUnique({
    where: { email },
  });

  if (!admin) {
    throw new Error("Invalid email or password.");
  }

  const isMatch = await bcrypt.compare(password, admin.password);

  if (!isMatch) {
    throw new Error("Invalid email or password.");
  }

  const token = generateToken(admin);

  return {
    token,
    admin: {
      id: admin.id,
      full_name: admin.full_name,
      email: admin.email,
      role: admin.role,
    },
  };
};

module.exports = {
  login,
};