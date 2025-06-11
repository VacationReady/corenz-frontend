// pages/api/auth/[...nextauth].ts

const NextAuth = require("next-auth").default;
const { authOptions } = require("../../../lib/auth-options");

export default (req, res) => NextAuth(req, res, authOptions);
