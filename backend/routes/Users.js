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
        await usersCollection.insertOne({ userName, hash, profilePicture, description, stockLists, friends, friendRequests, SentFriendRequests});
        res.status(200).send("Signup successful!");
      });
    } catch (error) {
      console.error("Error signing up:", error);
      res.status(500).send("Error signing up");
      return;
    }
  });



  router.get("/getFriends", async (req, res) => {


try {

    const friends = req.user.friends;
    const friendRequests = req.user.friendRequests;
    const SentFriendRequests = req.user.SentFriendRequests;
   const friendList = [];
   const friendRequestsList = [];
   const SentFriendRequestsList = []
  
   

    const usersCollection = await connectToDb();


  if (friends.length > 0) {
    for (let index = 0; index < friends.length; index++) {
      const userName = friends[index];
      const user = await usersCollection.findOne({ userName : userName });
      const userDetails = {
        userName : userName,
        profilePicture : user.profilePicture
      }
      friendList.push(userDetails);
    }
  }
  

  if (friendRequests.length > 0) {
    for (let index = 0; index < friendRequests.length; index++) {
      const userName = friendRequests[index];
      const user = await usersCollection.findOne({ userName : userName });
      const userDetails = {
        userName : userName,
        profilePicture : user.profilePicture
      }
     
      friendRequestsList.push(userDetails);
    }
  }
 

  if (SentFriendRequests.length > 0) {
    for (let index = 0; index < SentFriendRequests.length; index++) {
      const userName = SentFriendRequests[index];
      const user = await usersCollection.findOne({ userName : userName });
      const userDetails = {
        userName : userName,
        profilePicture : user.profilePicture
      }
      SentFriendRequestsList.push(userDetails);
    }
  }
   console.log(friendList);
   console.log(friendRequestsList);
   console.log(SentFriendRequestsList);
   
res.send({friendList, friendRequestsList, SentFriendRequestsList});
return;
}
catch(error){
  res.send(error)
}



  })





  

  router.post("/changeFriends", async (req, res) => {
  const userName = req.user.userName;
  const otherUserName = req.body.profileName;

  if (otherUserName === userName) {
    res.send("Lmao thats u bro, You cant add yourself:)")
    return;
  }
  const userId = req.user._id;
  const usersCollection = await connectToDb();
   const user = await usersCollection.findOne( { userName: userName} );
   const otherUser = await usersCollection.findOne( { userName: otherUserName});
  const otherUserId = otherUser._id;

  let friendStatus = false;
  let SentFriendRequestStatus = false;

   if (user.friends.length !== 0) {
    for (let index = 0; index < user.friends.length; index++) {
      const suspectFriend = user.friends[index];
      if (suspectFriend === otherUserName) {
        await usersCollection.updateOne(
          { _id: userId},
          { $pull: { friends: otherUserName } });


          await usersCollection.updateOne(
            { _id: otherUserId},
            { $pull: { friends: userName } });

            res.send({friendStatus, SentFriendRequestStatus});
            return;
      }
    }
   }



   if(!user.friendRequests.length !== 0){
   for (let index = 0; index < user.friendRequests.length; index++) {
    const element = user.friendRequests[index];
    if(otherUserName === element){
         await usersCollection.updateOne(
        { _id: userId},
        { $pull: { friendRequests: otherUserName } });

           await usersCollection.updateOne(
          { _id: userId},
          { $push: { friends: otherUserName } });

          await usersCollection.updateOne(
            { _id: otherUserId},
            { $pull: { SentFriendRequests: userName } });

            await usersCollection.updateOne(
              { _id: otherUserId},
              { $push: { friends: userName } });

             friendStatus = true;
          res.send({friendStatus, SentFriendRequestStatus});
          return;
    }
   }
  }

  if (user.SentFriendRequests.length > 0) {
    for (let index = 0; index < user.SentFriendRequests.length; index++) {
     const suspectUser = user.SentFriendRequests[index];
     if (suspectUser === otherUserName) {
       await usersCollection.updateOne(
         { _id: userId},
         { $pull: { SentFriendRequests: otherUserName } });
  
         await usersCollection.updateOne(
           { _id: otherUserId},
           { $pull: { friendRequests : userName } });
 
         res.send({friendStatus, SentFriendRequestStatus});
         return;
     }
    }
   }


    await usersCollection.updateOne(
    { _id: userId},
    { $push: { SentFriendRequests: otherUserName } });

    await usersCollection.updateOne(
      { _id: otherUserId},
      { $push: { friendRequests: userName } });
   
      SentFriendRequestStatus = true;
    res.send({friendStatus, SentFriendRequestStatus});
    return;
  })

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

      let friendStatus = false;
      let friendRequestStatus = false;
      let SentFriendRequestStatus = false;
      
     const loggedInProfile = req.user;
     if (loggedInProfile.friends.length !== 0) {
    
      for (let index = 0; index < loggedInProfile.friends.length; index++) {
        const suspectFriend = loggedInProfile.friends[index];
        if (suspectFriend === nameOfUser) {
          friendStatus = true;
          res.send({profilPicture, nameOfUser, description, stockLists, friendStatus, friendRequestStatus, friendRequestStatus});
          return;
        }
      }
     }

     if (loggedInProfile.friendRequests.length !== 0) {
    
      for (let index = 0; index < loggedInProfile.friendRequests.length; index++) {
        const suspectFriendRequest = loggedInProfile.friendRequests[index];
        if (suspectFriendRequest === nameOfUser) {
          friendRequestStatus = true;
          res.send({profilPicture, nameOfUser, description, stockLists, friendStatus, friendRequestStatus, SentFriendRequestStatus});
          return;
        }
      }
     }

     if (loggedInProfile.SentFriendRequests.length !== 0) {
    
      for (let index = 0; index < loggedInProfile.SentFriendRequests.length; index++) {
        const suspectSentFriendRequest = loggedInProfile.SentFriendRequests[index];
        if (suspectSentFriendRequest === nameOfUser) {
          SentFriendRequestStatus = true;
          res.send({profilPicture, nameOfUser, description, stockLists, friendStatus, friendRequestStatus, SentFriendRequestStatus});
          return
        }
      }
     }
    
      res.send({profilPicture, nameOfUser, description, stockLists, friendStatus, friendRequestStatus, SentFriendRequestStatus});
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





