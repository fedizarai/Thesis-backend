const express =require('express');
const bodyParser= require('body-parser');
const cors= require('cors');
const bcrypt = require('bcrypt-nodejs');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const { Server } = require("socket.io");



const app =express();

const corsOptions = {
  origin: 'http://localhost:3000', 
  credentials: true, 
};

app.use(cors(corsOptions));

app.use(bodyParser.json({ limit: '50mb' }));

app.use(cors());

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

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'taskwave',
  password: '1920', 
  port: 5432,
});





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




///Registartionnnnnn

app.post('/register', (req, res) => {
  const { name, username, birthdate, gender, reportTo, address, role, employee_id, email, password, mobile, joindate, project, position } = req.body;

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
      // If email does not exist, return an error message
      return res.status(403).json({ error: 'Email is not allowed to have an account' });
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

      // Using bcrypt-nodejs to compare password
      if (bcrypt.compareSync(password, user.password)) {
        res.json('success'); // Passwords match
      } else {
        res.status(400).json('error logging in'); // Passwords do not match
      }
    } else {
      res.status(400).json('User not found');
    }
  });
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

    console.log('Employee added successfully:', result.rows[0]);
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
              f.name,
              u4.name AS creator,
              f.size,
              f.date,
              f.src
            FROM 
              Files f
              LEFT JOIN users u4 ON f.creator = u4.id
            WHERE 
              f.project_id = p.id
          ) AS files
        ) AS files,
        (
          SELECT json_agg(
            json_build_object(
              'name', u5.name,
              'role', u5.role,
              'image', u5.image
            )
          ) 
          FROM users u5
          WHERE u5.project_id = p.id
        ) AS team
      FROM 
        Projects p 
        LEFT JOIN users u1 ON p.creator = u1.id
        LEFT JOIN users u2 ON p.leaderName = u2.id
      GROUP BY
        p.id, p.title, p.description, p.startDate, p.workingHours, p.deadline,
        u1.name, u1.role, u1.image, u2.name, u2.role, u2.image, p.priority, p.activeStatus;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


// // Define a function to update the project_id column of users
// const updateUsersProjectId = async (projectId, team) => {
//   try {
//     // Update the project_id column for users with matching team IDs
//     await User.update({ project_id: projectId }, {
//       where: {
//         id: team
//       }
//     });
//     console.log('Project IDs updated for users:', team);
//   } catch (error) {
//     console.error('Error updating project IDs for users:', error);
//     throw error; // You can handle the error based on your application's requirements
//   }
// };


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


app.post('/projects', upload.array('files'), async (req, res) => {
 
  const { title, description,  workinghours, creator, leadername, priority, activestatus, team } = req.body;
  const files = req.files; // Accessing files from multer
  console.log('Body:', req.body);
  console.log('Files:', req.files);

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

  console.log(typeof tasks, tasks);


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

    // Update the project_id column for users in the team
    // await updateUsersProjectId(projectId, team);


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









const server = app.listen(3001, ()=> {
  console.log('app is runnning on port 3001');
})

const io = new Server(server, {
    cors: {corsOptions},
});

io.on('connection', (socket) => {
    console.log('New User connected');

    socket.on('onTextChange', (data) => {
        console.log(`Message from client: ${data.text}, whoose id is: ${data.from}`);
        io.emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});