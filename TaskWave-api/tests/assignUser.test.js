const request = require('supertest');
const { app, server, pool } = require('../server'); // Adjust the path as necessary

describe('Assign User to Task Endpoint', () => {
  afterAll(async () => {
    await pool.end(); // Close the database connection pool
    server.close(); // Close the server
    await new Promise(resolve => setTimeout(() => resolve(), 500)); // Allow time for the server to close
  });

  it('should assign a user to a task', async () => {
    // Create dummy data for the test
    const taskId = 1; // Replace with an actual task ID from your database
    const userId = 2; // Replace with an actual user ID from your database
    const projectId = 1; // Replace with an actual project ID from your database

    const res = await request(app)
      .post('/assign')
      .send({
        taskId,
        userId,
        projectId
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Task assigned successfully');
  });
});
