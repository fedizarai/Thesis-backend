const express =require('express');
const bodyParser= require('body-parser');
const cors= require('cors');
const bcrypt = require('bcrypt-nodejs');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const { Server } = require("socket.io");
const cookieParser= require('cookie-parser');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-password'
  }
});



const app =express();

const corsOptions = {
  origin: 'http://localhost:3000', 
  credentials: true, 
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));


app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    res.status(400).send('Invalid JSON payload'); // Handle invalid JSON payload error
  } else if (err instanceof PayloadTooLargeError) {
    res.status(413).send('File size too large'); // Handle PayloadTooLargeError
  } else {
    res.status(500).send('Internal Server Error'); // Handle other errors
  }
});
app.use('/uploads', express.static('uploads'));



app.use((req, res, next) => {
    
    next();
});
app.use((req, res, next) => {
    
    next();
});



const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'taskwave',
  password: '1920', 
  port: 5432,
});


 const server = app.listen(3001, ()=> {
  
})

/////////CHATTTT

const io = new Server(server, {
    cors: corsOptions
});
 




////USERS

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users;');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});





app.post('/users', async (req, res) => {
  const { name, email, password } = req.body; // Example body data
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;',
      [name, email, password] // Assuming plaintext password for simplicity
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Helper function to send email
function sendPasswordResetEmail(email, url) {
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: email,
    subject: 'Password Reset for TaskWave',
    html: `<p>You requested a password reset. Click the link below to set a new password:</p><p><a href="${url}">${url}</a></p>`
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}


///Registartionnnnnn


const { v4: uuidv4 } = require('uuid'); // Assuming you have uuid package for generating random names

app.post('/register', (req, res) => {
  const { email, password } = req.body;

  // Check if the provided email already exists in the database
  const emailExistsQuery = 'SELECT COUNT(*) FROM users WHERE email = $1';
  const emailExistsValues = [email];
  pool.query(emailExistsQuery, emailExistsValues, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error during user registration');
    }

    const emailExists = parseInt(result.rows[0].count) > 0;

    if (emailExists) {
      // If email already exists, update the password for that user
      const hash = bcrypt.hashSync(password);
      const updatePasswordQuery = 'UPDATE users SET password = $1 WHERE email = $2';
      const updatePasswordValues = [hash, email];
      pool.query(updatePasswordQuery, updatePasswordValues, (updateErr, updateResult) => {
        if (updateErr) {
          console.error(updateErr);
          return res.status(500).send('Server error during user registration');
        }
        res.json({ message: 'Password updated successfully' });
      });
    } else {
      // If email does not exist, add the user with a random name and hashed password
      const randomName = `user_${uuidv4()}`;
      const hash = bcrypt.hashSync(password);

      const addUserQuery = `
        INSERT INTO users (name, username, email, password)
        VALUES ($1, $2, $3, $4)
      `;
      const addUserValues = [randomName, randomName, email, hash];

      pool.query(addUserQuery, addUserValues, (addErr, addResult) => {
        if (addErr) {
          console.error(addErr);
          return res.status(500).send('Server error during user registration');
        }
        res.json({ message: 'User registered successfully' });
      });
    }
  });
});







///Signinnnnnnnnnnnn

app.post('/signin', (req, res) => {
  const { email, password } = req.body;

  pool.query('SELECT * FROM users WHERE email = $1', [email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error during sign in');
    }

    if (result.rows.length > 0) {
      const user = result.rows[0];

      if (bcrypt.compareSync(password, user.password)) {
        // Setting a cookie named 'userid' with the user's ID, expires after 1 hour
        res.cookie('userid', user.id, {
                  maxAge: 36000000,  // 3600000 ms = 1 hour
                  httpOnly: false,   // Now the cookie is accessible via JavaScript
                  secure: false,  // Use secure in production (cookie over HTTPS)
                  sameSite: 'Lax'    // Lax same-site policy
            });
        
        // Log the cookie that has been set
        
        console.log(user.position);
        res.json({ message: 'success', position: user.position }); // Indicate success if passwords match

      } else {
        return res.status(400).json({ message: 'error logging in' }); // Indicate error if passwords do not match
      }
    } else {
      return res.status(400).json({ message: 'User not found' }); // Indicate error if user is not found
    }
  });
});

