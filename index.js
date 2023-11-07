const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()

const app = express();

// middleware 
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.PASS_SECRET}@cluster0.gbdj4eh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const hotelNestDB = client.db("hotelNestDB");
        const roomsCollection = hotelNestDB.collection("roomsCollection");

        // room page related api 
        app.get("/rooms", async(req, res) => {
            const query = {};
            const options = {
                projection: {
                    total_review: 1, title: 1, thumbnail_image: 1, cost_per_night: 1
                },
            };
            const cursor = roomsCollection.find(query, options);
            const allRooms = await cursor.toArray();
            
            res.send(allRooms)
        });
       


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.listen(port, () => {
    console.log(`Hotel Nest server running on port : ${port}`);
})