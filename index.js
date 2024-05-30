const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000;
username = process.env.DB_USER
password = process.env.DB_PASS
secret = process.env.SECRET_KYE
// console.log(secret);
app.use(cors({

}));

app.use(express.json())

app.get('/', async (req, res) => {
  res.send(`Surver is ok`)
})

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${username}:${password}@cluster0.nevhe4f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();
    const database = client.db('bistroDb')
    const usersCollection = database.collection('users');
    const menuCollection = database.collection('menu');
    const reviewCollection = database.collection('reviews');
    const cartCollection = database.collection('carts');
    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, secret, {
        expiresIn: '1h'
      })
      res.send({ token })
    })

    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log(req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      // console.log("token", token);
      if (!token) {
        return res.status(401).send({ message: 'forbidden access' })
      }
      jwt.verify(token, secret, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
      })

    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === "Admin"
      if (!isAdmin) {
        return res.status(403).send({ message: 'Forbidden access' });

      }
      next()
    }
    // users related api
    app.get('/users', verifyToken, async (req, res) => {

      const result = await usersCollection.find().toArray();
      res.send(result)
    })
    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'UnAuthorized access' })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const admin = user?.role === "Admin"
      console.log(admin);
      res.send(admin)
    })
    app.post('/users', verifyToken, verifyAdmin, async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const update = { $setOnInsert: user }
      const options = { upsert: true }

      const result = await usersCollection.updateOne(query, update, options);
      res.send(result)
    })
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedUser = {
        $set: {
          role: "Admin"
        }
      }
      const result = await usersCollection.updateOne(filter, updatedUser)
      res.send(result)
    })

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })
    // menu related api

    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result)
    })
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result)
    })
    app.get('/carts', async (req, res) => {
      const email = req.query.email
      const query = { email: email }
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })
    app.post('/carts', async (req, res) => {
      const cartItem = req.body;
      // console.log(cartItem);
      const result = await cartCollection.insertOne(cartItem);
      res.send(result)
    })
    app.delete('/carts/:id', async (req, res) => {
      const cartId = req.params.id;
      const query = { _id: new ObjectId(cartId) }

      const result = await cartCollection.deleteOne(query);
      res.send(result)
    })

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
  console.log(`Server is running at http://localhost:${port}`)
})