// Assuming you have a user model and email sending setup

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Email not found' });
    }
    
    // Generate a reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

    // Here you should save the resetToken to the database with an expiration date
    // Example: saveTokenToDatabase(user.rows[0].id, resetToken);

    // Send password reset email
    sendPasswordResetEmail(email, resetUrl);

    res.json({ message: 'Reset password link has been sent to your email.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



//Logout
app.get('/logout', (req, res) => {
    res.cookie('userid', '', { expires: new Date(0) }); // Clear the userid cookie
    res.send('Logged out successfully');
});










//Profileeeeeeeee

app.get('/profile/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const queryResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (queryResult.rows.length > 0) {
      const user = queryResult.rows[0];
      res.json(user);
    } else {
      res.status(404).json('No such user');
    }
  } catch (err) { 
    console.error(err);
    res.status(500).send('Server error');
  }
});


app.get('/profile', async (req, res) => {
    const userIdFromCookie = req.cookies['userid']; // Retrieve the user ID from the cookie


    if (userIdFromCookie) {
        try {
            const queryResult = await pool.query('SELECT * FROM users WHERE id = $1', [userIdFromCookie]);
            if (queryResult.rows.length > 0) {
                const user = queryResult.rows[0];
                res.json(user);
            } else {
                res.status(404).json('No such user');
            }
        } catch (err) { 
            console.error(err);
            res.status(500).send('Server error');
        }
    } else {
        // If there is no user ID in the cookie, return an unauthorized error
        console.log('No user ID found in cookie');
        res.status(403).json({ message: 'Unauthorized access: No user ID found in cookie' });
    }
});




