const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRECT_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r5o3myx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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


    const userCollection = client.db("bistroDb").collection("users");
    const menuCollection = client.db("bistroDb").collection("menu");
    const reviewCollection = client.db("bistroDb").collection("reviews");
    const cartCollection = client.db("bistroDb").collection("carts");
    const paymentCollection = client.db("bistroDb").collection("payments");

    const petsCollection = client.db("petsDB").collection("pets");
    const adoptCollection = client.db("petsDB").collection("adopt");
    const donationCampaignsCollection = client.db("petsDB").collection("donationCampaigns");
    const donationCollection = client.db("petsDB").collection("donations");
        
    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token',req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // user related api
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user does not exists:
      // you can do this many ways (1. email uniqe, 2. upsert 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    app.post('/adopt', async (req, res) => {
      const newAdopt = req.body;
      console.log(newAdopt);
      const result = await adoptCollection.insertOne(newAdopt);
      res.send(result);
    })

    app.post('/donations', async (req, res) => {
      const newDonation = req.body;
      console.log(newDonation);
      const result = await donationCollection.insertOne(newDonation);
      res.send(result);
    })

    app.get('/donations', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await donationCollection.find(query).toArray();
      res.send(result);
    })

    // pets related apis
    app.get('/pets', async (req, res) => {
      const result = await petsCollection.find().toArray();
      res.send(result);
    })

    // donation campaigns related apis
    app.get('/donationCampaigns', async (req, res) => {
      const result = await donationCampaignsCollection.find().toArray();
      res.send(result);
    })

    /* ---------------------------------------------------------------------------------------------------------------------- */
    const { ObjectId } = require('mongodb');

       app.get('/pets/:id', async (req, res) => {
      const id = req.params.id;

      // Initialize an empty result
      let result = null;

      try {
        // First, try to find by ObjectId
        const queryByObjectId = { _id: new ObjectId(id) };
        result = await petsCollection.findOne(queryByObjectId);
      } catch (err) {
        // If ObjectId conversion fails, we skip to the next query
      }

      // If no result is found with ObjectId, try using the string id
      if (!result) {
        const queryByStringId = { _id: id };
        result = await petsCollection.findOne(queryByStringId);
      }

      // If still no result, return a 404 error
      if (!result) {
        return res.status(404).send({ message: 'Menu item not found' });
      }

      res.send(result);
    });


    app.get('/donationCampaigns/:id', async (req, res) => {
      const id = req.params.id;

      // Initialize an empty result
      let result = null;

      try {
        // First, try to find by ObjectId
        const queryByObjectId = { _id: new ObjectId(id) };
        result = await donationCampaignsCollection.findOne(queryByObjectId);
      } catch (err) {
        // If ObjectId conversion fails, we skip to the next query
      }

      // If no result is found with ObjectId, try using the string id
      if (!result) {
        const queryByStringId = { _id: id };
        result = await donationCampaignsCollection.findOne(queryByStringId);
      }

      // If still no result, return a 404 error
      if (!result) {
        return res.status(404).send({ message: 'Menu item not found' });
      }

      res.send(result);
    });
    
    
    /* ---------------------------------------------------------------------------------------------------------------------- */

    /* ------------------------------------------------------------------------------------------------------------------ */

    // payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
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


app.get('/', (req, res) => {
  res.send('boss is sitting')
})

app.listen(port, () => {
  console.log(`Bistro Boss is sitting on port ${port}`)
})
