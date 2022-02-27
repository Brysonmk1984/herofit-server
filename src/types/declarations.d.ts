import "express";
import type { responseEnhancer } from "express-response-formatter";

declare module "express" {
  interface AnyFormatterMethod {
    [key: string]: (data: any, meta?: any) => void;
  }
  interface Response {
    formatter: AnyFormatterMethod;
  }
}
