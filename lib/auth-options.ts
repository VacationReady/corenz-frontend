async authorize(credentials) {
  if (
    !credentials?.email ||
    typeof credentials.password !== 'string'
  ) {
    console.log('Missing or invalid credentials');
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
  });

  if (!user) {
    console.log('User not found');
    return null;
  }

  if (!user.isActivated) {
    console.log('User not activated');
    return null;
  }

  if (typeof user.password !== 'string') {
    console.log('Invalid stored password');
    return null;
  }

  const isValid = await bcrypt.compare(credentials.password, user.password);

  if (!isValid) {
    console.log('Invalid password');
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
