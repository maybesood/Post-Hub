
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const MongoDBStore = require("connect-mongodb-session")(session);
const nodemailer = require("nodemailer");


const app = express();
const PORT=process.env.PORT || 3000;
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// const store = new MongoDBStore({
//   uri: "mongodb://127.0.0.1:27017/Post-HubDB", // MongoDB connection URI
//   collection: "sessions", // Collection name for storing sessions
// });

// // Handle errors with the session store
// store.on("error", function (error) {
//   console.log("Session store error:", error);
// });

// Function to send login email notification
function sendLoginEmail(user) {
  // Configure your nodemailer transport here
  // Replace the placeholders with your email configuration
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "himansh402.be22@chitkara.edu.in",
      pass: "rssbbabaji311",
    },
  });

  const mailOptions = {
    from: "himansh402.be22@chitkara.edu.in",
    to: user.email,
    subject: "Login Notification",
    text: "You have successfully logged in to your account.",
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Login notification email sent: " + info.response);
    }
  });
}


app.use(session({
  secret:"our little secret",
  resave:false,
  saveUninitialized:false,
  // store: store, // Use MongoDBStore as the session store
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://127.0.0.1:27017/Post-HubDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  bio:String,
  insta:String,
  linkedIn:String,
  facebook:String,

});

userSchema.plugin(passportLocalMongoose,{ usernameField: 'email' }); //simplifies the implementation of username/password

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



const blogSchema = new mongoose.Schema({
  title: String,
  content: String,
  like:{type:Number, default:0},
  comments: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});





const Blog = mongoose.model("Blog", blogSchema);




app.get("/", async function(req, res) {
  try {
    const result = await Blog.find({});
    res.render("home", {
      posts: result,
      moment: require('moment')
    });
  } catch (err) {
    console.log(err);
  }
});
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next(); // User is authenticated, proceed to the next middleware or route handler
  } else {
    res.redirect("/login"); // User is not authenticated, redirect to login page
  }
}

app.get("/compose", function(req, res) {
  res.render("compose");
});
app.post("/compose",isLoggedIn ,async function(req, res) {
    try {
      const post = new Blog({
        title: req.body.postTitle,
        content: req.body.postContent,
      });
  
      await post.save();
      res.redirect("/");
    } catch (err) {
      console.log(error);
    }
  });

app.post("/like/:postId", isLoggedIn,async function(req, res) {
  try {
    const postId = req.params.postId;
    await Blog.findByIdAndUpdate(postId, { $inc: { like: 1 } });
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.get("/delete/:postId", async function(req, res) {
  try {
    const postId = req.params.postId;
    await Blog.findByIdAndRemove(postId);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});


app.post("/comment/:postId", isLoggedIn, async function(req, res) {
  try {
    const postId = req.params.postId;
    const newComment = req.body.comment;
    const blogPost = await Blog.findById(postId);
    blogPost.comments.push(newComment);
    await blogPost.save();
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.get("/register",function(req,res){
  res.render("register");
});

app.post("/register", async function(req, res) {
  if (req.isAuthenticated()) {
    res.redirect("/dashboard"); // Redirect to the dashboard if user is already authenticated
  } else {
    User.register(
      { email: req.body.email },  //parameter 1
      req.body.password,   //parameter2
      function(err, user) {   //parameter3     parameters are username,pwd and callback function
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function() {
            res.redirect("/");
          });
        }
      }
    );
  }
});



app.get("/login",function(req,res){
  res.render("login");
});

app.post("/login", async function(req, res) {
  const user=new User({
      email:req.body.email,
      password:req.body.password
  });

  req.login(user, function(err){
      if (err){
          console.log(err);
      } else{
          passport.authenticate("local")(req,res,function(){
            sendLoginEmail(user);
              res.redirect("/");
          });
      }
  });
});





app.get("/dashboard", isLoggedIn, async function(req, res) {
  try {
    // Retrieve the user information from the database using the authenticated user's ID
    const user = await User.findById(req.user._id);
    if (user) {
      res.render("dashboard", { user: user });
    } else {
      res.send("User not found.");
    }
  } catch (err) {
    console.log(err);
  }
});


app.get("/edit-profile",isLoggedIn ,function(req,res){
  res.render("edit-profile", { user: req.user });
});
// Route to update the user's profile
app.post("/update-profile", isLoggedIn, async function (req, res) {
  try {
    const user = await User.findById(req.user._id);

   
    user.name = req.body.name;
    user.email = req.body.email;
    user.bio = req.body.bio;
    user.insta=req.body.insta;
    user.facebook=req.body.facebook;
    user.linkedIn=req.body.linkedIn;

    // Save the updated user
    await user.save();

    res.redirect("/dashboard"); // Redirect to the dashboard or profile page after updating
  } catch (err) {
    console.log(err);
    res.redirect("/edit-profile"); // Handle errors and redirect back to the edit profile page
  }
});



app.get("/about",function(req,res){
  res.render("about");
});

app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
});


app.listen(PORT, function() {
  console.log("Server is running on port 3000");
});
