require("dotenv").load();
import path from "path";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import { responseEnhancer } from "express-response-formatter";
import passport from "passport";
import authRoutes from "./routes/auth";
import avatarRoutes from "./routes/avatar";
import accountRoutes from "./routes/account";
import inventoryRoutes from "./routes/inventory";
import userRoutes from "./routes/user";
import emailRoutes from "./routes/email";
import battleRoutes from "./routes/battle";
import calculateRoutes from "./routes/calculate";
import mockDataRoutes from "./routes/mockData";
import mockCronRoutes from "./routes/mockCronEndpoints";

const Sentry = require("@sentry/node");
const app = express();
// Importing @sentry/tracing patches the global hub for tracing to work
const Tracing = require("@sentry/tracing");

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
