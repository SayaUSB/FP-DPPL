process.env.JWT_SECRET = 'test-secret';
const { signToken, verifyToken, requireAuth, requireRole } = require('../src/auth');

test('signToken/verifyToken round-trip preserves payload', () => {
  const token = signToken({ id: 1, role: 'admin' });
  const decoded = verifyToken(token);
  expect(decoded.id).toBe(1);
  expect(decoded.role).toBe('admin');
});

test('requireAuth rejects requests with no cookie', () => {
  const req = { cookies: {} };
  const res = { status: jest.fn(() => res), json: jest.fn() };
  const next = jest.fn();
  requireAuth(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test('requireAuth attaches user and calls next on valid cookie', () => {
  const token = signToken({ id: 2, role: 'warga' });
  const req = { cookies: { token } };
  const res = { status: jest.fn(() => res), json: jest.fn() };
  const next = jest.fn();
  requireAuth(req, res, next);
  expect(next).toHaveBeenCalled();
  expect(req.user.id).toBe(2);
});

test('requireRole(admin) blocks a warga user', () => {
  const req = { user: { id: 2, role: 'warga' } };
  const res = { status: jest.fn(() => res), json: jest.fn() };
  const next = jest.fn();
  requireRole('admin')(req, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});
