const express = require('express');
const axios = require('axios');

const { Pool } = require('pg');

const app = express();
const port = 8070;

// PostgreSQL veritabanı bağlantı ayarları
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgress',
  port: 5432
});

// GET isteği kabul etme
app.get('/', (req, res) => {
  // İstek parametrelerini alın
  const { longitude, latitude, radius } = req.query;

  // PostgreSQL sorgusu için parametreler
  const queryParams = [longitude, latitude, radius];

  // PostgreSQL sorgusu
  const query = `
    SELECT response_data
    FROM cached_responses
    WHERE longitude = $1
      AND latitude = $2
      AND radius = $3
    LIMIT 1
  `;

  // PostgreSQL veritabanından cevabı alma
  pool.query(query, queryParams, (error, results) => {
    if (error) {
      console.log('PostgreSQL Query Error:', error);
      res.status(500).json({ error: 'An error occurred' });
    } else if (results.rowCount > 0) {
      // Veritabanında kayıtlı cevap varsa, onu döndür

      console.log(JSON.parse(results.rows[0].response_data))
     return  res.json(JSON.parse(results.rows[0].response_data));
    } else {
      // Google Places API'ye istek gönder
      axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${longitude}%${latitude}&radius=${radius}&key=secret`, {
      })
        .then((response) => {

            console.log('Google Places API Response:', response.data);
          // Cevabı PostgreSQL veritabanına kaydetme
          const insertQuery = `
            INSERT INTO cached_responses (longitude, latitude, radius, response_data)
            VALUES ($1, $2, $3, $4)
          `;
          const insertParams = [longitude, latitude, radius, JSON.stringify(response.data)];

          pool.query(insertQuery, insertParams, (insertError) => {
            if (insertError) {
              console.log('PostgreSQL Insert Error:', insertError);
            }
          });

          // Cevabı döndür
          res.json(response.data);
        })
        .catch((error) => {
          console.log('Google Places API Error:', error);
          res.status(500).json({ error: 'An error occurred' });
        });
    }
  });
});

// Sunucuyu dinleme
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