app.post('/update-profile', async (req, res) => {
  const { id, name, username, birthDate, gender, email, mobile, address, image } = req.body;

  const parsedBirthDate = birthDate === "" ? null : birthDate;

  // Check if the provided email already exists in the database
  const emailExistsQuery = 'SELECT COUNT(*) FROM users WHERE email = $1 AND id != $2';
  const emailExistsValues = [email, id];
  const emailExistsResult = await pool.query(emailExistsQuery, emailExistsValues);
  const emailExists = parseInt(emailExistsResult.rows[0].count) > 0;

  // If email already exists, return a 409 Conflict status with an error message
  if (emailExists) {
    return res.status(409).json({ error: 'Email already exists' });
  }

  // Start building the query and the array of values dynamically
  let query = 'UPDATE users SET';
  let queryValues = [];
  let counter = 1;

  if (name !== undefined) {
    query += ` name = $${counter},`; 
    queryValues.push(name);
    counter++;
  }
  if (username !== undefined) {
    query += ` username = $${counter},`; 
    queryValues.push(username);
    counter++;
  }
  if (birthDate !== undefined) {
    query += ` birthdate = $${counter},`;
    queryValues.push(parsedBirthDate); // Use parsedBirthDate here
    counter++;
  }
  if (gender !== undefined) {
    query += ` gender = $${counter},`; 
    queryValues.push(gender);
    counter++;
  }
  if (email !== undefined) {
    query += ` email = $${counter},`; 
    queryValues.push(email);
    counter++;
  }
  if (mobile !== undefined) {
    query += ` mobile = $${counter},`; 
    queryValues.push(mobile);
    counter++;
  }
  if (address !== undefined) {
    query += ` address = $${counter},`; 
    queryValues.push(address);
    counter++;
  }
  if (image !== undefined) {
    query += ` image = $${counter},`; 
    queryValues.push(image);
    counter++;
  }

  // Remove the last comma and add the WHERE clause
  query = query.slice(0, -1); // Remove the last comma
  query += ` WHERE id = $${counter} RETURNING *;`;

  // Add the 'id' to the values array
  queryValues.push(id);

  try {
    if (queryValues.length > 1) { // Ensure we have at least one field to update plus the id
      const result = await pool.query(query, queryValues);

      if (result.rows.length > 0) {
        res.json({
          message: 'Profile updated successfully',
          userProfile: result.rows[0]
        });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } else {
      res.status(400).json({ message: 'No update fields provided' });
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});





//Employeeeeeee

app.post('/addEmployee', async (req, res) => {
  const { name, role, employee_id, email, position, report_to, birthdate, join_date } = req.body;

  try {
    // Basic form validation
    if (!name || !role || !employee_id || !email || !position || !report_to || !birthdate || !join_date) {
      console.error('Validation error: Please fill in all required fields');
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    // Additional validation logic can be added here

    // Insert the employee data into the database
    const result = await pool.query(
      'INSERT INTO users (name, role, employee_id, email, position, report_to, birthdate, join_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;',
      [name, role, employee_id, email, position, report_to, birthdate, join_date]
    );

    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding employee:', err);
    res.status(500).json({ error: 'Server error during employee addition' });
  }
});




app.put('/editEmployee/:id', async (req, res) => {
  const id = req.params.id;
  const { name, role, employee_id, email, position, report_to, birthdate, join_date } = req.body;

  try {
    // Basic form validation
    if (!name || !role || !employee_id || !email || !position || !report_to || !birthdate || !join_date) {
      console.error('Validation error: Please fill in all required fields');
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    // Additional validation logic can be added here

    // Update the employee data in the database
    const result = await pool.query(
      'UPDATE users SET name = $1, role = $2, employee_id = $3, email = $4, position = $5, report_to = $6, birthdate = $7, join_date = $8 WHERE id = $9 RETURNING *;',
      [name, role, employee_id, email, position, report_to, birthdate, join_date, id]
    );

    if (result.rowCount === 0) {
      console.error('Employee not found');
      return res.status(404).json({ error: 'Employee not found' });
    }

    console.log('Employee updated successfully:', result.rows[0]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ error: 'Server error during employee update' });
  }
});



app.delete('/deleteEmployee/:id', async (req, res) => {
  const id = req.params.id;
  try {
    // Delete the employee from the database
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    // Fetch the updated list of users and send it in the response
    const updatedUsersResult = await pool.query('SELECT * FROM users');
    const updatedUsers = updatedUsersResult.rows;
    res.json(updatedUsers);
  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).send('Server error during employee deletion');
  }
});





//Projectsssssssss

app.get('/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.description,
        p.startDate,
        p.workingHours,
        p.deadline,
        json_build_object(
          'id', u2.id,
          'name', u2.name,
          'role', u2.role,
          'image', u2.image
        ) AS leaderName,
        u1.name AS creator_name,
        p.priority,
        p.activeStatus,
        (
          SELECT json_agg(DISTINCT tasks)
          FROM (
            SELECT
              pt.id,
              pt.status,
              u3.name AS assignee,
              u3.image AS assignee_image,
              pt.description,
              pt.deadline
            FROM 
              Project_Tasks pt
              LEFT JOIN users u3 ON pt.assignee = u3.id
            WHERE 
              pt.project_id = p.id
          ) AS tasks
        ) AS tasks,
        (
          SELECT json_agg(DISTINCT files)
          FROM (
            SELECT
              f.id,
              f.name,
              u4.name AS creator,
              f.size,
              f.date,
              f.src,
              pt.description as task_description
            FROM 
              Files f
              LEFT JOIN Project_Tasks pt ON f.id = pt.solution_file_id
              LEFT JOIN users u4 ON f.creator = u4.id
            WHERE 
              f.project_id = p.id
          ) AS files
        ) AS files,
        (
          SELECT json_agg(
            json_build_object(
              'id', u5.id,
              'name', u5.name,
              'role', u5.role,
              'image', u5.image
            )
          ) 
          FROM project_team pm
          JOIN users u5 ON pm.user_id = u5.id
          WHERE pm.project_id = p.id
        ) AS team
      FROM 
        Projects p 
        LEFT JOIN users u1 ON p.creator = u1.id
        LEFT JOIN users u2 ON p.leaderName = u2.id
      GROUP BY
        p.id, p.title, p.description, p.startDate, p.workingHours, p.deadline,
        u1.name, u2.id, u2.name, u2.role, u2.image, p.priority, p.activeStatus;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});



// Set up storage for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads'); // Save files to the 'uploads' folder
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname); // Use unique filenames
    }
});

