import express from 'express';
import corsAnywhere from 'cors-anywhere';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const API_KEY = 'AIzaSyD76pxre8mt15zwjL7fxlZjJZfmnGtkDnI';
const SHEET_ID = '18xycNIvtDSotyKdIaLmapDb8I1-ErOIGspJs_36QuGM';
const RANGE = `A:EJ`;

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Serve static files (like HTML) from the public directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint
app.use('/proxy', (req, res) => {
  req.url = req.url.replace('/proxy/', '/'); // Adjust URL path for CORS-anywhere
  corsProxy.emit('request', req, res);
});

// Route to handle schedule requests via CORS-Anywhere proxy
app.post('/schedule', async (req, res) => {
  const { value1, value2, value3 } = req.body; // Destructure the values
  console.log(req.body)
  console.log(value1); // Log the extracted values
  console.log(value2);
  console.log(value3);

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
      console.log('Matching Row:', matchingRow);

      if (matchingRow) {
        const formData = new URLSearchParams();
        // Create a new Date object for the current date
        const today = new Date();

        const offset = 3 * 60; // GMT+3 is 180 minutes ahead of GMT
        today.setMinutes(today.getMinutes() + offset);
        const formatDate = (date) => {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
          const year = date.getFullYear();
        return `${day}.${month}.${year}`;
        };

        // Calculate the date one week later
        const oneWeekLater = new Date(today);
        oneWeekLater.setDate(today.getDate() + value3);
        console.log(formatDate(today));
        console.log(formatDate(oneWeekLater));

        // Append dates to formData
        formData.append('data[DATE_BEG]', formatDate(today));
        formData.append('data[DATE_END]', formatDate(oneWeekLater));

        // Use a for...of loop to iterate over matchingRow
        for (const item of matchingRow) {
          try {
            const response = await fetch(`http://localhost:8080/https://schedule.kse.ua/index/groups?term=${encodeURIComponent(item.trimEnd())}`, {
                method: 'GET',
                headers: {
                  'accept': '*/*',
                  'accept-encoding': 'gzip, deflate, br, zstd',
                  'accept-language': 'en-GB,en;q=0.9,uk-UA;q=0.8,uk;q=0.7,en-US;q=0.6',
                  'content-type': 'application/json; charset=windows-1251',
                  'cookie': '_gcl_au=1.1.104818267.1721477599; _fbp=fb.1.1721477599144.35051698138318847; _hjSessionUser_3480894=eyJpZCI6IjM1N2U5NWRjLTYwNDAtNWY3YS1hOGY4LTNlMmUxMzMyMGQxMyIsImNyZWF0ZWQiOjE3MjE0Nzc1OTkyMTksImV4aXN0aW5nIjp0cnVlfQ==; __stripe_mid=7ec0ffe6-e59e-47ac-87fc-c63db7a8c44b70d483; _ga_SKBH35BKS0=GS1.2.1721649875.1.0.1721649882.0.0.0; _clck=qzjjxq%7C2%7Cfnp%7C0%7C1662; PHPSESSID=30s95ni55p37rbp44401s5cbk3; lang=uk',
                  'origin': 'https://schedule.kse.ua',
                  'referer': 'https://schedule.kse.ua/',
                  'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                  'sec-ch-ua-mobile': '?0',
                  'sec-ch-ua-platform': '"Windows"',
                  'sec-fetch-dest': 'empty',
                  'sec-fetch-mode': 'cors',
                  'sec-fetch-site': 'same-origin',
                  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                  'x-requested-with': 'XMLHttpRequest'
                },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log(data.result);
            formData.append('data[KOD_GROUP][]', data.result[0].id);
            console.log(data.result[0].id);
          } catch (error) {
            console.error('Error fetching schedule:', error);
        }
        }

        formData.append('data[ID_FIO]', '0');
        formData.append('data[ID_AUD]', '0');
        formData.append('data[PUB_DATE]', '0');
        formData.append('resetCache', 'false');

        // Make the request to the schedule only after finding the matching row
        try {
          const scheduleResponse = await fetch('http://localhost:8080/https://schedule.kse.ua/index/schedule', {
            method: 'POST',
            headers: {
              'accept': '*/*',
              'accept-encoding': 'gzip, deflate, br, zstd',
              'accept-language': 'en-GB,en;q=0.9,uk-UA;q=0.8,uk;q=0.7,en-US;q=0.6',
              'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'cookie': '_gcl_au=1.1.104818267.1721477599; _fbp=fb.1.1721477599144.35051698138318847; _hjSessionUser_3480894=eyJpZCI6IjM1N2U5NWRjLTYwNDAtNWY3YS1hOGY4LTNlMmUxMzMyMGQxMyIsImNyZWF0ZWQiOjE3MjE0Nzc1OTkyMTksImV4aXN0aW5nIjp0cnVlfQ==; __stripe_mid=7ec0ffe6-e59e-47ac-87fc-c63db7a8c44b70d483; _ga_SKBH35BKS0=GS1.2.1721649875.1.0.1721649882.0.0.0; _clck=qzjjxq%7C2%7Cfnp%7C0%7C1662; PHPSESSID=30s95ni55p37rbp44401s5cbk3',
              'origin': 'https://schedule.kse.ua',
              'referer': 'https://schedule.kse.ua/',
              'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
              'sec-ch-ua-mobile': '?0',
              'sec-ch-ua-platform': '"Windows"',
              'sec-fetch-dest': 'empty',
              'sec-fetch-mode': 'cors',
              'sec-fetch-site': 'same-origin',
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
              'x-requested-with': 'XMLHttpRequest'
            },
            body: formData
          });

          const scheduleData = await scheduleResponse.json();
          res.json(scheduleData);
        } catch (error) {
          console.error('Error fetching schedule:', error);
          res.status(500).send('Error fetching schedule');
        }
      } else {
        console.log('No matching row found.');
        res.status(404).send('No matching row found.');
      }
    } else {
      console.log('No data found.');
      res.status(404).send('No data found.');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});


// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

// Start the CORS-Anywhere proxy server
const corsServer = corsAnywhere.createServer({});
corsServer.listen(8080, 'localhost', () => {
  console.log('CORS-Anywhere running on http://localhost:8080');
});

function findMatchingRow(rows, x, y) {
  for (let i = 0; i < rows.length; i++) {
      const col1 = rows[i][0] || ''; // Column A (index 0)
      const col2 = rows[i][1] || ''; // Column B (index 1)

      if (col1.toLowerCase() === x.toLowerCase() && col2.toLowerCase() === y.toLowerCase()) {
          const matchingRow = rows[i];

          // Slice the row from column E (index 4) onwards
          const slicedRow = matchingRow.slice(4);

          // Filter out null, undefined, and empty values from the sliced row
          const filteredRow = slicedRow.filter(value => value !== null && value !== undefined && value !== '');

          console.log(`Match found in row ${i + 1}:`, filteredRow);
          return filteredRow; // Return the filtered row starting from column E
      }
  }
  console.log('No match found.');
}