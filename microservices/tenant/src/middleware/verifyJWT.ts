import { Request, Response, NextFunction } from "express";
import axios from 'axios';

export const verifyJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("authenticating token")
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      return res.status(401).send({ message: "Invalid token" });
    }

    console.log("trying to reach auth ms")

    const payload = await axios.post(`${process.env.AUTH_MS_URL}/user/verify-admin-token`, { token });
    if (payload.status !== 200) {
      return res.status(401).send({ message: "Invalid token" });
    }

    console.log("trying done authenticating");

    req.body.user = payload.data.user;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).send({ message: "Invalid token" });
  }
};