// Create multer instance
const upload = multer({ storage: storage });

//create
app.post('/projects', upload.array('files'), async (req, res) => {
 
  const { title, description,  workinghours, creator, leadername, priority, activestatus, team } = req.body;
  const files = req.files; // Accessing files from multer
  

  let { tasks } = req.body;
  
  
  // Parse tasks if it's a string
  if (typeof tasks === 'string') {
    try {
      tasks = JSON.parse(tasks);
    } catch (err) {
      console.error('Error parsing tasks:', err);
      return res.status(400).json({ error: 'Invalid tasks format' });
    }
  }




  const startdate = new Date(req.body.startdate).toISOString();
  const deadline = new Date(req.body.deadline).toISOString();
   const baseUrl = req.protocol + '://' + req.get('host');

  try {

    // Basic form validation
    if (!title || !description || !startdate || !workinghours || !deadline || !creator || !leadername || !priority || !activestatus || !team) {
      console.error('Validation error: Please fill in all required fields');
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    // Additional validation logic can be added here





    // Insert the project data into the database
    const projectResult = await pool.query(
      'INSERT INTO projects (title, description, startdate, workinghours, deadline, creator, leadername, priority, activestatus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;',
      [title, description, startdate, workinghours, deadline, creator, leadername, priority, activestatus]
    );

    const project = projectResult.rows[0];
    const projectId = project.id;

    // Parse the team members from the request and insert into project_members
    const teamMembers = team.split(',').map(id => parseInt(id.trim())); // Convert to array of integers
    const memberInsertQueries = teamMembers.map(userId => {
      return pool.query(
        'INSERT INTO project_team (user_id, project_id) VALUES ($1, $2);',
        [userId, projectId]
      );
    });
    await Promise.all(memberInsertQueries);


    const fileData = files.map(file => ({
      name: file.originalname,
      size: file.size,
      date: new Date().toISOString(),
      src: `${baseUrl}/uploads/${file.filename}` // Store file path instead of Blob URL
    }));

    // Insert files into the database
    if (fileData && fileData.length > 0) {
      const fileInsertQueries = fileData.map(file => {
        return pool.query(
          'INSERT INTO files (name, size, date, src, project_id) VALUES ($1, $2, $3, $4, $5);',
          [file.name, file.size, new Date().toISOString(), file.src, projectId]
        );
      });
      await Promise.all(fileInsertQueries);
    }

    // Insert tasks into the database
    if (tasks && tasks.length > 0) {
      await Promise.all(tasks.map(task => {
        return pool.query(
          'INSERT INTO Project_Tasks (project_id, description, deadline,status) VALUES ($1, $2, $3, $4);',
          [projectId, task.description, new Date(task.deadline).toISOString(),0]
        );
      }));
    }

    // Send a success response with the created project object
    res.status(201).json(project);
  } catch (error) {
    // If an error occurs, send an error response
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});


//update project details

app.put('/projects/:projectId', upload.none(), async (req, res) => {
    const { projectId } = req.params;
    const { title, description, startdate, workinghours, deadline, creator, leadername, priority, activestatus, team } = req.body;

    try {
        await pool.query('BEGIN');

        // Update project information
        const updateProjectQuery = `
            UPDATE projects SET
                title = $1, description = $2, startdate = $3, workinghours = $4,
                deadline = $5, creator = $6, leadername = $7, priority = $8,
                activestatus = $9
            WHERE id = $10;
        `;
        const projectValues = [
            title, description, new Date(startdate).toISOString(), workinghours,
            new Date(deadline).toISOString(), creator, leadername, priority,
            activestatus, projectId
        ];
        await pool.query(updateProjectQuery, projectValues);

        // Clear existing team members
        await pool.query('DELETE FROM project_team WHERE project_id = $1', [projectId]);

        // Split and trim team member IDs from the input, then insert them
        const teamMembers = team.split(',').map(id => parseInt(id.trim()));
        for (let userId of teamMembers) {
            const insertQuery = 'INSERT INTO project_team (user_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;';
            await pool.query(insertQuery, [userId, projectId]);
        }

        await pool.query('COMMIT');
        res.status(200).json({ message: 'Project updated successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Transaction rolled back due to an error:', error);
        res.status(500).json({ error: 'Database operation failed', details: error.message });
    }
});






//delete
app.delete('/projects/:id', async (req, res) => {
  const projectId = req.params.id;
  try {

    // First, delete notifications related to all tasks of this project
    await pool.query(`
      DELETE FROM notifications 
      WHERE task_id IN (
        SELECT id FROM project_tasks WHERE project_id = $1
      )
    `, [projectId]);
    // Delete tasks associated with the project from the project_tasks table
    await pool.query('DELETE FROM project_tasks WHERE project_id = $1', [projectId]);

    // Delete files associated with the project (assuming you have a files table)
    await pool.query('DELETE FROM files WHERE project_id = $1', [projectId]);

    // Delete project team members (assuming you have a project_team_members table)
    await pool.query('DELETE FROM project_team WHERE project_id = $1', [projectId]);

    // Now delete the project from the projects table
    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);

    // Fetch the updated list of projects and send it in the response
    const updatedProjectsResult = await pool.query('SELECT * FROM projects');
    const updatedProjects = updatedProjectsResult.rows;
    res.json(updatedProjects);
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).send('Server error during project deletion');
  }
});


//upload solution
app.post('/projects/:projectId/tasks/:taskId/solutionFiles', upload.array('files'), async (req, res) => {
    console.log('Cookies at the start:', req.cookies);
    const { projectId, taskId } = req.params;
    const taskResult = await pool.query('SELECT description FROM project_tasks WHERE id = $1', [taskId]);
    const taskName =taskResult.rows[0].description
    console.log('projectId',projectId);

    const userIdFromCookie = req.cookies['userid']; 
    console.log('creatorId', userIdFromCookie);

    const files = req.files;
    const baseUrl = req.protocol + '://' + req.get('host');

    try {
        // Ensure projectId and taskId are provided
        if (!projectId || !taskId) {
            return res.status(400).json({ error: 'Project ID and Task ID must be provided' });
        }

        // Check if the project and task exist
        const projectCheck = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
        const taskCheck = await pool.query('SELECT * FROM project_tasks WHERE id = $1', [taskId]);

        if (projectCheck.rows.length === 0 || taskCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Project or Task not found' });
        }

        // Handle file data
        const fileData = files.map(file => ({
            name: file.originalname,
            size: file.size,
            date: new Date().toISOString(),
            src: `${baseUrl}/uploads/${file.filename}`, // Full URL to access the file
            creator: req.cookies.userid // Assuming the creator ID is stored in cookies
        }));

        // Insert files into the database
        const fileInsertQueries = fileData.map(file => {
            return pool.query(
                'INSERT INTO files (project_id, name, creator, size, date, src) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;',
                [projectId, file.name, file.creator, file.size, file.date, file.src]
            );
        });

        const fileIds = await Promise.all(fileInsertQueries);

        // Link files to the task
        const linkTasksToFile = fileIds.map(fileId => {
            return pool.query(
                'UPDATE project_tasks SET solution_file_id = $1 WHERE id = $2',
                [fileId.rows[0].id, taskId] // Assuming task table has a 'solution_file_id' column
            );
        });

        await Promise.all(linkTasksToFile);

        res.status(201).json({ message: 'Files uploaded and linked successfully', files: fileData });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});



// Assign user to task
app.post('/assign', async (req, res) => {
  const { taskId, userId,projectId } = req.body;
  
  try {
    // Update project tasks
    const updateQuery = `
      UPDATE project_Tasks
      SET assignee = $1
      WHERE id = $2;
    `;
    const result = await pool.query(updateQuery, [userId, taskId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Fetch task description from project_Tasks table
    const taskQuery = ` SELECT description FROM project_Tasks WHERE id = $1;`;
    const taskResult = await pool.query(taskQuery, [taskId]);
    const taskDescription = taskResult.rows[0].description;

    // Fetch user's name from users table
    const userQuery = ` SELECT name FROM users WHERE id = $1; `;
    const userResult = await pool.query(userQuery, [userId]);
    const userName = userResult.rows[0].name;

     // Insert a new notification into the notifications table
    const notificationMessage = `New task "${taskDescription}" assigned to ${userName} `;
    const insertNotificationQuery = `
      INSERT INTO notifications (user_id, task_id, project_id, message, timestamp)
      VALUES ($1, $2, $3, $4, NOW());
    `;
    await pool.query(insertNotificationQuery, [userId, taskId, projectId, notificationMessage]);


    res.json({ message: 'Task assigned successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


//updatestatus
app.post('/updateTaskStatus', async (req, res) => {
  try {
    const { taskId, newStatus } = req.body;

    // Validate inputs
    if (!taskId || !newStatus) {
      return res.status(400).json({ error: 'Missing taskId or newStatus in request body' });
    }

    // Update the task status in the database
    const updateQuery = `
      UPDATE project_tasks
      SET status = $1
      WHERE id = $2;
    `;
    const result = await pool.query(updateQuery, [newStatus, taskId]);

    // Check if the task was found and updated
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found or status not updated' });
    }
    
    io.emit('taskUpdated');
    res.status(200).json({ message: 'Task status updated successfully' });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// delete files
app.delete('/files/:fileId', async (req, res) => {
    const { fileId } = req.params;

    console.log('Attempting to delete file with ID:', fileId);

    try {
        // First, check if the file exists in the database
        const fileQueryResult = await pool.query('SELECT * FROM files WHERE id = $1', [fileId]);
        if (fileQueryResult.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Since file exists, proceed to delete the file record from the database
        const deleteQuery = await pool.query('DELETE FROM files WHERE id = $1', [fileId]);
        if (deleteQuery.rowCount === 0) {
            // If no rows were affected, the file was not deleted
            return res.status(404).json({ error: 'Failed to delete file' });
        }

        // Return success message
        res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});



//// Notifications 
app.get('/notifications', async (req, res) => {
    try {
        const query = `
            SELECT * FROM notifications
            ORDER BY timestamp DESC;  
        `;
        const result = await pool.query(query);
        if (result.rows.length > 0) {
            res.json(result.rows);
        } else {
            res.status(404).json({ message: 'No notifications found' });
        }
    } catch (error) {
        console.error('Error retrieving notifications:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});






////chat
io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`New user connected with ID: ${userId} and socket ID: ${socket.id}`);

    socket.on('chatMessage', async (data) => {
        const { projectId, message } = data;
        try {
            const query = 'INSERT INTO chat_messages (project_id, user_id, message, timestamp) VALUES ($1, $2, $3, $4)';
            await pool.query(query, [projectId, userId, message, new Date()]);
            io.emit('newMessage', { userId, message, projectId, timestamp: new Date() }); // Broadcast to all clients
            console.log(`Message from ${userId}: ${message}`);
        } catch (error) {
            console.error(`Failed to save message: ${error}`);
            socket.emit('errorMessage', 'Failed to send message due to server error.');
        }
    });

    socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);
    });
});




  app.get('/chat/:projectId', async (req, res) => {
    const { projectId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM chat_messages WHERE project_id = $1 ORDER BY timestamp ASC', [projectId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching chat messages:', err);
        res.status(500).send('Server error fetching messages');
    }
});

  //all messages 
  app.get('/chat', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                cm.message,
                cm.timestamp,
                cm.user_id,
                cm.project_id,
                u.name,
                u.image
            FROM chat_messages cm
            JOIN users u ON cm.user_id = u.id
            ORDER BY cm.timestamp DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching all chat messages with user details:', err);
        res.status(500).send('Server error fetching messages');
    }
});

module.exports = { app, server, pool };

