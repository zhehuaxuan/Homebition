module.exports = {
  secret: process.env.JWT_SECRET || 'homebition-jwt-secret-key',
  expiresIn: '7d'
};
