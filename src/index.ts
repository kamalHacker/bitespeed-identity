import "dotenv/config";

import express from 'express';
import identifyRouter from './routes/identify';


const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Bitespeed Identity Service running' });
});

app.use('/identify', identifyRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;