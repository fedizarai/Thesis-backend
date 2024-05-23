const request = require('supertest');
const { app, server, pool } = require('../server'); // Adjust the path as necessary

describe('Project Creation Endpoint', () => {
  afterAll(async () => {
    await pool.end(); // Close the database connection pool
    server.close(); // Close the server
    await new Promise(resolve => setTimeout(() => resolve(), 500)); // Allow time for the server to close
  });

  it('should create a new project without file uploads', async () => {
    const newProject = {
      title: 'New Project',
      description: 'A description of the new project',
      startdate: '2024-05-20',
      workinghours: 100,
      deadline: '2024-06-20',
      creator: 1, // Replace with an actual user ID from your database
      leadername: 2, // Replace with an actual user ID from your database
      priority: 'High',
      activestatus: true,
      team: '1,2', // Replace with actual user IDs from your database
      tasks: JSON.stringify([
        { description: 'Task 1', deadline: '2024-06-01' },
        { description: 'Task 2', deadline: '2024-06-10' }
      ])
    };

    const res = await request(app)
      .post('/projects')
      .field('title', newProject.title)
      .field('description', newProject.description)
      .field('startdate', newProject.startdate)
      .field('workinghours', newProject.workinghours)
      .field('deadline', newProject.deadline)
      .field('creator', newProject.creator)
      .field('leadername', newProject.leadername)
      .field('priority', newProject.priority)
      .field('activestatus', newProject.activestatus)
      .field('team', newProject.team)
      .field('tasks', newProject.tasks);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('title', newProject.title);
  });
});
