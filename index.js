const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();

// middleware 
app.use(cors({
    origin: [
        // "http://localhost:5173"
        "https://hotel-nest.netlify.app"
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// custom middleware 
const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    console.log("token inside verify", token);
    if (!token) {
        return res.status(401).send({ messsage: "Unauthorized" })
    }
    jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
        if (err) {
            console.log("token erro", err);
            return res.status(401).send({ messsage: "Unauthorized" })
        }
        req.user = decoded;
        console.log("decoded", decoded);
        next();
    });
}



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
        const reviewsCollection = hotelNestDB.collection("reviewsCollection");

        // auth related api 
        app.post("/jwt", (req, res) => {
            const user = req.body;
            console.log("token created for", user);
            const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: "1h" });

            res
                .cookie("token", token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: "none",
                })
                // .send({ success: true,token })
                .send({ success: true })
        });
        app.post("/sign-out", (req, res) => {
            const { email } = req.body;
            console.log("sign out user", email);
            res
                .clearCookie("token")
                .send({ success: true });
        });

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
        })

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


            const roomBookingData = await bookingDateCollection.findOne(query);
            console.log({ exist: roomBookingData });
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
            // console.log(bookingInfo);
            const result = await usersBookingsCollection.insertOne(bookingInfo);
            res.send(result);
        });

        app.get("/reviews", async (req, res) => {
            const { roomId } = req.query;
            console.log(roomId);
            const query = { roomId: roomId };
            const cursor = await reviewsCollection.find(query).toArray();
            res.send(cursor)
        });

        // booking page related api 
        app.get("/my-bookings", verifyToken, async (req, res) => {
            const tokenOwner = req.user.email;
            console.log(tokenOwner);
            const requestedUserEmail = req.query.email;
            console.log(requestedUserEmail);
            if (tokenOwner !== requestedUserEmail) {
                return res.status(403).send({ messsage: "Forbidden" })
            }
            const query = { userEmail: requestedUserEmail };
            const cursor = await usersBookingsCollection.find(query).toArray();

            res.send(cursor)
        });
        app.delete("/my-bookings", async (req, res) => {
            const bookingId = req.query.bookingId;
            const query = { _id: new ObjectId(bookingId) };
            const result = await usersBookingsCollection.deleteOne(query);
            res.send(result);
        });
        app.patch("/booking-data", async (req, res) => {
            const bookingData = req.body;
            const { bookedDate, roomId } = bookingData;
            const filter = { roomId: roomId, bookedDate: bookedDate };
            const updateDoc = {
                $inc: {
                    restSeat: 1
                },
            };
            const result = await bookingDateCollection.updateOne(filter, updateDoc);

            res.send(result);
        });

        // update booking date page related api 
        app.get("/my-bookings/:id", async (req, res) => {
            const bookingId = req.params.id;

            const query = { _id: new ObjectId(bookingId) };

            const booking = await usersBookingsCollection.findOne(query);
            res.send(booking)
        });

        app.patch("/my-bookings/:id", async (req, res) => {
            const bookingId = req.params.id;
            const { date: updatedDate } = req.body;
            console.log(updatedDate);
            const filter = { _id: new ObjectId(bookingId) };
            const updateDoc = {
                $set: {
                    bookedDate: updatedDate
                },
            };
            const result = await usersBookingsCollection.updateOne(filter, updateDoc);
            console.log(bookingId);
            res.send(result)
        });
        app.patch("/update/booking-data", async (req, res) => {
            const { preDate, newDate, roomId, restSeat } = req.body;
            console.log(req.body);
            const filter1 = { bookedDate: preDate, roomId: roomId };
            const updateDoc1 = {
                $inc: {
                    restSeat: 1
                },
            };
            const result = await bookingDateCollection.updateOne(filter1, updateDoc1);
            console.log({ important: result });
            const query = { bookedDate: newDate, roomId: roomId };

            const search = await bookingDateCollection.findOne(query);
            if (search) {
                const updateDoc2 = {
                    $inc: {
                        restSeat: -1
                    },
                };
                const result2 = await bookingDateCollection.updateOne(filter1, updateDoc2);
                res.send(result2)
            }
            else {
                const bookingData = { roomId: roomId, bookedDate: newDate, restSeat: restSeat }
                const result3 = await bookingDateCollection.insertOne(bookingData);
                res.send(result3);
            }

        });

        // review page realted api 
        app.post("/reviews", async (req, res) => {
            const reviewInfo = req.body;
            const { roomId } = reviewInfo;
            const result = await reviewsCollection.insertOne(reviewInfo);
            if (result.insertedId) {
                const query = { _id: new ObjectId(roomId) };
                const newReviewCount = {
                    $inc: {
                        total_review: 1
                    },
                };
                const updateRoomData = await roomsCollection.updateOne(query, newReviewCount);
            }
            res.send(result)
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