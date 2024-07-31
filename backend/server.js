const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("passport");
const LocalStrategy = require("passport-local")
const session = require("express-session");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const MongoStore = require('connect-mongo');
const usersRoute = require("./routes/Users");
const { ObjectId } = require('mongodb');
const bcrypt = require("bcrypt");
const app = express();
const path = require("path");


app.use("/uploads", express.static(path.join(__dirname, 'uploads'))); 
 

app.use(cors({
origin : "http://localhost:3000",
credentials : true
}));

app.use(bodyParser.json());                   


app.use(session({
  secret : "TOPSECRETWORD",
  resave : false,
  saveUninitialized : false,
  store: MongoStore.create({
    mongoUrl: process.env.URI
  }),
  cookie: { secure: false, httpOnly: true } 
}));

app.use(passport.initialize());
app.use(passport.session());



const config = {
  port : process.env.PORT || 5000,
  connect : process.env.URI,
  name :process.env.DB_NAME,
  loginCollection : process.env.DB_USERS_COLLECTION,
  apiKey : process.env.API_KEY
  };
  
 
  
 
const client = new MongoClient(config.connect, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
   try {
    await client.connect();
 
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  } 
}
run().catch(console.dir);



passport.use(new LocalStrategy(
  { usernameField: 'userName', passwordField: 'userPassword' },
  async (userName, userPassword, done) => {
  
    try {   
      const db = client.db(config.name);
     const usersCollection = db.collection(config.loginCollection); 
     const user = await usersCollection.findOne({ userName });

  
      if (!user) {
        return done(null, false, { message: "No user with this Username found" });
      }

      bcrypt.compare(userPassword, user.hash, (err, result) => {
        if (err) {
          console.log("Error comparing passwords:", err);
          return done(err);
        }
        if (!result) {
          return done(null, false, { message: "Invalid password" });
        }
        return done(null, user);
      });

    } catch (error) {
      console.error("Error logging in:", error);
      return done(error);
    }
  }
));
passport.serializeUser((user, done) => {
 console.log("Serializing user:", user); 
  done(null, user._id);

});
passport.deserializeUser(async (id, done) => {
  
  console.log("Deserializing user with id:", id);
  
  const db = client.db(config.name);
  const usersCollection = db.collection(config.loginCollection);
  try {
    const user = await usersCollection.findOne({ _id: ObjectId.createFromHexString(id) });

   console.log("User deserialized:", user); 
    done(null, user);
  } catch (error) {
    console.error("Error deserializing user:", error);
    done(error, null);
  }
});





app.get('/main', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send("You are not authenticated");
  }
  res.status(200).send("Welcome to the main page!");
});





    module.exports = config;


app.use("/Users", usersRoute(client, config));
  


app.listen(config.port, () => {
    console.log("Server is running on ");
});
      
