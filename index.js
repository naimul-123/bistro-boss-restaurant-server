const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()

const port = process.env.PORT || 5000;
username = process.env.DB_USER
password = process.env.DB_PASS
secret = process.env.SECRET_KYE
stripeSecret = process.env.STRIPE_SECRET_KEY

const stripe = require('stripe')(stripeSecret)
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
    const paymentCollection = database.collection('payments');
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
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'UnAuthorized access' })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const admin = user?.role === "Admin";
      res.send(admin);
    })
    app.post('/users', verifyToken, verifyAdmin, async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const update = { $setOnInsert: user };
      const options = { upsert: true };

      const result = await usersCollection.updateOne(query, update, options);
      res.send(result);
    })
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          role: "Admin"
        }
      };
      const result = await usersCollection.updateOne(filter, updatedUser);
      res.send(result);
    })

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })
    // menu related api

    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    })
    app.get('/menu/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.findOne(query);
      res.send(result);
    })
    app.patch('/menu/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedItem = {
        $set: {
          name: item.name,
          image: item.image,
          recipe: item.recipe,
          price: item.price,
          category: item.price,
          image: item.image
        }
      }
      const result = await menuCollection.updateOne(filter, updatedItem);
      res.send(result);
    })


    app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;

      const result = await menuCollection.insertOne(item);
      res.send(result);
    })
    app.delete('/menu/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })
    app.post('/carts', async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    })
    app.delete('/carts/:id', async (req, res) => {
      const cartId = req.params.id;
      const query = { _id: new ObjectId(cartId) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })

    // status or analytics 
    app.get('/admin-stats', async (req, res) => {
      const totalUsers = await usersCollection.estimatedDocumentCount();
      const menuItems = await menuCollection.estimatedDocumentCount();
      const totalOrders = await paymentCollection.estimatedDocumentCount();
      const result = await paymentCollection.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: '$price'
            }
          }
        },
      ]).toArray();

      const totalRevenue = result.length > 0 ? result[0].total : 0;
      res.send({
        totalUsers, menuItems, totalOrders, totalRevenue

      })
    })
    app.get('/order-state', verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentCollection.aggregate(
        [

          {
            $addFields: {
              menuItemsIdsObjectId: {
                $map: {
                  input: '$menuItemIds',
                  as: 'id',
                  in: { $toObjectId: "$$id" }
                }
              }
            }
          },
          {
            $lookup: {
              from: 'menu',
              localField: 'menuItemsIdsObjectId',
              foreignField: '_id',
              as: 'menuItems'

            }
          },
          {
            $unwind: '$menuItems'
          },
          {
            $group: {
              _id: '$menuItems.category',
              revenue: { $sum: "$menuItems.price" },
              quantity: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              category: '$_id',
              quantity: '$quantity',
              revenue: '$revenue'
            }
          }
        ]
      ).toArray();
      res.send(result)
    })

    // stripe api
    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      const { price } = req.body
      const amount = parseInt(price * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // payment related api
    app.get('/payments/:email', verifyToken, async (req, res) => {
      const userEmail = req.params.email
      const query = { email: userEmail }
      if (userEmail !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbiden access' })
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result)
    })
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      // console.log(payment);
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      }
      const deleteResult = await cartCollection.deleteMany(query)
      res.send({ paymentResult, deleteResult })
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})