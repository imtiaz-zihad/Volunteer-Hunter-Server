const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const cookieParser = require("cookie-parser");

const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const app = express();

const corsOptions = {
  origin: ["http://localhost:5173", "https://volenter-find.web.app", 'https://assinment-11-server-gamma.vercel.app'],
  credentials: true,
  optionalSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.x6gil.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verifyToken
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token);
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded
  });

  next();
};
const db = client.db("volenter-find");
const volunteerCollection = db.collection("posts");
const volunteerRequestCollection = db.collection("volunteerRequests");
async function run() {
  try {
    // add a volunteer

    // Generate JWT  token
    app.post("/jwt", async (req, res) => {
      const email = req.body;

      //create token
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    //Logout JWT
    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    //save a database
    app.post("/addVolunteer", async (req, res) => {
      const volunteerData = req.body;
      const result = await volunteerCollection.insertOne(volunteerData);
      console.log(result);
      res.send(result);
    });

    //get data from db
    app.get("/allVolunteer", async (req, res) => {
      const result = await volunteerCollection.find().toArray();
      res.send(result);
    });
    app.get("/all-Volunteer", async (req, res) => {
      const search = req.query.search;
      let query = {
        title: {
          $regex: search,
          $options: "i",
        },
      };
      const result = await volunteerCollection.find(query).toArray();
      res.send(result);
    });

    ///Home page limited data
    app.get("/allVolunteer/limit", async (req, res) => {
      const cursor = volunteerCollection.find().sort({ deadline: 1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/allVolunteer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerCollection.findOne(query);
      res.send(result);
    });

    // delete volunteer post
    app.delete("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerCollection.deleteOne(query);
      res.send(result);
    });

    // Update data
    app.put("/update-volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const volunteerData = req.body;
      const updated = {
        $set: volunteerData,
      };
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const result = await volunteerCollection.updateOne(
        query,
        updated,
        options
      );
      console.log(result);
      res.send(result);
    });

    // Add a volunteer request
    app.post("/volunteerRequests", async (req, res) => {
      const volunteerRequest = req.body;

      // Ensure volunteersNeeded is a number

      const result = await volunteerRequestCollection.insertOne(
        volunteerRequest
      );

      const filter = { _id: new ObjectId(volunteerRequest.volunteerPostId) };
      const update = {
        $inc: { volunteersNeeded: -1 },
      };

      // Perform update on the volunteer collection
      const updateBidCount = await volunteerCollection.updateOne(
        filter,
        update
      );
      console.log(updateBidCount);

      res.send(result);
    });

    // get all volunteer posted by a specific user
    app.get("/volunteer/:email", verifyToken, async (req, res) => {

      const decodedEmail = req.user?.email
      const email = req.params.email;
      console.log('From token',decodedEmail);
      console.log('From params',email);
      if(decodedEmail !== email) return res.status(401).send({ message: "unauthorized access" });
      const query = { "organizer.email": email };
      const result = await volunteerCollection.find(query).toArray();
      res.send(result);
    });

    // get all volunteer request  posted by a specific user
    app.get("/volunteer-request/:email", verifyToken,async (req, res) => {
      const decodedEmail = req.user?.email
      const email = req.params.email;
      console.log('From token',decodedEmail);
      console.log('From params',email);
      if(decodedEmail !== email) return res.status(401).send({ message: "unauthorized access" });
      const query = { volunteerEmail: email };
      const result = await volunteerRequestCollection.find(query).toArray();
      res.send(result);
    });

    // delete volunteer Request
    app.delete("/volunteer-request/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerRequestCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Volunteer Is Coming Soon");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
