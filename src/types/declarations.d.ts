import "express";
import "jest";
// Needed for res.formatter, using express with express-response-formatter
import type { responseEnhancer } from "express-response-formatter";

// Needed to make user object typesafe, using passport-jwt with express
interface JWTUser {
  id: number;
  email: string;
}

declare global {
  namespace Express {
    interface User extends JWTUser {}
  }
}
