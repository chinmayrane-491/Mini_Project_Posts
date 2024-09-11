const express = require("express");
const path = require('path');
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("./models/user");
const postModel = require("./models/post");
const user = require("./models/user");
const multerconfig = require('./config/multer')
const crypto = require('crypto');
const upload = require("./config/multer");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname,'public')))


app.get("/", (req, res) => {
  res.render("login");
});


app.get("/profile/upload", (req, res) => {
  res.render("profileupload");
});

app.post("/upload",isLoggedIn,upload.single('image') , async (req, res) => {
  let user = await userModel.findOne({email:req.user.email});
  user.profilepic = req.file.filename;
  await user.save();
  res.redirect('/profile');
});


app.get("/Signup", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/profile", isLoggedIn, async (req, res) => {
  let user = await userModel
    .findOne({ email: req.user.email })
    .populate("post");
  res.render("profile", { user });
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }
  await post.save();
  res.redirect("/profile");
});

app.get("/edit/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  res.render("edit", { post });
});

app.post("/update/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOneAndUpdate(
    { _id: req.params.id },
    { content: req.body.content }
  );
  res.redirect("/profile");
});

app.post("/post", isLoggedIn, async (req, res) => {
  const { content } = req.body;
  let user = await userModel.findOne({ email: req.user.email });
  let post = await postModel.create({
    user: user._id,
    content,
  });

  user.post.push(post._id);
  await user.save();
  res.redirect("/profile");
});

app.post("/register", async (req, res) => {
  const { name, username, age, email, password } = req.body;
  const user = await userModel.findOne({ email });
  if (user) return res.status(404).send("User Already Registered");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      const user = await userModel.create({
        name,
        username,
        age,
        email,
        password: hash,
      });

      const token = jwt.sign({ email: email, userid: user._id }, "abcdefg");
      res.cookie("token", token);
      res.redirect("/login");
    });
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email });
  if (!user) return res.status(404).send("User Not Found");

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      const token = jwt.sign({ email: email, userid: user._id }, "abcdefg");
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else {
      res.redirect("/login");
    }
  });
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

function isLoggedIn(req, res, next) {
  if (req.cookies.token === "") return res.status(404).redirect("/login");
  else {
    const data = jwt.verify(req.cookies.token, "abcdefg");
    req.user = data;
    next();
  }
}

app.listen(3000, () => {
  console.log("server is running on port 3000");
});
