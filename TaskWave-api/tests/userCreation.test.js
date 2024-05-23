const request = require('supertest');
const { app, server, pool } = require('../server'); // Adjust the path as necessary

describe('User Endpoints', () => {
  afterAll(async () => {
    await pool.end(); // Close the database connection pool
    server.close(); // Close the server
    await new Promise(resolve => setTimeout(() => resolve(), 500)); // Allow time for the server to close
  });

  it('should create a new user', async () => {
    const res = await request(app)
      .post('/addEmployee')
      .send({
        name: 'Test User',
        role: 'Developer',
        employee_id: '12345',
        email: 'testuser@example.com',
        position: 'Software Engineer',
        report_to: 'Manager',
        birthdate: '1990-01-01',
        join_date: '2024-01-01'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
  });
});
