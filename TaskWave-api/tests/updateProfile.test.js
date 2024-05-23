const request = require('supertest');
const { app, server, pool } = require('../server'); // Adjust the path as necessary

describe('Update Profile Endpoint', () => {
  afterAll(async () => {
    await pool.end(); // Close the database connection pool
    server.close(); // Close the server
    await new Promise(resolve => setTimeout(() => resolve(), 500)); // Allow time for the server to close
  });

  it('should update user profile without image', async () => {
    const updateData = {
      id: 1, // Replace with an actual user ID from your database
      name: 'Updated Name',
      username: 'updatedusername',
      birthDate: '1990-01-01',
      gender: 'Other',
      email: 'updatedemail@example.com',
      mobile: '1234567890',
      address: 'Updated Address'
    };

    const res = await request(app)
      .post('/update-profile')
      .send(updateData);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Profile updated successfully');
    expect(res.body.userProfile).toHaveProperty('name', updateData.name);
    expect(res.body.userProfile).toHaveProperty('email', updateData.email);
  });
});
