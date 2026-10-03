export function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Postgres unique violation
  if (err.code === '23505') {
    return res.status(409).json({ message: 'Record already exists.' });
  }

  // Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referenced record does not exist.' });
  }

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
