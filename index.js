const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

require('dotenv').config()
app.use(cors())
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Doctor is running')
})




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ondzc0b.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorized Access' })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: 'Unauthorized Access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        await client.connect();

        // JWT
        app.post('/access-token', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' });
            res.send({ token });
        })

        const serviceCollection = client.db('carsDoctor').collection('services');
        const bookingCollection = client.db('carsDoctor').collection('bookings');

        app.get('/services', async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) };
            const options = {
                // Include only the `title` and `imdb` fields in the returned document
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            };
            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        });

        app.get('/bookings', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            if (decoded.email !== req.query.email) {
                return res.status(403).send({ error: true, message: 'Invalid Access' })
            }
            let query = {}
            if (req.query?.email) {
                query = { customerEmail: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);

        })

        app.post('/bookings', async (req, res) => {
            const orderInfo = req.body;
            const result = await bookingCollection.insertOne(orderInfo);
            res.send(result);
        })

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) };
            const updatedInfo = req.body;
            const updateDoc = {
                $set: {
                    status: updatedInfo.status
                },
            };
            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");


    } finally {
    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})