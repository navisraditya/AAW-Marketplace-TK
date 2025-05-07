import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate = (schema: z.Schema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: "Validation errors in your request",
          errors: error.issues,
        });
      } else {
        res.status(500).json({message: "Internal server error"});
      }
    }
  };
};

export const paginationMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

    req.query.page = page.toString();
    req.query.limit = limit.toString();

    next();
};