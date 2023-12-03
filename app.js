const express = require('express');
const multer = require('multer');
const readline = require('readline');
const fs = require('fs');
const mysql = require('mysql2/promise');

const app = express();
const port = 3000;

const pool = mysql.createPool({
  user: 'root',
  host: '127.0.0.1',
  database: 'project',
  password: '0000',
  port: 3306,
});

app.use(express.json());
app.use(express.static('public')); // Assuming your HTML files are in a 'public' directory
const upload = multer({ dest: 'uploads/' });

// Serve your HTML form
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

// Handle file upload and insert data into MySQL
app.post('/', upload.single('file'), (req, res) => {
  // console.log(req.file)
  const fileStream = fs.createReadStream(req.file.path);

  try {
    // Create a readline interface to read the file buffer line by line
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let firstLine = true;

    // Event listener for each line in the TSV file
    rl.on('line', async (line) => {
      // first line contains the names of the fields
      if (firstLine) {
        firstLine = false;
        return;
      }

      // Split the line into an array of values
      const values = line.split('\t');

      // Replace '\N' with null
      const cleanValues = values.map((field) =>
        field === '\\N' ? null : field
      );
      
      const queryText = `
      INSERT INTO title 
      (tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, 
      endYear, runtimeMinutes, genres, img_url_asset) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      try {
        await pool.query(queryText, cleanValues);
      } catch (error) {
        console.log(error);
      }
    });

    // Event listener for the end of the file
    rl.on('close', () => {
      console.log('File processed successfully');
      res.status(200).send('Data inserted successfully');
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
