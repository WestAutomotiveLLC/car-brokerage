const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (your HTML pages)
app.use(express.static('.'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
