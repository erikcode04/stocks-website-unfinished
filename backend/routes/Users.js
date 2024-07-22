const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const { ObjectId, MongoClient } = require('mongodb');
const router = express.Router();
const multer = require("multer");



const saltRounds = 10;

const client = new MongoClient(process.env.URI);


async function connectToDb() {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
    }
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
  return client.db(process.env.DB_NAME).collection(process.env.DB_USERS_COLLECTION);
}





const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });


module.exports = (client, config) => {

  

  router.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
      
        return next(err);
      }
      if (!user) {
        return res.status(400).send(info.message); // Send the error message from passport
       
      }
      req.logIn(user, (err) => {
        if (err) {
       
          return next(err);
        }
        return res.status(200).send("Logged in successfully");
      });
    })(req, res, next);
  });

  router.post("/signup", async (req, res) => {
    try {
      const { userName, userPassword } = req.body;
      const profilePicture = "";
      const description = "";
      const stockLists =[];
      const friends = [];
      const friendRequests = [];
      const SentFriendRequests = [];
      
      const db = client.db(config.name);
      const usersCollection = db.collection(config.loginCollection);

      const existingUser = await usersCollection.findOne({ userName });

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      bcrypt.hash(userPassword, saltRounds, async (err, hash) => {
        if (err) {
          console.log("Error hashing password", err);
          return res.status(500).send("Internal Server Error");
        }
        await usersCollection.insertOne({ userName, hash, profilePicture, description, stockLists });
        res.status(200).send("Signup successful!");
      });
    } catch (error) {
      console.error("Error signing up:", error);
      res.status(500).send("Error signing up");
    }
  });
  

  router.post("/imageHandler", upload.single("profilePicture") , async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("You are not authenticated");
    }
    const userId = req.user._id;
    const profilePictureUrl = req.file ? `../uploads/${req.file.filename}` : null;
    try {
      const usersCollection = await connectToDb();
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(userId)},
        { $set: { profilePicture: profilePictureUrl } });
        console.log(result);
      if (result.modifiedCount > 0) {
        console.log(result);
        res.send('Profile picture updated successfully.');
      } else {
        console.log("update to user failed");
        res.status(400).send('Failed to update profile picture.');
      }
    } catch (error) {
      console.log("inte funkar")
      res.status(500).send('Internal Server Error');
    }
  });

  router.get("/getProfilePic", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).send('You are not authenticated');
      }
      const userProfilePic = req.user.profilePicture;
      if (!userProfilePic) {
        return res.status(404).send('No profile picture found', userProfilePic);
      }
      res.json({ profilePicture: userProfilePic });
    } catch (error) {
      console.error('Error getting profile picture:', error);
      res.status(500).send('Internal Server Error');
    }
  });



  router.get("/getUserInfo", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("You are not authenticated");
    }
    try{
      const user = req.user
   const profilePicture = user.profilePicture;  
   const userName = user.userName; 
   const description = user.description;
   const stockLists = user.stockLists

   res.send({profilePicture, userName, description, stockLists});
    }
catch(error)
{
  res.send(error).send("error getting user information")
}


  })

  router.get("/getOtherUser", async (req, res) => { 
    try {
      const {userName} = req.query;
      const db = client.db(config.name);
      const usersCollection = db.collection(config.loginCollection);
      const user = await usersCollection.findOne( {userName} );
      const profilPicture = user.profilePicture;
      console.log(profilPicture);
      const nameOfUser = user.userName;
      const description = user.description;
      const stockLists = user.stockLists;
      if (!user) {
        return res.status(404).send('No profile info found');
      }
      res.send({profilPicture, nameOfUser, description, stockLists});
    } catch (error) {
      console.error('Error getting profile picture:', error);
      res.status(500).send('Internal Server Error');
    }
  });



  router.post("/findUser", async (req, res) => {  

    try {
    const {userName} = req.body;
   const db = client.db(config.name);
   const usersCollection = db.collection(config.loginCollection);
   const existingUser = await usersCollection.findOne({ userName });
   if(!existingUser){
    return res.status(414).send("Could not find User");
   }
    res.status(200).json({userName : userName});

    }catch(error){
      console.log("heh");
    }
    });

    router.post("/changeDescription",async (req, res) => {
      if (!req.isAuthenticated()) {
        return res.status(401).send("You are not authenticated");
      }
   try {
   const userId = req.user._id;
    const {description} = req.body;
    const usersCollection = await connectToDb();
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId)},
      { $set: { description: description } });
    console.log(result);
    console.log(description);

   }
   catch(error){
   return(error)
   }

    });

    router.post("/addStocks", async(req, res) => {
      if (!req.isAuthenticated()) {
        return res.status(401).send("You are not authenticated");
      }
      const date = new Date();
     const year = date.getFullYear();
     const month = 1 + date.getMonth();
     const day = date.getDate();
     const hours = date.getHours();
     const percantageChange = "";
     const buyDate = {year : year, month : month, day : day, hours : hours};
      const stockList = req.body;
      const stockObject = {buyDate, stockList, percantageChange};
      const userId = req.user._id
      try {
        const usersCollection = await connectToDb();

        console.log(stockList);

        const result = await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $push: { stockLists: stockObject } }
        );
        console.log(stockObject);
    console.log(req.user);
    console.log(stockList);
    res.status(200).send("Stock list updated successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while updating the stock list");
  }
    });



  router.get("/checkAuth", (req, res) => {
    if (req.isAuthenticated()) {
      return res.sendStatus(200); // OK
    } else {
      return res.sendStatus(401); // Unauthorized
    }
  });   


  return router;
};





