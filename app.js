require('dotenv').config();

const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');
const express      = require('express');
const favicon      = require('serve-favicon');
const hbs          = require('hbs');
const mongoose     = require('mongoose');
const logger       = require('morgan');
const path         = require('path');


mongoose
  .connect('mongodb://localhost/passport', {useNewUrlParser: true})
  .then(x => {
    console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`)
  })
  .catch(err => {
    console.error('Error connecting to mongo', err)
  });

const app_name = require('./package.json').name;
const debug = require('debug')(`${app_name}:${path.basename(__filename).split('.')[0]}`);

const app = express();

// Middleware Setup
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Express View engine setup

app.use(require('node-sass-middleware')({
  src:  path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  sourceMap: true
}));
      

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));

// session configuration
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
    saveUninitialized: false,
    resave: true,
    store: new MongoStore({
      // when the session cookie has an expiration date
      // connect-mongo will use it, otherwise it will create a new 
      // one and use ttl - time to live - in that case one day
      mongooseConnection: mongoose.connection,
      ttl: 24 * 60 * 60 * 1000
    })
  })
)
// end of session configuration

// passport configuration

const User = require('./models/User.model');
const passport = require('passport');
const bcrypt = require('bcrypt');
const LocalStrategy = require('passport-local').Strategy;

passport.serializeUser((user, done)=>{
  done(null, user._id);
});

passport.deserializeUser((id,done)=>{
  User.findById(id)
  .then(dbUser => {
    done(null, dbUser);
  })
  .catch(error => {
    done(error);
  });
});

passport.use(
  new LocalStrategy((username, password ,done)=>{
    User.findOne({username: username})
      .then(found => {
        if(found === null){
          done(null, false, {message: 'Wrong Credentials'}); // wrong username
        } else if(!bcrypt.compareSync(password, found.password)) {
          done(null, false, {message: 'Wrong Credentials'}); // wrong password
        } else {
          done(null, found); // user found
        }
      })
      .catch(error => {
        done(error, false);
      });
  })
);

app.use(passport.initialize());
app.use(passport.session());

const GithubStrategy = require('passport-github').Strategy;

passport.use(
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      callbackURL: 'http://localhost:3000/auth/github/callback'
    },
    (accessToken, refreshToken, profile, done) => {
      // Find a user with profile.id as github id or create one
      User.findOne({githubId: profile.id})
        .then(found => {
          if(found !== null) {
            // user already exists
            done(null, found);
          } else {
            // no user with that githubId in our DB
            return User.create({githubId: profile.id})
              .then(dbUser => {
                done(null, dbUser);
              });
          }
        })
        .catch(error=>done(error));
    }
  ));

const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(
  new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOne({ googleId: profile.id })
      .then(found => {
      if(found !== null) {
        // user already exists
        done(null, found);
      } else {
        // no user with that githubId in our DB
        return User.create({googleId: profile.id})
          .then(dbUser => {
            done(null, dbUser);
          });
      }
    })
    .catch(error=>done(error));
  }
));

// end of passport configuration

// default value for title local
app.locals.title = 'Passport authentication with express';

const index = require('./routes/index');
app.use('/', index);

const auth = require('./routes/auth.route');
app.use('/', auth);

module.exports = app;
