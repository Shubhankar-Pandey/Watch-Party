import type { Request, Response } from "express";
import prisma from "../config/db.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"



export const signup = async(req:Request, res:Response) => {
    try{
        const { username, password } = req.body;
        if(!username || !password){
            return res.status(400).json({
                success : false, 
                message : "Bad request",
            })
        }

        const existUser = await prisma.user.findUnique({
            where : {
                username,
            }
        })
        if(existUser){
            return res.status(401).json({
                success : false, 
                message : "Username already exist",
            })
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data : {
                username, 
                password : hashedPassword,
            }
        })

        return res.status(201).json({
            success : true, 
            message : "User created successfully",
        })
    }
    catch(error : any){
        console.log("Error message = ", error.message);
        return res.status(500).json({
            success : false, 
            message : "Internal server errro",
        })
    }
}



export const login = async(req:Request, res:Response) => {
    try{
        const { username, password } = req.body;
        if(!username || !password){
            return res.status(400).json({
                success : false, 
                message : "Bad request",
            })
        }

        const existUser = await prisma.user.findUnique({where : {username}});
        if(!existUser){
            return res.status(403).json({
                success : false,
                message : "User not found",
            })
        }

        if(!(await bcrypt.compare(password, existUser.password))){
            return res.status(403).json({
                success : false,
                message : "Invalid credentials",
            })
        }

        const payload = {
            userId : existUser.id,
            username : existUser.username
        }
        const JWT_SECRET = process.env.JWT_SECRET;
        if(!JWT_SECRET){
            throw new Error("JWT_SECRET not defined");
        }
        const token = jwt.sign(payload, JWT_SECRET, {expiresIn : "2d"});

        return res.status(200).json({
            success : true, 
            message : "Login successfull",
            token
        })
    }
    catch(error : any){
        console.log("Error message = ", error.message);
        return res.status(500).json({
            success : false, 
            message : "Internal server errro",
        })
    }
}