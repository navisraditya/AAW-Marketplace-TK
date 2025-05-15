import { Request, Response } from "express";
import * as Service from "./services";
import { seedWithFixedIds } from "@src/seed";

export const loginHandler = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const response = await Service.loginService(username, password);
    return res.status(response.status).json(response.data);
}

export const registerHandler = async (req: Request, res: Response) => {
    const { username, email, password, full_name, address, phone_number } = req.body;
    const response = await Service.registerService(username, email, password, full_name, address, phone_number);
    return res.status(response.status).json(response.data);
}

export const verifyTokenHandler = async (req: Request, res: Response) => {
    const { token } = req.body;
    const response = await Service.verifyTokenService(token);
    return res.status(response.status).json(response.data);
}

export const verifyAdminTokenHandler = async (req: Request, res: Response) => {
    const { token } = req.body;
    const response = await Service.verifyAdminTokenService(token);
    return res.status(response.status).json(response.data);
}

export const seedUserData = async (req: Request, res: Response) => {
    try { 
        await seedWithFixedIds();
        res.status(200).json({message: 'seeded user data successfully'})
    } catch (err) {
        res.status(301).json({message: 'not a good request buddy'})
    }
}