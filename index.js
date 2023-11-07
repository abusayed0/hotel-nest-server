const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;

const app = express();

// middleware 
app.use(cors());
app.use(express.json());


// all api 
app.get("/", (req, res) => {
    res.send("What's Up!!!!")
});



app.listen(port, () => {
    console.log(`Hotel Nest server running on port : ${port}`);
})