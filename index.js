const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const bookingDateCollection = hotelNestDB.collection("bookingDateCollection");
        const usersBookingsCollection = hotelNestDB.collection("usersBookingsCollection");

        // rooms page related api 
        app.get("/rooms", async (req, res) => {
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

        // room details page related api 
        app.get("/room/:id", async (req, res) => {
            const roomId = req.params.id;

            const query = { _id: new ObjectId(roomId) };

            const room = await roomsCollection.findOne(query);
            res.send(room);
        });
        app.get("/booking-data", async (req, res) => {
            const { bookedDate, roomId } = req.query;
            console.log(bookedDate);
            const query = { roomId: roomId, bookedDate: bookedDate };

            // Execute query
            const roomBookingData = await bookingDateCollection.findOne(query);
            console.log(roomBookingData);
            if (!roomBookingData) {
                res.send({
                    status: "all room available"
                })
            }
            else {
                res.send({
                    restSeat: roomBookingData.restSeat
                })
            }

        });
        app.post("/booking-data", async (req, res) => {
            const bookingData = req.body;
            const { bookedDate, roomId } = bookingData;
            const query = { roomId: roomId, bookedDate: bookedDate };
            const exist = await bookingDateCollection.findOne(query);

            console.log(exist);
            if (!exist) {
                const result = await bookingDateCollection.insertOne(bookingData);
                res.send(result)
            }
            else {
                const updateDoc = {
                    $inc: {
                        restSeat: -1
                    },
                };
                const result = await bookingDateCollection.updateOne(query, updateDoc);
                res.send(result)
            }
        });

        app.post("/users-bookings", async (req, res) => {
            const bookingInfo = req.body;
            console.log(bookingInfo);
            const result = await usersBookingsCollection.insertOne(bookingInfo);
            res.send(bookingInfo);
        });

        // booking page related api 
        app.get("/my-bookings", async(req, res) => {
            const requestedUserEmail = req.query.email;
            console.log(requestedUserEmail);
           
            const query = { userEmail : requestedUserEmail };
            const cursor = await usersBookingsCollection.find(query).toArray();

            res.send(cursor)
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