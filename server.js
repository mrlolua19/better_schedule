import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const API_KEY = 'AIzaSyD76pxre8mt15zwjL7fxlZjJZfmnGtkDnI';
const SHEET_ID = '18xycNIvtDSotyKdIaLmapDb8I1-ErOIGspJs_36QuGM';
const RANGE = `A:EJ`;

const app = express();

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (like HTML) from the public directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Route to handle schedule requests
app.post('/schedule', async (req, res) => {
  const { value1, value2, value3 } = req.body;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const rows = data.values;

    if (rows && rows.length > 0) {
      const matchingRow = findMatchingRow(rows, value1.trimEnd(), value2.trimEnd());
      
      if (matchingRow) {
        const formData = new URLSearchParams();
        const today = new Date();
        const offset = 3 * 60;
        today.setMinutes(today.getMinutes() + offset);

        const formatDate = (date) => {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}.${month}.${year}`;
        };

        const oneWeekLater = new Date(today);
        oneWeekLater.setDate(today.getDate() + parseInt(value3));

        formData.append('data[DATE_BEG]', formatDate(today));
        formData.append('data[DATE_END]', formatDate(oneWeekLater));

        for (const item of matchingRow) {
          try {
            const scheduleResponse = await fetch(`https://schedule.kse.ua/index/groups?term=${encodeURIComponent(item.trimEnd())}`, {
              method: 'GET',
              headers: {
                'accept': '*/*',
                'content-type': 'application/json; charset=windows-1251',
                'origin': 'https://schedule.kse.ua',
              },
            });

            if (!scheduleResponse.ok) {
              throw new Error('Network response was not ok');
            }

            const scheduleData = await scheduleResponse.json();
            formData.append('data[KOD_GROUP][]', scheduleData.result[0].id);

          } catch (error) {
            console.error('Error fetching group data:', error);
          }
        }

        formData.append('data[ID_FIO]', '0');
        formData.append('data[ID_AUD]', '0');
        formData.append('data[PUB_DATE]', '0');
        formData.append('resetCache', 'false');

        try {
          const finalResponse = await fetch('https://schedule.kse.ua/index/schedule', {
            method: 'POST',
            headers: {
              'accept': '*/*',
              'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            body: formData,
          });

          const finalData = await finalResponse.json();
          res.json(finalData);

        } catch (error) {
          console.error('Error posting schedule:', error);
          res.status(500).send('Error posting schedule');
        }
      } else {
        res.status(404).send('No matching row found.');
      }
    } else {
      res.status(404).send('No data found.');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function findMatchingRow(rows, x, y) {
  for (let i = 0; i < rows.length; i++) {
    const col1 = rows[i][0] || ''; 
    const col2 = rows[i][1] || ''; 

    if (col1.toLowerCase() === x.toLowerCase() && col2.toLowerCase() === y.toLowerCase()) {
      const matchingRow = rows[i].slice(4).filter(value => value);
      return matchingRow;
    }
  }
}
