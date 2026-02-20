const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

const environment = process.env.NODE_ENV || 'development';

const result = dotenv.config({ path: `.env.${environment}` });

if (result.error) {
  throw result.error;
}

const app = express();

app.use(
  cors({
    //origin: 'http://31.97.131.1:5173',
    origin: true,
    credentials: true
  })
);

app.use(express.json());

//passar rotas para padrao REST

const merchantRoutes = require('./routes/mct');
app.use('/api', merchantRoutes);

const admRoutes = require('./routes/adm');
app.use('/api', admRoutes);

//seguir

const accountRoutes = require('./routes/acc');
app.use('/api/acc', accountRoutes);

module.exports = app;
