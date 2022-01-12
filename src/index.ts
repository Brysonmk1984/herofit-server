// NODE
const path = require("path");
require("dotenv").load();
// LIBRARIES
const Sentry = require("@sentry/node");
// Importing @sentry/tracing patches the global hub for tracing to work
const Tracing = require("@sentry/tracing");
const express = require("express");
const app = express();
const morgan = require("morgan");
const cors = require("cors");
const responseEnhancer = require("express-response-formatter").responseEnhancer;
const passport = require("passport");
// COMMON
const authRoutes = require("./routes/auth");
const avatarRoutes = require("./routes/avatar");
const accountRoutes = require("./routes/account");
const inventoryRoutes = require("./routes/inventory");
const userRoutes = require("./routes/user");
const emailRoutes = require("./routes/email");
const battleRoutes = require("./routes/battle");
const calculateRoutes = require("./routes/calculate");
const mockDataRoutes = require("./routes/mockData");
const mockCronRoutes = require("./routes/mockCronEndpoints");

// Error Reporting
Sentry.init({
  dsn: "https://051e343d956b42e3bb7286f93ffe965d@o1077292.ingest.sentry.io/6080100",
  debug: false, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
  defaultIntegrations: false,
});

// http server
console.log("Listening on port " + (process.env.PORT || 3001));
// Middleware
// logger
app.use(morgan("dev"));
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(responseEnhancer());
app.set("trust proxy", 1);

// Passport JWT Authentication
require("./config/passport-jwt")(passport);
app.use(passport.initialize());

app.options("*", cors());
// HTTP Routes

// Protected routes
app.use("/auth", authRoutes);
app.use("/avatar", avatarRoutes);
app.use("/account", accountRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/user", userRoutes);
app.use("/email", emailRoutes);
app.use("/battle", battleRoutes);
app.use("/calculate", calculateRoutes);
app.use("/mock-data", mockDataRoutes);
app.use("/mock-cron", mockCronRoutes);

export default app;
// Tests are still expecting module.js syntax
module.exports = app;
